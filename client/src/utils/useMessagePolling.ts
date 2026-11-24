import { useEffect } from 'react';
import type { Message } from '../types';

const PAGE_SIZE = 40;

export function useMessagePolling(
  path: string | undefined,
  onPage: (messages: Message[], initial: boolean) => void,
) {
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let running = false;
    let initial = true;
    let cursor = { created_at: 0, id: '' };

    async function poll() {
      if (running || controller.signal.aborted) return;
      clearTimeout(timeout);
      running = true;
      let catchUp = false;
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
        if (!initial) {
          params.set('after', String(cursor.created_at));
          params.set('afterId', cursor.id);
        }
        const response = await fetch(`${path}?${params}`, { signal: controller.signal });
        if (!response.ok) return;
        const { messages } = await response.json() as { messages: Message[] };
        if (controller.signal.aborted || !Array.isArray(messages)) return;
        if (initial || messages.length) onPage(messages, initial);
        const last = messages.at(-1);
        if (last) cursor = { created_at: last.created_at, id: last.id };
        catchUp = !initial && messages.length === PAGE_SIZE;
        initial = false;
      } catch (error) {
        if (!controller.signal.aborted) console.error('Message polling failed:', error);
      } finally {
        running = false;
        if (!controller.signal.aborted) {
          timeout = setTimeout(poll, document.hidden ? 15000 : catchUp ? 0 : 3500);
        }
      }
    }

    const visibilityChanged = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener('visibilitychange', visibilityChanged);
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [path, onPage]);
}
