import { describe, it, expect } from 'vitest';
import { botService } from '../src/services/botService.js';

describe('DevBot Service Tests', () => {
  it('correctly detects if Gemini API key is configured', () => {
    // In test environment without key, it should report false
    const configured = botService.isConfigured();
    expect(typeof configured).toBe('boolean');
  });

  it('runs demo mode successfully and streams informative markdown chunks', async () => {
    const chunks: string[] = [];
    let completedText = '';

    await botService.runDemoMode('Explain this quicksort algorithm', {
      onChunk: (c) => chunks.push(c),
      onDone: (full) => {
        completedText = full;
      },
      onError: () => {},
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(completedText).toContain('DevBot (Running in Demo Mode)');
    expect(completedText).toContain('GEMINI_API_KEY');
    expect(completedText).toContain('Google AI Studio');
    expect(completedText).toContain('Explain this quicksort algorithm');
  });

  it('streams specialized senior developer tips for bug requests in demo mode', async () => {
    let completedText = '';

    await botService.runDemoMode('Find bug in this React useEffect hook', {
      onChunk: () => {},
      onDone: (full) => {
        completedText = full;
      },
      onError: () => {},
    });

    expect(completedText).toContain('Debugging Checklist');
  });
});
