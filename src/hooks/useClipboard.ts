import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseClipboardOptions {
  timeoutMs?: number;
}

export function useClipboard(options: UseClipboardOptions = {}) {
  const { timeoutMs = 1500 } = options;
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const copy = useCallback(
    async (text: string, id: string | number = 'default'): Promise<boolean> => {
      clearTimer();
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for non-secure contexts
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        setCopied(true);
        setCopiedId(id);
        timerRef.current = setTimeout(() => {
          setCopied(false);
          setCopiedId(null);
        }, timeoutMs);
        return true;
      } catch (err) {
        console.warn('Failed to copy to clipboard', err);
        setCopied(false);
        setCopiedId(null);
        return false;
      }
    },
    [clearTimer, timeoutMs]
  );

  const reset = useCallback(() => {
    clearTimer();
    setCopied(false);
    setCopiedId(null);
  }, [clearTimer]);

  return { copied, copiedId, copy, reset };
}
