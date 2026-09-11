/**
 * sdev translator — v2 surface layer
 * ------------------------------------------------------------
 * The keyword tables in `translator.ts` were written against the
 * classic (v1) surface: forge / be / conjure / ponder / speak …
 *
 * sdev v2 — the self-hosted surface every dialect is built on —
 * uses the words in `dialect/catalog.ts`: set / to / say / if /
 * end / for each / while / return …
 *
 * Rather than duplicating 26 language tables, we derive the v2
 * table from the v1 table through `V1_TO_V2`, then layer a small
 * per-language `V2_EXTRA` table on top for words the v1 surface
 * simply does not have (end, each, with, has, does, ask, throw,
 * more, less, match, call).
 */

/** classic sdev keyword -> canonical sdev v2 keyword */
export const V1_TO_V2: Record<string, string> = {
  forge: 'set',
  be: 'to',
  conjure: 'to',
  yield: 'return',
  ponder: 'if',
  otherwise: 'else',
  cycle: 'while',
  iterate: 'for',
  through: 'in',
  within: 'in',
  yeet: 'break',
  skip: 'continue',
  speak: 'say',
  essence: 'kind',
  extend: 'extends',
  also: 'and',
  either: 'or',
  isnt: 'not',
  equals: 'is',
  differs: 'is not',
  yep: 'true',
  nope: 'false',
  void: 'nothing',
  summon: 'use',
  // unchanged between surfaces
  self: 'self',
  super: 'super',
  new: 'new',
  attempt: 'attempt',
  rescue: 'rescue',
  init: 'init',
  async: 'async',
  await: 'await',
  spawn: 'spawn',
};

/** Words that only exist on the v2 surface: foreign word -> canonical v2 word. */
export const V2_EXTRA: Record<string, Record<string, string>> = {
  Bulgarian: {
    'край': 'end', 'приключи': 'end', 'всеки': 'each', 'всяко': 'each',
    'всички': 'each', 'с': 'with', 'със': 'with', 'има': 'has',
    'съдържа': 'has', 'прави': 'does', 'изпълнява': 'does',
    'питай': 'ask', 'въведи': 'ask', 'хвърли': 'throw', 'хвърляй': 'throw',
    'повече': 'more', 'по_малко': 'less', 'съвпада': 'match', 'извикване_на': 'call',
  },
  Spanish: {
    'fin': 'end', 'terminar': 'end', 'cada': 'each', 'con': 'with',
    'tiene': 'has', 'hace': 'does', 'preguntar': 'ask', 'arrojar': 'throw',
    'más': 'more', 'menos': 'less', 'coincide': 'match', 'llamar': 'call',
  },
  French: {
    'fin': 'end', 'terminer': 'end', 'chaque': 'each', 'avec': 'with',
    'possède': 'has', 'fait': 'does', 'demander': 'ask', 'lever': 'throw',
    'plus': 'more', 'moins': 'less', 'correspond': 'match', 'appeler': 'call',
  },
  German: {
    'ende': 'end', 'jedes': 'each', 'jede': 'each', 'mit': 'with',
    'hat': 'has', 'macht': 'does', 'fragen': 'ask', 'werfen': 'throw',
    'mehr': 'more', 'weniger': 'less', 'abgleichen': 'match',
    'aufrufen': 'call', 'abbrechen': 'break', 'weiter': 'continue',
  },
  Portuguese: {
    'fim': 'end', 'cada': 'each', 'com': 'with', 'tem': 'has',
    'faz': 'does', 'perguntar': 'ask', 'arremessar': 'throw',
    'mais': 'more', 'menos': 'less', 'corresponde': 'match', 'chamar': 'call',
  },
  Italian: {
    'fine': 'end', 'ogni': 'each', 'con': 'with', 'possiede': 'has',
    'esegue': 'does', 'chiedere': 'ask', 'sollevare': 'throw',
    'più': 'more', 'meno': 'less', 'corrisponde': 'match', 'chiamare': 'call',
  },
  Dutch: {
    'einde': 'end', 'elke': 'each', 'elk': 'each', 'met': 'with',
    'heeft': 'has', 'doet': 'does', 'vragen': 'ask', 'werpen': 'throw',
    'meer': 'more', 'minder': 'less', 'komt_overeen': 'match', 'oproep': 'call',
  },
  Russian: {
    'конец': 'end', 'каждый': 'each', 'каждое': 'each', 'с': 'with',
    'имеет': 'has', 'делает': 'does', 'спросить': 'ask', 'выбросить': 'throw',
    'больше': 'more', 'меньше': 'less', 'совпадает': 'match', 'вызов': 'call',
  },
};

/** BCP-47-ish tag -> translator language name (dialects declare tags). */
export const TAG_TO_LANGUAGE: Record<string, string> = {
  bg: 'Bulgarian', ru: 'Russian', es: 'Spanish', fr: 'French',
  de: 'German', pt: 'Portuguese', it: 'Italian', nl: 'Dutch',
  pl: 'Polish', uk: 'Ukrainian', tr: 'Turkish', ar: 'Arabic',
  hi: 'Hindi', ja: 'Japanese', zh: 'Chinese', ko: 'Korean',
  el: 'Greek', sv: 'Swedish', no: 'Norwegian', da: 'Danish',
  fi: 'Finnish', cs: 'Czech', ro: 'Romanian', hu: 'Hungarian',
  he: 'Hebrew', id: 'Indonesian', vi: 'Vietnamese', th: 'Thai',
  en: 'English',
};
