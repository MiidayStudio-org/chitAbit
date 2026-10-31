import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { dbService } from '../src/db/index.js';

describe('Message & Channel API Tests', () => {
  let testUserId = 'test_user_api';

  beforeEach(() => {
    // Ensure test user exists
    const existing = dbService.getUserById(testUserId);
    if (!existing) {
      dbService.createUser(testUserId, 'testdev', 'Test Developer', '#3b82f6');
    }
  });

  it('GET /api/channels returns default seeded channels', async () => {
    const res = await request(app).get('/api/channels');
    expect(res.status).toBe(200);
    expect(res.body.channels).toBeInstanceOf(Array);
    const names = res.body.channels.map((c: any) => c.name);
    expect(names).toContain('general');
  });

  it('POST /api/channels creates a new channel with validation', async () => {
    const newChanName = `test-chan-${Date.now().toString(36)}`;
    const res = await request(app)
      .post('/api/channels')
      .send({ name: newChanName, description: 'Test channel', createdBy: testUserId });

    expect(res.status).toBe(201);
    expect(res.body.channel.name).toBe(newChanName);

    // Reject duplicate
    const dupRes = await request(app)
      .post('/api/channels')
      .send({ name: newChanName, description: 'Duplicate channel', createdBy: testUserId });
    expect(dupRes.status).toBe(409);
  });

  it('POST /api/auth/login logs in or creates persistent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice_coder' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('alice_coder');
    expect(res.body.user.avatarColor).toBeDefined();
  });

  it('Message CRUD and reactions work properly in database', () => {
    const msgId = `test_msg_${Date.now()}`;
    const msg = dbService.createMessage(
      msgId,
      'general',
      null,
      testUserId,
      'testdev',
      'Hello world from test'
    );
    expect(msg.id).toBe(msgId);
    expect(msg.content).toBe('Hello world from test');

    // Update
    const updated = dbService.updateMessage(msgId, testUserId, 'Updated content');
    expect(updated?.content).toBe('Updated content');
    expect(updated?.edited_at).toBeGreaterThan(0);

    // Toggle reaction
    const reactions = dbService.toggleReaction(msgId, testUserId, '🚀');
    expect(reactions.length).toBe(1);
    expect(reactions[0].emoji).toBe('🚀');
    expect(reactions[0].count).toBe(1);

    // Delete
    const deleted = dbService.deleteMessage(msgId, testUserId);
    expect(deleted).toBe(true);

    const check = dbService.getMessageById(msgId);
    expect(check).toBeUndefined();
  });
});
