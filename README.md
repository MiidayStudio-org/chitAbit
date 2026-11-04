# ⚡ chitAbit — Real-Time Developer & AI Chat

A modern, developer-first real-time chat application featuring rich Markdown, syntax-highlighted code blocks with interactive quick actions, SQLite persistence, slash commands, channel & direct messaging, and an integrated Senior AI Engineer chatbot (**DevBot**) powered by Google Gemini.

---

## ✨ Features

### 💻 Developer-Focused Experience
- **IDE/Terminal Aesthetics**: Built with a sleek dark theme default (using JetBrains Mono accents) and instant light mode toggle.
- **Rich Markdown & Code Fencing**: Full support for bold, italic, tables, lists, links, and code blocks with syntax highlighting powered by `highlight.js`.
- **Interactive Code Actions**: Every fenced code block includes:
  - **Copy button**: 1-click clipboard copy with status feedback.
  - **Explain this code**: Instantly prompts DevBot to analyze the snippet.
  - **Find bug**: Sends the snippet to DevBot for edge-case and bug inspection.
- **Slash Commands**:
  - `/help` — Cheat sheet of all commands & keyboard shortcuts
  - `/clear` — Clears message history from the local view
  - `/shrug` — Quick ASCII shrug `¯\_(ツ)_/¯`
  - `/code <lang> [code]` — Generate formatted code blocks
  - `/json <raw_json>` — Pretty-print, format, and highlight JSON
  - `/time` — Display current UTC and local timestamps
  - `/ask <question>` — Ask DevBot directly
- **Keyboard Shortcuts**:
  - `Enter` to send message
  - `Shift + Enter` for a new line
  - `Ctrl + K` (or `Cmd + K`) for the Quick Switcher palette

### 💬 Real-Time Messaging & Channels
- **Socket.IO Engine**: Instant delivery for channels and direct messages.
- **Default Channels**: `#general`, `#javascript`, `#python`, `#devops`, `#ai-ml`, `#help`.
- **Create Channels**: Custom channel creation with description support.
- **Direct Messaging**: 1-on-1 private messaging with teammates or DevBot.
- **Unread Badges**: Unread counts per channel and DM, stored on the server so they survive a refresh.
- **Reactions & Message Management**:
  - Add/remove emoji reactions (`👍`, `❤️`, `🚀`, `🔥`, `🐛`, `👀`, `💯`)
  - Edit and delete your own messages (deletes are soft: hidden everywhere, row kept)
- **Friends**: Friend requests with live notifications, accept/decline, unfriend.
- **Active Presence & Typing Indicators**: Real-time online member count and typing indicator for users and DevBot.
- **Login**: Username + password (bcrypt), 30-day JWT session saved in `localStorage`.

### 🔒 Security
- Every REST route (except login/register) and every socket connection requires a valid JWT.
- The server always takes the user from the token, never from ids sent by the client.
- Login/register are rate limited per IP; messages, live drafts and DevBot each have their own per-user limit.
- Input is sanitized against XSS; uploads are limited to safe types (no SVG/HTML) and served with safe headers.

### 🤖 DevBot (Senior AI Engineer)
- **Always Available**: Present in every channel and in direct messages.
- **Triggering DevBot**:
  - Mention `@devbot` in any message
  - Use `/ask <question>`
  - Direct message DevBot
- **Senior Persona**: Direct, senior staff engineer answers. Explains architecture, uncovers bugs, and suggests modern best practices in Markdown.
- **Context-Aware**: Pulls up to the last 15 messages in the channel or DM conversation for contextual debugging.
- **Rate Limited**: 5 questions per user per minute by default (`DEVBOT_MAX_PER_MINUTE`), to protect the Gemini quota.
- **Real-Time Token Streaming**: Streams responses token-by-token with an animated typing status.
- **Graceful Error Handling & Demo Mode**:
  - If `GEMINI_API_KEY` is not provided, DevBot automatically runs in **Interactive Demo Mode**, providing guidance and mock technical tips without crashing.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Socket.IO, `tsx`
- **Database**: SQLite via `better-sqlite3` (stored in `./data/chat.db`)
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **AI Integration**: Google Gemini API (`@google/genai`)
- **Markdown & Code**: `react-markdown`, `remark-gfm`, `highlight.js`
- **Testing**: `vitest`, `supertest`

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 20 or 22 LTS (recommended) and npm.
- `better-sqlite3` is a native module. If no prebuilt binary exists for your Node version
  (for example very new Node releases on Windows), npm compiles it and needs build tools:
  on Windows, Visual Studio with **"Desktop development with C++"** and a **Windows SDK**.
  Using Node 22 LTS usually avoids this.

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```

Open `.env` and set at least:
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=a_long_random_string
```

Generate a `JWT_SECRET` with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | no | Server port (default 3001) |
| `GEMINI_API_KEY` | no | DevBot. Empty = Demo Mode |
| `JWT_SECRET` | **yes in production** | Signs login tokens. Server refuses to start in production without it |
| `GEMINI_MODEL` | no | Gemini model (default `gemini-2.5-flash`) |
| `DEVBOT_MAX_PER_MINUTE` | no | DevBot questions per user per minute (default 5) |
| `CLIENT_ORIGIN` | production | Allowed frontend URL(s) for CORS, comma-separated |
| `DB_PATH` | no | SQLite file (default `data/chat.db`) |

> **🔑 How to get a Gemini API key:**
> 1. Visit [Google AI Studio](https://aistudio.google.com/).
> 2. Sign in with your Google account and click **Get API Key**.
> 3. Create a key and paste it into `.env`.
> *(Note: If you leave `GEMINI_API_KEY` empty, the app will run in Demo Mode and will continue to work normally).*

### 3. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
npm --prefix server install

# Install client dependencies
npm --prefix client install
```

### 4. Start the Application
Run both backend and frontend concurrently with a single command from root:
```bash
npm run dev
```

The application will be live at:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

---

## 🧪 Running Tests

To run the automated tests covering auth and access control, channels, unread counts, friends, socket events, slash commands, and the DevBot service:
```bash
npm test
```

Tests use an in-memory database, so they never touch `data/chat.db`.

---

## 🔌 API Reference

All routes except `POST /api/auth/login` and `POST /api/auth/register` need
`Authorization: Bearer <token>`. Sockets connect with `io('/', { auth: { token } })`.

| Method | Route | What it does |
|---|---|---|
| POST | `/api/auth/register` | `{ username, password, displayName? }` → `{ token, user }` |
| POST | `/api/auth/login` | `{ username, password }` → `{ token, user }` |
| GET | `/api/auth/me` | Your profile |
| PUT | `/api/auth/profile` | Update your profile and settings |
| GET | `/api/channels` | All channels (defaults first) |
| POST | `/api/channels` | `{ name, description? }` create a channel |
| GET | `/api/channels/:id/messages` | History (`?limit=`, `?before=`) |
| GET | `/api/messages/dm/:me/:other` | DM history (you must be one of the two) |
| GET | `/api/messages/unread` | `{ unreadCounts: { channelId or userId: n } }` |
| POST | `/api/messages/read` | `{ channelId }` or `{ senderId }` mark as read |
| GET | `/api/messages/search` | `?q=` plus optional `channelId` or `user1Id`/`user2Id` |
| PUT / DELETE | `/api/messages/:id` | Edit / delete your own message |
| GET | `/api/friends` | Your friends |
| GET | `/api/friends/search` | `?q=` find users |
| GET | `/api/friends/requests` | Pending `{ incoming, outgoing }` |
| POST | `/api/friends/request` | `{ targetUserId }` or `{ targetUsername }` |
| POST | `/api/friends/respond` | `{ requestId, action: 'accept' \| 'decline' }` |
| DELETE | `/api/friends/:friendId` | Unfriend |
| GET | `/api/users` | All users |
| POST | `/api/users/start-dm` | `{ username }` look up an existing user |
| POST | `/api/upload` | `multipart/form-data` field `file` (max 5 MB) |

**Socket events.** Client → server: `user:join`, `channel:switch`, `dm:switch`,
`message:send`, `message:edit`, `message:delete`, `message:read`, `channel:read`,
`reaction:toggle`, `typing:start`, `typing:stop`, `draft:update`, `draft:clear`.
Server → client: `message:new`, `message:edited`, `message:deleted`, `reaction:updated`,
`message:read_receipt`, `typing:status`, `presence:update`, `draft:update`, `draft:cleared`,
`draft:sync`, `bot:typing`, `bot:stream:chunk`, `bot:stream:end`, `channel:created`,
`friend_request:received`, `friend_request:accepted`, `message:rate_limit`, `chat:clear`, `error`.

See [`docs/frontend-handoff.md`](docs/frontend-handoff.md) for how the client is wired to these.

---

## 📁 Project Structure

```
chitAbit/
├── package.json              # Monorepo scripts with concurrently
├── .env.example              # Template environment variables
├── .gitignore                # Git ignore rules
├── README.md                 # Project documentation
├── data/                     # SQLite database storage (chat.db)
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts          # Express + Socket.IO server setup
│   │   ├── db/               # SQLite connection, schema, seed data, and queries
│   │   ├── routes/           # REST endpoints (/auth, /channels, /messages, /users)
│   │   ├── sockets/          # Socket.IO event handlers and presence
│   │   ├── services/         # BotService (Gemini streaming) and SlashCommands parser
│   │   └── middleware/       # Sliding-window rate limiter & XSS input sanitization
│   └── tests/                # Vitest test suites
└── client/
    ├── package.json
    ├── vite.config.ts        # Vite configuration with WebSocket proxy
    ├── index.html            # Entry HTML with typography
    ├── tailwind.config.js    # Custom developer colors and typography
    └── src/
        ├── App.tsx           # Main application shell
        ├── types/            # TypeScript interfaces
        ├── context/          # Auth, Socket, and Theme contexts
        └── components/
            ├── chat/         # MessageList, MessageItem, CodeBlock, MessageInput, TypingIndicator
            ├── layout/       # Sidebar, Header, QuickSwitcher (Ctrl+K)
            └── modals/       # CreateChannelModal, LoginModal, EditMessageModal
```
