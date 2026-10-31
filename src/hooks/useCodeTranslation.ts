import { useState, useCallback } from 'react';
import { translateSource as coreTranslate, hasNonAscii } from '@/lang/translator';
import { supabase } from '@/integrations/supabase/client';

/**
 * useCodeTranslation — Hybrid translator
 * ──────────────────────────────────────────────────────────────
 * 1. Synchronous dictionary + fuzzy match (instant, offline, free)
 * 2. If foreign-script characters STILL remain in code (not in
 *    strings/comments), call the `translate-fuzzy` edge function
 *    which uses the configured AI provider to rewrite the snippet.
 *
 * Stage 1 covers ~95% of cases. Stage 2 only fires for genuinely
 * novel phrasings the dictionary can't handle.
 */

export interface TranslationResult {
  translated: string;
  detectedLanguage: string;
  fromCache: boolean;
  usedAI?: boolean;
}

export interface TranslationState {
  isTranslating: boolean;
  lastResult: TranslationResult | null;
  error: string | null;
}

/** Returns true if the code (excluding strings/comments) still has non-ASCII letters. */
function hasForeignKeywordsLeft(code: string): boolean {
  const stripped = code
    .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '')
    .replace(/(\/\/|#)[^\n]*/g, '');
  return /[^\x00-\x7F]/.test(stripped) &&
    // ignore identifier-only foreign chars: detect words made entirely of foreign letters
    // that aren't part of an identifier-followed-by-paren style call.
    /[\u00A0-\uFFFF]{3,}/.test(stripped);
}

export function useCodeTranslation() {
  const [state, setState] = useState<TranslationState>({
    isTranslating: false,
    lastResult: null,
    error: null,
  });

  const translate = useCallback(async (
    code: string,
    sourceLanguage: string = 'auto',
    _forceRetranslate = false
  ): Promise<TranslationResult | null> => {
    if (!code.trim()) return null;
    setState(prev => ({ ...prev, isTranslating: true, error: null }));

    try {
      // ─── Stage 1: dictionary + fuzzy (synchronous, offline) ───
      const { translated, detectedLanguage } = coreTranslate(code, sourceLanguage);

      // ─── Stage 2: AI fallback if foreign words remain ───
      if (hasForeignKeywordsLeft(translated)) {
        try {
          const { data, error } = await supabase.functions.invoke('translate-fuzzy', {
            body: {
              code: translated,
              original: code,
              sourceLanguage: detectedLanguage ?? sourceLanguage,
            },
          });
          if (!error && data?.translated) {
            const result: TranslationResult = {
              translated: data.translated,
              detectedLanguage: detectedLanguage ?? 'auto',
              fromCache: false,
              usedAI: !!data.usedAI,
            };
            setState({ isTranslating: false, lastResult: result, error: null });
            return result;
          }
        } catch (aiErr) {
          // AI fallback is best-effort — never block the user.
          console.warn('AI translation fallback failed:', aiErr);
        }
      }

      const result: TranslationResult = {
        translated,
        detectedLanguage: detectedLanguage ?? 'English',
        fromCache: true,
        usedAI: false,
      };
      setState({ isTranslating: false, lastResult: result, error: null });
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState(prev => ({ ...prev, isTranslating: false, error: msg }));
      return null;
    }
  }, []);

  const clearLastResult = useCallback(() => {
    setState(prev => ({ ...prev, lastResult: null, error: null }));
  }, []);

  return { ...state, translate, clearLastResult };
}

// Heuristic: does this code likely contain non-English keywords?
export function mightNeedTranslation(code: string): boolean {
  if (hasNonAscii(code)) return true;
  return !/\b(forge|conjure|ponder|cycle|speak|yield|essence)\b/.test(code);
}
