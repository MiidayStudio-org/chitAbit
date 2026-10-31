export interface SlashCommandResult {
  isCommand: boolean;
  command?: string;
  args?: string;
  // If handledDirectly is true, the message text should be replaced by resultText before saving
  handledDirectly?: boolean;
  resultText?: string;
  // If true, trigger DevBot response
  isDevBotAsk?: boolean;
  askQuery?: string;
  // If true, command only affects client view (like /clear)
  isClientOnly?: boolean;
}

export function parseSlashCommand(input: string): SlashCommandResult {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return { isCommand: false };
  }

  const spaceIndex = trimmed.indexOf(' ');
  const command = (spaceIndex === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIndex)).toLowerCase();
  const args = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1).trim();

  switch (command) {
    case 'help': {
      const helpText = `### 🛠️ Developer Chat Commands & Shortcuts

#### Slash Commands
- \`/help\` — Display this command reference guide
- \`/clear\` — Clear chat messages from your local screen
- \`/shrug [message]\` — Send a shrug \`¯\\_(ツ)_/¯\`
- \`/code <language> [code]\` — Wrap code in a highlighted markdown fence
- \`/json <raw_json>\` — Format, pretty-print, and highlight JSON
- \`/time\` — Print current UTC and local timestamps
- \`/ask <question>\` — Prompt DevBot directly for coding help

#### Keyboard Shortcuts
- **Enter**: Send message
- **Shift + Enter**: Insert new line
- **Ctrl + K** (or **Cmd + K**): Open channel/DM quick switcher
- **Quick Actions**: Hover over code blocks to click **Explain this code** or **Find bug**`;
      return {
        isCommand: true,
        command: 'help',
        handledDirectly: true,
        resultText: helpText,
      };
    }

    case 'clear': {
      return {
        isCommand: true,
        command: 'clear',
        isClientOnly: true,
      };
    }

    case 'shrug': {
      const resultText = args ? `${args} ¯\\_(ツ)_/¯` : `¯\\_(ツ)_/¯`;
      return {
        isCommand: true,
        command: 'shrug',
        handledDirectly: true,
        resultText,
      };
    }

    case 'code': {
      if (!args) {
        return {
          isCommand: true,
          command: 'code',
          handledDirectly: true,
          resultText: '```typescript\n// Write or paste code here\nconsole.log("Hello, developer!");\n```',
        };
      }
      const firstArgSpace = args.indexOf(' ');
      let lang = 'typescript';
      let code = '';
      if (firstArgSpace === -1) {
        lang = args;
        code = `// Start coding in ${lang}...`;
      } else {
        lang = args.slice(0, firstArgSpace);
        code = args.slice(firstArgSpace + 1);
      }
      return {
        isCommand: true,
        command: 'code',
        handledDirectly: true,
        resultText: `\`\`\`${lang}\n${code}\n\`\`\``,
      };
    }

    case 'json': {
      if (!args) {
        return {
          isCommand: true,
          command: 'json',
          handledDirectly: true,
          resultText: '⚠️ Usage: `/json {"key": "value"}` — Provide JSON to validate and format.',
        };
      }
      try {
        const parsed = JSON.parse(args);
        const formatted = JSON.stringify(parsed, null, 2);
        return {
          isCommand: true,
          command: 'json',
          handledDirectly: true,
          resultText: `\`\`\`json\n${formatted}\n\`\`\``,
        };
      } catch (err: any) {
        return {
          isCommand: true,
          command: 'json',
          handledDirectly: true,
          resultText: `❌ **Invalid JSON syntax**:\n\`\`\`text\n${err?.message || 'Parse error'}\n\`\`\``,
        };
      }
    }

    case 'time': {
      const now = new Date();
      const utcString = now.toUTCString();
      const isoString = now.toISOString();
      const localString = now.toString();
      const timeMarkdown = `🕒 **Current Timestamps**:
- **UTC**: \`${utcString}\` (\`${isoString}\`)
- **Local**: \`${localString}\``;
      return {
        isCommand: true,
        command: 'time',
        handledDirectly: true,
        resultText: timeMarkdown,
      };
    }

    case 'ask': {
      if (!args) {
        return {
          isCommand: true,
          command: 'ask',
          handledDirectly: true,
          resultText: '⚠️ Usage: `/ask <your technical question>` (e.g. `/ask How does Promise.allSettled work?`)',
        };
      }
      return {
        isCommand: true,
        command: 'ask',
        isDevBotAsk: true,
        askQuery: args,
      };
    }

    default:
      return {
        isCommand: false,
      };
  }
}
