import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { dbService } from '../src/db/index.js';
import { signToken } from '../src/middleware/auth.js';

const uniq = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeUser(prefix: string) {
  const id = `test_${prefix}_${uniq()}`;
  const username = `${prefix}_${uniq()}`.slice(0, 25);
  dbService.createUser(id, username, null, prefix, '#3b82f6');
  return { id, username, auth: { Authorization: `Bearer ${signToken({ userId: id, username })}` } };
}

let msgCounter = 0;
function post(channelId: string | null, dmRecipientId: string | null, sender: { id: string; username: string }, text = 'hi') {
  return dbService.createMessage(`test_m_${uniq()}_${msgCounter++}`, channelId, dmRecipientId, sender.id, sender.username, text);
}

describe('Channels', () => {
  it('lists the 6 default channels first, in order', async () => {
    const u = makeUser('chlist');
    const res = await request(app).get('/api/channels').set(u.auth);
    expect(res.status).toBe(200);
    const ids = res.body.channels.map((c: any) => c.id);
    expect(ids.slice(0, 6)).toEqual(['general', 'javascript', 'python', 'devops', 'ai-ml', 'help']);
  });

  it('a created channel shows up in the list', async () => {
    const u = makeUser('chnew');
    const name = `ch-${uniq()}`;
    expect((await request(app).post('/api/channels').set(u.auth).send({ name })).status).toBe(201);
    const res = await request(app).get('/api/channels').set(u.auth);
    expect(res.body.channels.map((c: any) => c.id)).toContain(name);
  });
});

describe('Unread counts', () => {
  it('counts channel messages from others since last read, then clears on read', async () => {
    const reader = makeUser('rdr');
    const writer = makeUser('wtr');
    await wait(5);

    post('python', null, writer);
    post('python', null, writer);
    post('python', null, reader); // own messages never count

    let res = await request(app).get('/api/messages/unread').set(reader.auth);
    expect(res.body.unreadCounts.python).toBe(2);

    await wait(5);
    const read = await request(app).post('/api/messages/read').set(reader.auth).send({ channelId: 'python' });
    expect(read.status).toBe(200);

    res = await request(app).get('/api/messages/unread').set(reader.auth);
    expect(res.body.unreadCounts.python).toBeUndefined();
  });

  it('new users do not see old channel history as unread', async () => {
    const writer = makeUser('oldw');
    post('devops', null, writer);
    await wait(5);
    const newcomer = makeUser('newc');
    const res = await request(app).get('/api/messages/unread').set(newcomer.auth);
    expect(res.body.unreadCounts.devops).toBeUndefined();
  });

  it('counts unread DMs per sender and clears them on read', async () => {
    const me = makeUser('dmme');
    const friend = makeUser('dmfr');
    post(null, me.id, friend);
    post(null, me.id, friend);
    post(null, friend.id, me); // my own DM to them does not count for me

    let res = await request(app).get('/api/messages/unread').set(me.auth);
    expect(res.body.unreadCounts[friend.id]).toBe(2);

    await request(app).post('/api/messages/read').set(me.auth).send({ senderId: friend.id });
    res = await request(app).get('/api/messages/unread').set(me.auth);
    expect(res.body.unreadCounts[friend.id]).toBeUndefined();
  });
});

describe('Search', () => {
  it('treats % and _ as normal characters, not wildcards', async () => {
    const u = makeUser('srch');
    const tag = uniq();
    post('general', null, u, `coverage 100% ${tag}`);
    post('general', null, u, `coverage 1000 ${tag}`);
    post('general', null, u, `my_var ${tag}`);
    post('general', null, u, `myXvar ${tag}`);

    const pct = await request(app).get(`/api/messages/search?q=${encodeURIComponent('100%')}`).set(u.auth);
    expect(pct.body.messages.map((m: any) => m.content)).toEqual([`coverage 100% ${tag}`]);

    const under = await request(app).get(`/api/messages/search?q=${encodeURIComponent('my_var ' + tag)}`).set(u.auth);
    expect(under.body.messages.map((m: any) => m.content)).toEqual([`my_var ${tag}`]);
  });
});

describe('Soft delete', () => {
  it('keeps the row but hides it from history, search and unread', async () => {
    const reader = makeUser('sdr');
    const writer = makeUser('sdw');
    await wait(5);
    const secret = `secret_${uniq()}`;
    const msg = post('help', null, writer, secret);

    expect((await request(app).delete(`/api/messages/${msg.id}`).set(writer.auth)).status).toBe(200);

    // Row still exists, content wiped
    const { db } = await import('../src/db/index.js');
    const row = db.prepare('SELECT content, deleted_at FROM messages WHERE id = ?').get(msg.id) as any;
    expect(row.deleted_at).toBeGreaterThan(0);
    expect(row.content).toBe('');

    const history = await request(app).get('/api/channels/help/messages').set(reader.auth);
    expect(history.body.messages.some((m: any) => m.id === msg.id)).toBe(false);

    const search = await request(app).get(`/api/messages/search?q=${secret}`).set(reader.auth);
    expect(search.body.messages).toHaveLength(0);

    const unread = await request(app).get('/api/messages/unread').set(reader.auth);
    expect(unread.body.unreadCounts.help).toBeUndefined();

    // Deleting twice / editing a deleted message fails
    expect((await request(app).delete(`/api/messages/${msg.id}`).set(writer.auth)).status).toBe(404);
    expect(dbService.updateMessage(msg.id, writer.id, 'revived')).toBeUndefined();
  });
});
