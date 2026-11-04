# Frontend ↔ backend: integration notes

The client is now wired to every backend feature. This note explains what changed
in the client, so the frontend team knows where things live.

## How the client talks to the server

- **Token on every request.** `client/src/utils/authFetch.ts` adds
  `Authorization: Bearer <token>` to every `fetch('/api/...')`. A `401` logs the user out.
- **Token on the socket.** `SocketContext.tsx` connects with `io('/', { auth: { token } })`
  and sends `user:join` once per connection.
- **Open chat.** `App.tsx` sends `channel:switch` / `dm:switch` whenever the open chat
  changes and again after every reconnect. The server uses this to know which chat
  the user is looking at (messages there are not counted as unread).
  Do **not** send `user:join` on chat changes: that used to reset the open chat to #general.

## What is integrated

| Feature | Where in the client |
|---|---|
| All channels (6 defaults + custom) in the sidebar | `ExplorerSidebar.tsx` (`channels` prop), loaded by `fetchChannels` in `App.tsx` |
| Channels in the quick switcher (Ctrl+K) | `CommandPalette.tsx` (`channels` prop) |
| Create channel (`+` next to CHANNELS, or "ChitAbit: Create Channel" in the palette) | `CreateChannelModal` → `handleCreateChannel` in `App.tsx` |
| New channels from other users appear live | `channel:created` listener in `App.tsx` |
| Unread badges loaded from the server (survive refresh) | `fetchUnreadCounts` in `App.tsx`, re-run after reconnect |
| Typing dots on any channel, not just #general | `typingChannelIds` prop on the sidebar |
| Server errors shown to the user | `error` listener → the amber notice banner |
| `/clear` clears the screen | `chat:clear` listener |
| Live friend requests | `friend_request:received` / `friend_request:accepted` (already existed) |
| DevBot DM marked as read when opened | `fetchMessages` in `App.tsx` |

`channelToChat()` in `utils/chatUtils.ts` turns a server channel into the
`ActiveChat` shape used by tabs, the sidebar and the palette.

## Behaviour changes to know about

- **Login needs a password.** Old accounts without one get the password typed on first login.
- **`POST /api/users/start-dm` no longer creates users.** Unknown usernames return 404.
- **Deleted messages** are hidden from history and search (soft delete on the server).
- **Uploads:** `.svg` and `.html` are rejected. Allowed: jpg, png, gif, webp, pdf, zip,
  txt, md, json, js, ts, py, css, csv, log (max 5 MB).
- **Reactions** must be an emoji.
- **DevBot** answers at most 5 questions per user per minute by default; the limit
  message arrives on `message:rate_limit` and shows in the notice banner.
- Socket payload fields like `senderId`, `userId`, `currentUserId` are ignored by the
  server (it uses the token) and can be removed from the client over time.

## Small things left for the frontend team (not blocking)

- When the server rejects a message (for example, too long), the input box is already
  cleared, so the text is lost. Keeping the text until the server accepts it would be nicer.
- `CreateChannelModal` and `EditMessageModal` use the older dark "zinc" styles and
  don't follow the VS Code theme colours yet.
- With "highlight all messages" on (the default), DevBot's Markdown is shown as
  highlighted source text rather than rendered Markdown. That may be intended; worth a look.
