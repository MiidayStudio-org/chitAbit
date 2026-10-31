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
- **Unread Badges**: Real-time counter of unread messages per channel and DM.
- **Reactions & Message Management**:
  - Add/remove emoji reactions (`👍`, `❤️`, `🚀`, `🔥`, `🐛`, `👀`, `💯`)
  - Edit and delete your own messages
- **Active Presence & Typing Indicators**: Real-time online member count and typing indicator for users and DevBot.
- **Passwordless Login**: Instant login with persisted sessions via `localStorage`.

### 🤖 DevBot (Senior AI Engineer)
- **Always Available**: Present in every channel and in direct messages.
- **Triggering DevBot**:
  - Mention `@devbot` in any message
  - Use `/ask <question>`
  - Direct message DevBot
- **Senior Persona**: Direct, senior staff engineer answers. Explains architecture, uncovers bugs, and suggests modern best practices in Markdown.
- **Context-Aware**: Pulls up to the last 15 messages in the channel or DM conversation for contextual debugging.
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
- Node.js (v18+) and npm installed.

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```

Open `.env` and add your Google Gemini API key:
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
```

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

To run the automated tests covering API endpoints, slash commands, and the DevBot service:
```bash
npm test
```

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
