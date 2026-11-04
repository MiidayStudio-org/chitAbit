import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { dbService } from '../src/db/index.js';
import { signToken } from '../src/middleware/auth.js';

const uniq = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function makeUser(prefix: string) {
  const id = `test_${prefix}_${uniq()}`;
  const username = `${prefix}_${uniq()}`.slice(0, 25);
  dbService.createUser(id, username, null, `${prefix} dev`, '#3b82f6');
  return { id, username, token: signToken({ userId: id, username }) };
}

describe('Message & Channel API Tests', () => {
  let alice: ReturnType<typeof makeUser>;
  let bob: ReturnType<typeof makeUser>;
  let eve: ReturnType<typeof makeUser>;

  beforeAll(() => {
    alice = makeUser('alice');
    bob = makeUser('bob');
    eve = makeUser('eve');
  });

  const auth = (u: { token: string }) => ({ Authorization: `Bearer ${u.token}` });

  it('GET /api/channels returns default seeded channels', async () => {
    const res = await request(app).get('/api/channels').set(auth(alice));
    expect(res.status).toBe(200);
    expect(res.body.channels).toBeInstanceOf(Array);
    const names = res.body.channels.map((c: any) => c.name);
    expect(names).toContain('general');
  });

  it('POST /api/channels creates a new channel with validation', async () => {
    const newChanName = `test-chan-${uniq()}`;
    const res = await request(app)
      .post('/api/channels')
      .set(auth(alice))
      .send({ name: newChanName, description: 'Test channel', createdBy: 'someone_else' });

    expect(res.status).toBe(201);
    expect(res.body.channel.name).toBe(newChanName);
    // createdBy comes from the token, not the body
    expect(res.body.channel.created_by).toBe(alice.id);

    const dupRes = await request(app)
      .post('/api/channels')
      .set(auth(alice))
      .send({ name: newChanName, description: 'Duplicate channel' });
    expect(dupRes.status).toBe(409);
  });

  it('Message CRUD and reactions work properly in database', () => {
    const msgId = `test_msg_${uniq()}`;
    const msg = dbService.createMessage(msgId, 'general', null, alice.id, alice.username, 'Hello world from test');
    expect(msg.id).toBe(msgId);
    expect(msg.content).toBe('Hello world from test');

    const updated = dbService.updateMessage(msgId, alice.id, 'Updated content');
    expect(updated?.content).toBe('Updated content');
    expect(updated?.edited_at).toBeGreaterThan(0);

    const reactions = dbService.toggleReaction(msgId, alice.id, '🚀');
    expect(reactions.length).toBe(1);
    expect(reactions[0].emoji).toBe('🚀');
    expect(reactions[0].count).toBe(1);

    expect(dbService.deleteMessage(msgId, alice.id)).toBe(true);
    expect(dbService.getMessageById(msgId)).toBeUndefined();
  });
});

describe('Auth & access control', () => {
  it('register + login with password returns a token', async () => {
    const username = `reg_${uniq()}`.slice(0, 25);
    const reg = await request(app).post('/api/auth/register').send({ username, password: 'secret123' });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();

    const ok = await request(app).post('/api/auth/login').send({ username, password: 'secret123' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const bad = await request(app).post('/api/auth/login').send({ username, password: 'wrongpass' });
    expect(bad.status).toBe(401);
  });

  it('login without a password is rejected and does not create users', async () => {
    const username = `ghost_${uniq()}`.slice(0, 25);
    const res = await request(app).post('/api/auth/login').send({ username });
    expect(res.status).toBe(400);
    expect(dbService.getUserByUsername(username)).toBeUndefined();
  });

  it('protected routes need a valid token', async () => {
    expect((await request(app).get('/api/channels')).status).toBe(401);
    expect((await request(app).get('/api/friends')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-token')).status).toBe(401);
  });

  it('?userId= no longer lets you act as someone else', async () => {
    const victim = makeUser('victim');
    const res = await request(app).get(`/api/friends/requests?userId=${victim.id}`);
    expect(res.status).toBe(401);
  });

  it('you cannot read or edit other people\'s DMs', async () => {
    const a = makeUser('dma');
    const b = makeUser('dmb');
    const outsider = makeUser('out');
    const msgId = `test_dm_${uniq()}`;
    dbService.createMessage(msgId, null, b.id, a.id, a.username, 'private hello');

    const asOutsider = await request(app)
      .get(`/api/messages/dm/${a.id}/${b.id}`)
      .set({ Authorization: `Bearer ${outsider.token}` });
    expect(asOutsider.status).toBe(403);

    const asB = await request(app)
      .get(`/api/messages/dm/${a.id}/${b.id}`)
      .set({ Authorization: `Bearer ${b.token}` });
    expect(asB.status).toBe(200);
    expect(asB.body.messages.some((m: any) => m.id === msgId)).toBe(true);

    // Outsider tries to edit a's message by sending a's id in the body
    const edit = await request(app)
      .put(`/api/messages/${msgId}`)
      .set({ Authorization: `Bearer ${outsider.token}` })
      .send({ senderId: a.id, content: 'hacked' });
    expect(edit.status).toBe(404);
    expect(dbService.getMessageById(msgId)?.content).toBe('private hello');

    // Search does not leak other people's DMs
    const search = await request(app)
      .get('/api/messages/search?q=private%20hello')
      .set({ Authorization: `Bearer ${outsider.token}` });
    expect(search.body.messages.some((m: any) => m.id === msgId)).toBe(false);
  });

  it('start-dm does not create accounts', async () => {
    const u = makeUser('dmstart');
    const name = `nobody_${uniq()}`.slice(0, 25);
    const res = await request(app)
      .post('/api/users/start-dm')
      .set({ Authorization: `Bearer ${u.token}` })
      .send({ username: name });
    expect(res.status).toBe(404);
    expect(dbService.getUserByUsername(name)).toBeUndefined();
  });

  it('profile rejects javascript: avatar URLs', async () => {
    const u = makeUser('prof');
    const res = await request(app)
      .put('/api/auth/profile')
      .set({ Authorization: `Bearer ${u.token}` })
      .send({ avatarUrl: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
  });

  it('upload rejects HTML/SVG and requires login', async () => {
    const u = makeUser('upl');
    const noAuth = await request(app).post('/api/upload').attach('file', Buffer.from('hi'), 'a.txt');
    expect(noAuth.status).toBe(401);

    const svg = await request(app)
      .post('/api/upload')
      .set({ Authorization: `Bearer ${u.token}` })
      .attach('file', Buffer.from('<svg onload="alert(1)"/>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
    expect(svg.status).toBe(400);

    const html = await request(app)
      .post('/api/upload')
      .set({ Authorization: `Bearer ${u.token}` })
      .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'x.html', contentType: 'text/plain' });
    expect(html.status).toBe(400);
  });
});
