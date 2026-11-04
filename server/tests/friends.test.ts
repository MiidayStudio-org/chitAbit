import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { dbService } from '../src/db/index.js';
import { signToken } from '../src/middleware/auth.js';

const uniq = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function makeUser(prefix: string) {
  const id = `test_${prefix}_${uniq()}`;
  const username = `${prefix}_${uniq()}`.slice(0, 25);
  dbService.createUser(id, username, null, prefix, '#3b82f6');
  return { id, username, auth: { Authorization: `Bearer ${signToken({ userId: id, username })}` } };
}

describe('Friend requests', () => {
  it('send → accept makes both users friends', async () => {
    const a = makeUser('fra');
    const b = makeUser('frb');

    const sent = await request(app).post('/api/friends/request').set(a.auth).send({ targetUserId: b.id });
    expect(sent.status).toBe(200);

    const reqs = await request(app).get('/api/friends/requests').set(b.auth);
    expect(reqs.status).toBe(200);
    const incoming = reqs.body.incoming.find((r: any) => r.sender_id === a.id);
    expect(incoming).toBeDefined();

    const accepted = await request(app)
      .post('/api/friends/respond')
      .set(b.auth)
      .send({ requestId: incoming.id, action: 'accept' });
    expect(accepted.status).toBe(200);
    expect(dbService.isFriend(a.id, b.id)).toBe(true);
    expect(dbService.isFriend(b.id, a.id)).toBe(true);

    // Accepting the same request twice is rejected
    const again = await request(app)
      .post('/api/friends/respond')
      .set(b.auth)
      .send({ requestId: incoming.id, action: 'accept' });
    expect(again.status).toBe(400);
  });

  it('a request back to someone who already asked is auto-accepted', async () => {
    const a = makeUser('autoa');
    const b = makeUser('autob');
    await request(app).post('/api/friends/request').set(a.auth).send({ targetUserId: b.id });
    const back = await request(app).post('/api/friends/request').set(b.auth).send({ targetUserId: a.id });
    expect(back.status).toBe(200);
    expect(back.body.autoAccepted).toBe(true);
    expect(dbService.isFriend(a.id, b.id)).toBe(true);
  });

  it('duplicate pending request is rejected, but can be re-sent after decline', async () => {
    const a = makeUser('deca');
    const b = makeUser('decb');

    expect((await request(app).post('/api/friends/request').set(a.auth).send({ targetUserId: b.id })).status).toBe(200);
    const dup = await request(app).post('/api/friends/request').set(a.auth).send({ targetUserId: b.id });
    expect(dup.status).toBe(400);

    const reqId = dbService.getFriendRequests(b.id).incoming.find((r) => r.sender_id === a.id)!.id;
    const declined = await request(app).post('/api/friends/respond').set(b.auth).send({ requestId: reqId, action: 'decline' });
    expect(declined.status).toBe(200);
    expect(dbService.isFriend(a.id, b.id)).toBe(false);

    const resend = await request(app).post('/api/friends/request').set(a.auth).send({ targetUserId: b.id });
    expect(resend.status).toBe(200);
    expect(dbService.getFriendRequests(b.id).incoming.some((r) => r.sender_id === a.id)).toBe(true);
  });

  it('can send a new request after unfriending', async () => {
    const a = makeUser('unfa');
    const b = makeUser('unfb');
    await request(app).post('/api/friends/request').set(a.auth).send({ targetUserId: b.id });
    const reqId = dbService.getFriendRequests(b.id).incoming[0].id;
    await request(app).post('/api/friends/respond').set(b.auth).send({ requestId: reqId, action: 'accept' });

    expect((await request(app).delete(`/api/friends/${b.id}`).set(a.auth)).status).toBe(200);
    expect(dbService.isFriend(a.id, b.id)).toBe(false);

    const again = await request(app).post('/api/friends/request').set(a.auth).send({ targetUserId: b.id });
    expect(again.status).toBe(200);
  });
});
