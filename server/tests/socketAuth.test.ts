import { once } from 'node:events';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { io as connect, Socket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import { server } from '../src/index.js';
import { dbService } from '../src/db/index.js';
import { signToken } from '../src/middleware/auth.js';
import { botService } from '../src/services/botService.js';

const uniq = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function makeUser(prefix: string) {
  const id = `test_${prefix}_${uniq()}`;
  const username = `${prefix}_${uniq()}`.slice(0, 25);
  await dbService.createUser(id, username, null, prefix, '#3b82f6');
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
  it('delivers a message while an earlier draft lookup is pending and discards the stale draft', async () => {
    const sender = await makeUser('draftsender');
    const recipient = await makeUser('draftreceiver');
    const a = open(sender.token);
    const b = open(recipient.token);
    for (const client of [a, b]) {
      if (!client.connected) await once(client, 'connect');
      const joined = once(client, 'presence:update');
      client.emit('user:join');
      await joined;
    }

    let lookupStarted!: () => void;
    const started = new Promise<void>((resolve) => { lookupStarted = resolve; });
    let finishLookup!: () => void;
    const blocked = new Promise<void>((resolve) => { finishLookup = resolve; });
    const lookup = vi.spyOn(dbService, 'getLiveDraftSender').mockImplementationOnce(async () => {
      lookupStarted();
      await blocked;
      return { id: sender.id, username: sender.username };
    });
    const drafts: string[] = [];
    b.on('draft:update', (draft) => drafts.push(draft.text));

    try {
      a.emit('draft:update', { dmRecipientId: recipient.id, text: 'old draft' });
      await started;
      a.emit('draft:update', { dmRecipientId: recipient.id, text: 'queued draft' });
      const delivered = once(b, 'message:new', { signal: AbortSignal.timeout(1500) });
      a.emit('message:send', { dmRecipientId: recipient.id, content: 'sent message' });
      expect((await delivered)[0].content).toBe('sent message');

      finishLookup();
      const nextDraft = once(b, 'draft:update', { signal: AbortSignal.timeout(1500) });
      a.emit('draft:update', { dmRecipientId: recipient.id, text: 'new draft' });
      await nextDraft;
      expect(drafts).toEqual(['new draft']);
    } finally {
      finishLookup();
      lookup.mockRestore();
      a.close();
      b.close();
    }
  });

  it('acknowledges a saved message and deduplicates retries across Socket.IO and HTTP', async () => {
    const sender = await makeUser('retrysender');
    const recipient = await makeUser('retryrecipient');
    const client = open(sender.token);
    if (!client.connected) await once(client, 'connect');
    const joined = once(client, 'presence:update');
    client.emit('user:join');
    await joined;

    const payload = { dmRecipientId: recipient.id, content: 'same text', localTempId: 'temp_first' };
    const delivered = once(client, 'message:new', { signal: AbortSignal.timeout(1500) });
    // Save without an acknowledgement callback, like a client that lost its acknowledgement.
    client.emit('message:send', payload);
    const [original] = await delivered;

    const [acknowledged, http] = await Promise.all([
      client.timeout(1500).emitWithAck('message:send', payload),
      request(url).post('/api/messages/send').set('Authorization', `Bearer ${sender.token}`).send(payload),
    ]);
    expect(acknowledged).toMatchObject({ success: true, message: { id: original.id } });
    expect(http.body).toMatchObject({ success: true, message: { id: original.id } });
    expect(await dbService.getDMMessages(sender.id, recipient.id)).toHaveLength(1);

    const separate = await client.timeout(1500).emitWithAck('message:send', { ...payload, localTempId: 'temp_second' });
    expect(separate.success).toBe(true);
    expect(separate.message.id).not.toBe(original.id);
    expect(await dbService.getDMMessages(sender.id, recipient.id)).toHaveLength(2);
    client.close();
  });

  it('rejects a socket without a valid token', async () => {
    const err = await new Promise<Error>((resolve) => {
      const s = open('garbage');
      s.on('connect_error', resolve);
    });
    expect(err.message).toBe('Unauthorized');
  });

  it('sender is taken from the token, not from senderId in the payload', async () => {
    const alice = await makeUser('salice');
    const victim = await makeUser('svictim');

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
    const u = await makeUser('sbot');
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
    const u = await makeUser('srest');
    const s = open(u.token);
    await new Promise<void>((resolve) => s.on('connect', () => resolve()));
    s.emit('user:join', { channelId: 'general' });
    await wait(100);

    const msgId = `test_rest_${uniq()}`;
    await dbService.createMessage(msgId, 'general', null, u.id, u.username, 'before');

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
    const a = await makeUser('lfa');
    const b = await makeUser('lfb');
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

    const reqId = (await dbService.getFriendRequests(b.id)).incoming[0].id;
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
      const u = await makeUser('sdup');
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
    const u = await makeUser('sview');
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

    expect((await dbService.getUnreadCounts(u.id)).devbot).toBeUndefined();

    // And a #general message while we sit in the DevBot DM IS unread
    const other = await makeUser('sother');
    await wait(5);
    await dbService.createMessage(`test_v_${uniq()}`, 'general', null, other.id, other.username, 'ping');
    expect((await dbService.getUnreadCounts(u.id)).general).toBe(1);
  }, 15000);

  it('bad input does not crash the server', async () => {
    const u = await makeUser('scrash');
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
