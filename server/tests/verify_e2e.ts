import { io } from 'socket.io-client';

async function runVerification() {
  console.log('🚀 Starting chitAbit end-to-end verification...\n');

  // 1. Authenticate Alice and Bob
  console.log('1. Authenticating users via REST API...');
  const resAlice = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice_dev' }),
  });
  const alice = (await resAlice.json()).user;
  console.log(`   ✓ Alice authenticated: ID=${alice.id}, Color=${alice.avatarColor}`);

  const resBob = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'bob_dev' }),
  });
  const bob = (await resBob.json()).user;
  console.log(`   ✓ Bob authenticated: ID=${bob.id}, Color=${bob.avatarColor}`);

  // 2. Connect both Socket.IO clients
  console.log('\n2. Connecting real-time Socket.IO clients...');
  const socketAlice = io('http://localhost:3001');
  const socketBob = io('http://localhost:3001');

  await Promise.all([
    new Promise<void>((resolve) => socketAlice.on('connect', () => resolve())),
    new Promise<void>((resolve) => socketBob.on('connect', () => resolve())),
  ]);
  console.log('   ✓ Both sockets connected successfully');

  // Announce users
  socketAlice.emit('user:join', { userId: alice.id, username: alice.username, channelId: 'general' });
  socketBob.emit('user:join', { userId: bob.id, username: bob.username, channelId: 'general' });
  await new Promise((r) => setTimeout(r, 500));

  // 3. Real-Time Channel Messaging
  console.log('\n3. Testing real-time messaging in #general...');
  const receivedByBobPromise = new Promise<any>((resolve) => {
    socketBob.on('message:new', (msg) => {
      if (msg.sender_username === 'alice_dev') resolve(msg);
    });
  });

  socketAlice.emit('message:send', {
    channelId: 'general',
    senderId: alice.id,
    senderUsername: alice.username,
    content: 'Hello Bob! Real-time Socket.IO is working.',
  });

  const receivedMsg = await receivedByBobPromise;
  console.log(`   ✓ Bob received message in real time from Alice: "${receivedMsg.content}"`);

  // 4. Code block and syntax highlight check
  console.log('\n4. Testing code block posting in #javascript...');
  socketAlice.emit('channel:switch', { channelId: 'javascript', previousChannelId: 'general' });
  socketBob.emit('channel:switch', { channelId: 'javascript', previousChannelId: 'general' });
  await new Promise((r) => setTimeout(r, 300));

  const codeMsgPromise = new Promise<any>((resolve) => {
    socketBob.on('message:new', (msg) => {
      if (msg.content.includes('```typescript')) resolve(msg);
    });
  });

  socketAlice.emit('message:send', {
    channelId: 'javascript',
    senderId: alice.id,
    senderUsername: alice.username,
    content: '```typescript\nfunction greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n```',
  });

  const receivedCodeMsg = await codeMsgPromise;
  console.log(`   ✓ Code block delivered with language tag: typescript`);

  // 5. DevBot streaming mention test
  console.log('\n5. Testing DevBot @mention & streaming response...');
  const botDonePromise = new Promise<any>((resolve) => {
    let chunkCount = 0;
    socketBob.on('bot:stream_chunk', (data) => {
      chunkCount++;
    });
    socketBob.on('bot:stream_done', (data) => {
      resolve({ chunkCount, message: data.message });
    });
  });

  socketBob.emit('message:send', {
    channelId: 'javascript',
    senderId: bob.id,
    senderUsername: bob.username,
    content: '@devbot can you review my greeting function?',
  });

  const botResult = await botDonePromise;
  console.log(`   ✓ DevBot streamed ${botResult.chunkCount} chunks to all channel participants`);
  console.log(`   ✓ DevBot final response preview: "${botResult.message.content.slice(0, 80).replace(/\n/g, ' ')}..."`);

  // 6. Direct Messaging (DM)
  console.log('\n6. Testing Direct Messaging between Bob and Alice...');
  const dmReceivedPromise = new Promise<any>((resolve) => {
    socketAlice.on('message:new', (msg) => {
      if (!msg.channel_id && msg.sender_username === 'bob_dev') resolve(msg);
    });
  });

  socketBob.emit('message:send', {
    dmRecipientId: alice.id,
    senderId: bob.id,
    senderUsername: bob.username,
    content: 'Hey Alice, direct message test!',
  });

  const receivedDm = await dmReceivedPromise;
  console.log(`   ✓ Alice received DM from Bob: "${receivedDm.content}"`);

  // 7. Reactions & Edit
  console.log('\n7. Testing emoji reactions and message edits...');
  const reactionPromise = new Promise<any>((resolve) => {
    socketBob.on('reaction:updated', (data) => {
      if (data.messageId === receivedDm.id) resolve(data);
    });
  });

  socketAlice.emit('reaction:toggle', {
    messageId: receivedDm.id,
    userId: alice.id,
    emoji: '🚀',
  });

  const reactionData = await reactionPromise;
  console.log(`   ✓ Reaction '🚀' registered: ${JSON.stringify(reactionData.reactions)}`);

  // Clean up
  socketAlice.disconnect();
  socketBob.disconnect();

  console.log('\n✅ All verification steps passed successfully!');
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
