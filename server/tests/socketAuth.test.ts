import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { io as connect, Socket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import { server } from '../src/index.js';
import { dbService } from '../src/db/index.js';
import { signToken } from '../src/middleware/auth.js';
import { botService } from '../src/services/botService.js';

const uniq = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function makeUser(prefix: string) {
  const id = `test_${prefix}_${uniq()}`;
  const username = `${prefix}_${uniq()}`.slice(0, 25);
  dbService.createUser(id, username, null, prefix, '#3b82f6');
  return { id, username, token: signToken({ userId: id, username }) };
}

let url = '';
const sockets: Socket[] = [];

function open(token?: string): Socket {
  const s = connect(url, { transports: ['websocket'], auth: token ? { token } : {}, reconnection: false });
  sockets.push(s);
  return s;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Socket authentication', () => {
  it('rejects a socket without a valid token', async () => {
    const err = await new Promise<Error>((resolve) => {
      const s = open('garbage');
      s.on('connect_error', resolve);
    });
    expect(err.message).toBe('Unauthorized');
  });

  it('sender is taken from the token, not from senderId in the payload', async () => {
    const alice = makeUser('salice');
    const victim = makeUser('svictim');

    const s = open(alice.token);
    await new Promise<void>((resolve) => s.on('connect', () => resolve()));
    s.emit('user:join', { userId: victim.id, channelId: 'general' });
    await wait(100);

    const received = new Promise<any>((resolve) => s.on('message:new', resolve));
    s.emit('message:send', {
      channelId: 'general',
      senderId: victim.id,
      senderUsername: victim.username,
      content: 'spoof attempt',
    });
    const msg = await received;
    expect(msg.sender_id).toBe(alice.id);
    expect(msg.sender_username).toBe(alice.username);
  });

  it('DevBot stream uses the event names the client listens for', async () => {
    process.env.GEMINI_API_KEY = ''; // force demo mode: no real API call
    const u = makeUser('sbot');
    const s = open(u.token);
    await new Promise<void>((resolve) => s.on('connect', () => resolve()));
    s.emit('user:join', { channelId: 'general' });
    await wait(100);

    let gotChunk = false;
    s.on('bot:stream:chunk', () => (gotChunk = true));
    const done = new Promise<any>((resolve) => s.on('bot:stream:end', resolve));
    s.emit('message:send', { dmRecipientId: 'devbot', content: 'hello bot' });

    const result = await done;
    expect(gotChunk).toBe(true);
    expect(result.message.sender_id).toBe('devbot');
  }, 15000);

  it('REST edit/delete sends live socket events', async () => {
    const u = makeUser('srest');
    const s = open(u.token);
    await new Promise<void>((resolve) => s.on('connect', () => resolve()));
    s.emit('user:join', { channelId: 'general' });
    await wait(100);

    const msgId = `test_rest_${uniq()}`;
    dbService.createMessage(msgId, 'general', null, u.id, u.username, 'before');

    const edited = new Promise<any>((resolve) => s.on('message:edited', resolve));
    await fetch(`${url}/api/messages/${msgId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${u.token}` },
      body: JSON.stringify({ content: 'after' }),
    });
    expect((await edited).content).toBe('after');

    const deleted = new Promise<any>((resolve) => s.on('message:deleted', resolve));
    await fetch(`${url}/api/messages/${msgId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${u.token}` },
    });
    expect((await deleted).id).toBe(msgId);
  });

  it('friend requests are pushed live to the other user', async () => {
    const a = makeUser('lfa');
    const b = makeUser('lfb');
    const sb = open(b.token);
    const sa = open(a.token);
    await Promise.all([sa, sb].map((s) => new Promise<void>((r) => s.on('connect', () => r()))));
    sa.emit('user:join', {});
    sb.emit('user:join', {});
    await wait(100);

    const received = new Promise<any>((resolve) => sb.on('friend_request:received', resolve));
    await fetch(`${url}/api/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${a.token}` },
      body: JSON.stringify({ targetUserId: b.id }),
    });
    expect((await received).fromUserId).toBe(a.id);

    const reqId = dbService.getFriendRequests(b.id).incoming[0].id;
    const accepted = new Promise<any>((resolve) => sa.on('friend_request:accepted', resolve));
    await fetch(`${url}/api/friends/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${b.token}` },
      body: JSON.stringify({ requestId: reqId, action: 'accept' }),
    });
    expect((await accepted).userId).toBe(b.id);
  });

  it('DevBot gets the question once (not also in history) and has its own rate limit', async () => {
    process.env.GEMINI_API_KEY = '';
    process.env.DEVBOT_MAX_PER_MINUTE = '1';
    const spy = vi.spyOn(botService, 'streamReply');
    try {
      const u = makeUser('sdup');
      const s = open(u.token);
      await new Promise<void>((resolve) => s.on('connect', () => resolve()));
      s.emit('user:join', {});
      await wait(100);

      const question = `unique question ${uniq()}`;
      const done = new Promise<void>((resolve) => s.on('bot:stream:end', () => resolve()));
      s.emit('message:send', { dmRecipientId: 'devbot', content: question });
      await done;

      const [prompt, history] = spy.mock.calls[0];
      expect(prompt).toBe(question);
      expect(history.some((h: any) => h.content === question)).toBe(false);

      // Second question in the same minute is refused
      const limited = new Promise<any>((resolve) => s.on('message:rate_limit', resolve));
      s.emit('message:send', { dmRecipientId: 'devbot', content: 'one more?' });
      expect((await limited).message).toMatch(/DevBot/);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
      delete process.env.DEVBOT_MAX_PER_MINUTE;
    }
  }, 15000);

  it('a repeated user:join keeps the open chat, so DevBot answers watched live are not unread', async () => {
    process.env.GEMINI_API_KEY = '';
    const u = makeUser('sview');
    const s = open(u.token);
    await new Promise<void>((resolve) => s.on('connect', () => resolve()));
    s.emit('user:join', { channelId: 'general' });
    s.emit('dm:switch', { recipientId: 'devbot' });
    s.emit('user:join', { channelId: 'general' }); // must NOT move us back to #general
    await wait(100);

    const done = new Promise<void>((resolve) => s.on('bot:stream:end', () => resolve()));
    s.emit('message:send', { dmRecipientId: 'devbot', content: 'hi bot' });
    await done;
    await wait(50);

    expect(dbService.getUnreadCounts(u.id).devbot).toBeUndefined();

    // And a #general message while we sit in the DevBot DM IS unread
    const other = makeUser('sother');
    await wait(5);
    dbService.createMessage(`test_v_${uniq()}`, 'general', null, other.id, other.username, 'ping');
    expect(dbService.getUnreadCounts(u.id).general).toBe(1);
  }, 15000);

  it('bad input does not crash the server', async () => {
    const u = makeUser('scrash');
    const s = open(u.token);
    await new Promise<void>((resolve) => s.on('connect', () => resolve()));
    s.emit('user:join', { channelId: 'general' });

    const errors: any[] = [];
    s.on('error', (e: any) => errors.push(e));

    s.emit('message:send', { channelId: 'no-such-channel', content: 'hi' });
    s.emit('reaction:toggle', { messageId: 'no-such-message', emoji: '👍' });
    s.emit('message:send', 'not an object');
    s.emit('message:send', { channelId: 'general', content: 'x', attachmentUrl: 'javascript:alert(1)' });
    await wait(200);

    expect(errors.some((e) => /Unknown channel/.test(e.message))).toBe(true);
    expect(errors.some((e) => /Invalid attachment/.test(e.message))).toBe(true);

    // Server is still alive
    const received = new Promise<any>((resolve) => s.on('message:new', resolve));
    s.emit('message:send', { channelId: 'general', content: 'still alive' });
    expect((await received).content).toBe('still alive');
  });
});
