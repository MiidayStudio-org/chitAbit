import { describe, it, expect } from 'vitest';
import { parseSlashCommand } from '../src/services/slashCommands.js';

describe('Slash Command Parser Tests', () => {
  it('returns isCommand: false for regular messages', () => {
    const res = parseSlashCommand('Hello everyone!');
    expect(res.isCommand).toBe(false);
  });

  it('handles /help command', () => {
    const res = parseSlashCommand('/help');
    expect(res.isCommand).toBe(true);
    expect(res.command).toBe('help');
    expect(res.handledDirectly).toBe(true);
    expect(res.resultText).toContain('Developer Chat Commands');
  });

  it('handles /shrug command with and without message', () => {
    const plain = parseSlashCommand('/shrug');
    expect(plain.resultText).toBe('¯\\_(ツ)_/¯');

    const withText = parseSlashCommand('/shrug not my problem');
    expect(withText.resultText).toBe('not my problem ¯\\_(ツ)_/¯');
  });

  it('handles /code command wrapping', () => {
    const res = parseSlashCommand('/code python def add(a, b): return a + b');
    expect(res.isCommand).toBe(true);
    expect(res.resultText).toContain('```python');
    expect(res.resultText).toContain('def add(a, b): return a + b');
  });

  it('handles /json command pretty printing', () => {
    const valid = parseSlashCommand('/json {"name":"chitAbit","version":1}');
    expect(valid.isCommand).toBe(true);
    expect(valid.resultText).toContain('```json');
    expect(valid.resultText).toContain('"name": "chitAbit"');

    const invalid = parseSlashCommand('/json {not-valid-json}');
    expect(invalid.resultText).toContain('Invalid JSON syntax');
  });

  it('handles /time command', () => {
    const res = parseSlashCommand('/time');
    expect(res.isCommand).toBe(true);
    expect(res.resultText).toContain('Current Timestamps');
    expect(res.resultText).toContain('UTC');
  });

  it('handles /ask command for DevBot', () => {
    const res = parseSlashCommand('/ask how do I mock Socket.io in tests?');
    expect(res.isCommand).toBe(true);
    expect(res.isDevBotAsk).toBe(true);
    expect(res.askQuery).toBe('how do I mock Socket.io in tests?');
  });

  it('handles /clear command for client-side clear', () => {
    const res = parseSlashCommand('/clear');
    expect(res.isCommand).toBe(true);
    expect(res.isClientOnly).toBe(true);
  });
});
