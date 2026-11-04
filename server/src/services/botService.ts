import '../config/env.js'; // load .env (GEMINI_API_KEY, GEMINI_MODEL)
import { GoogleGenAI } from '@google/genai';

const SYSTEM_INSTRUCTION = `You are DevBot, an elite senior software engineer and technical mentor built into this developer chat application.
Your core principles:
1. Persona: Direct, pragmatic, senior staff engineer.
2. Expertise: Modern full-stack development, software architecture, debugging tricky bugs, code review, performance optimization, and developer best practices.
3. Response Format: Always use GitHub-flavored Markdown. Fenced code blocks must specify the language tag (e.g., \`\`\`typescript, \`\`\`python, \`\`\`bash).
4. Brevity: Keep responses concise, direct, and actionable. Avoid unnecessary fluff or overly polite filler words unless the user asks for deep elaboration.
5. If reviewing or explaining code: identify potential edge cases, off-by-one errors, async issues, or memory/security risks.`;

export interface ChatMessageContext {
  senderUsername: string;
  content: string;
  isBot?: boolean;
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export const botService = {
  isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return Boolean(key && key.trim() !== '' && key !== 'your_gemini_api_key_here');
  },

  async streamReply(
    prompt: string,
    history: ChatMessageContext[],
    callbacks: StreamCallbacks
  ): Promise<void> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!this.isConfigured()) {
      // Demo Mode: Stream realistic friendly senior response explaining key setup + mock helpful review
      await this.runDemoMode(prompt, callbacks);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Construct context prompt from the last 15 messages
      const contextLines = history.slice(-15).map((msg) => `${msg.senderUsername}: ${msg.content}`);
      const fullPrompt = [
        contextLines.length > 0 ? `### Recent Chat History:\n${contextLines.join('\n')}\n` : '',
        `### Current Request:\n${prompt}`,
      ].filter(Boolean).join('\n');

      const responseStream = await ai.models.generateContentStream({
        model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      let accumulated = '';
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          accumulated += text;
          callbacks.onChunk(text);
        }
      }

      callbacks.onDone(accumulated);
    } catch (err: any) {
      console.error('[DevBot] Error calling Gemini API:', err);
      let friendlyMessage = '⚠️ **DevBot Encountered an Error**: ';

      if (err?.status === 429 || err?.message?.includes('RESOURCE_EXHAUSTED')) {
        friendlyMessage += 'The Gemini API rate limit was reached. Please wait a moment before sending another request.';
      } else if (err?.status === 400 || err?.message?.includes('API_KEY_INVALID') || err?.message?.includes('key')) {
        friendlyMessage += 'The `GEMINI_API_KEY` appears invalid or unauthorized. Please verify your key in `.env`.';
      } else {
        friendlyMessage += `Could not complete the request (${err?.message || 'Network / Service error'}). DevBot is still online and ready for your next question.`;
      }

      callbacks.onChunk(friendlyMessage);
      callbacks.onDone(friendlyMessage);
      callbacks.onError(err);
    }
  },

  async runDemoMode(prompt: string, callbacks: StreamCallbacks): Promise<void> {
    let explanationOrReview = '';
    const lower = prompt.toLowerCase();

    if (lower.includes('explain') || lower.includes('what does')) {
      explanationOrReview = `\n\n💡 **Senior Dev Perspective**:
When evaluating this snippet, look for:
1. **Purity & State**: Does this function modify external variables unexpectedly?
2. **Async boundaries**: Are promises awaited properly with try/catch handlers?
3. **Complexity**: Can time complexity be reduced from O(n²) to O(n) using Maps or Sets?`;
    } else if (lower.includes('bug') || lower.includes('fix') || lower.includes('error')) {
      explanationOrReview = `\n\n🐛 **Debugging Checklist**:
1. Verify undefined/null checks before accessing nested properties.
2. Check asynchronous lifecycle synchronization and race conditions.
3. Inspect whether types and schema assumptions hold true at runtime.`;
    } else {
      explanationOrReview = `\n\n🚀 **Quick Tip**: Writing clean, modular code with descriptive variable names and single-responsibility functions will save hours in code reviews.`;
    }

    const demoMessage = `🤖 **DevBot (Running in Demo Mode)**

I am ready to assist as your Senior AI Engineer! Because \`GEMINI_API_KEY\` is not currently configured in \`.env\`, I am operating in **Interactive Demo Mode**.

### 🔑 How to enable live Gemini AI:
1. Get a free API key at [Google AI Studio](https://aistudio.google.com/)
2. Open \`.env\` in the project root
3. Add: \`GEMINI_API_KEY=your_actual_key_here\`
4. Restart the server (\`npm run dev\`)

---
**Your Query**:
> ${prompt.replace(/\n/g, '\n> ')}
${explanationOrReview}`;

    // Split message into realistic streaming chunks
    const chunks = demoMessage.split(/(?<=\s|[\n.,!?:])/);
    let full = '';
    // Small pause for realistic typing effect (instant during automated tests)
    const delay = process.env.NODE_ENV === 'test' ? 1 : 20;
    for (const chunk of chunks) {
      full += chunk;
      callbacks.onChunk(chunk);
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    callbacks.onDone(full);
  },
};
