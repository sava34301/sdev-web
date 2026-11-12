// Guards against regex patterns that can freeze the browser tab (catastrophic backtracking).
// Bounds pattern and text length and rejects nested quantifiers such as (a+)+ or (a|aa)*.
export const MAX_REGEX_PATTERN = 1000;
export const MAX_REGEX_TEXT = 200_000;

const NESTED_QUANTIFIER = /\((?:[^()\\]|\\.)*[+*}](?:[^()\\]|\\.)*\)\s*(?:[+*]|\{\d+,\d*\})/;
const ALTERNATION_REPEAT = /\((?:[^()\\]|\\.)*\|(?:[^()\\]|\\.)*\)\s*(?:[+*]|\{\d+,\d*\})/;

/** Returns an error message when the pattern/text are unsafe, otherwise null. */
export function regexProblem(pattern: string, text: string): string | null {
  if (pattern.length > MAX_REGEX_PATTERN) return `Pattern is too long (max ${MAX_REGEX_PATTERN} characters)`;
  if (text.length > MAX_REGEX_TEXT) return `Text is too long for a pattern search (max ${MAX_REGEX_TEXT} characters)`;
  if (NESTED_QUANTIFIER.test(pattern) || ALTERNATION_REPEAT.test(pattern)) {
    return 'Pattern repeats a group that itself repeats, which can freeze the page — simplify it';
  }
  return null;
}
