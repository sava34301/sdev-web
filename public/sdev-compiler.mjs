#!/usr/bin/env node
// sdev compiler & runtime v4.0 — Interpreter-first, full feature parity
// Bundled, self-contained CLI. Generated from scripts/build-compiler.ts

// src/lang/tokens.ts
var KEYWORDS = {
  "forge": "FORGE" /* FORGE */,
  "conjure": "CONJURE" /* CONJURE */,
  "ponder": "PONDER" /* PONDER */,
  "otherwise": "OTHERWISE" /* OTHERWISE */,
  "cycle": "CYCLE" /* CYCLE */,
  "iterate": "ITERATE" /* ITERATE */,
  "through": "THROUGH" /* THROUGH */,
  "within": "WITHIN" /* WITHIN */,
  "be": "BE" /* BE */,
  "yield": "YIELD" /* YIELD */,
  "yeet": "YEET" /* YEET */,
  "skip": "SKIP" /* SKIP */,
  "yep": "YEP" /* YEP */,
  "nope": "NOPE" /* NOPE */,
  "void": "VOID" /* VOID */,
  "also": "ALSO" /* ALSO */,
  "either": "EITHER" /* EITHER */,
  "isnt": "ISNT" /* ISNT */,
  "equals": "EQUALS" /* EQUALS */,
  "differs": "DIFFERS" /* DIFFERS */,
  "summon": "SUMMON" /* SUMMON */,
  "attempt": "ATTEMPT" /* ATTEMPT */,
  "rescue": "RESCUE" /* RESCUE */,
  "extend": "EXTEND" /* EXTEND */,
  "new": "NEW" /* NEW */,
  "self": "SELF" /* SELF */,
  "super": "SUPER" /* SUPER */,
  "async": "ASYNC" /* ASYNC */,
  "await": "AWAIT" /* AWAIT */
  // NOTE: 'essence' is intentionally NOT a keyword here so it can be used as
  // both a statement keyword (class declaration) AND a function name (type checker).
  // The parser handles 'essence' as a contextual keyword via IDENTIFIER.
};

// src/lang/errors.ts
var SdevError = class extends Error {
  line;
  column;
  constructor(message, line, column) {
    const location = column ? `[line ${line}, col ${column}]` : `[line ${line}]`;
    super(`${location} ${message}`);
    this.name = "SdevError";
    this.line = line;
    this.column = column;
  }
};
var ReturnException = class {
  value;
  constructor(value) {
    this.value = value;
  }
};

// src/lang/translator.ts
var KEYWORD_TABLES = {
  Spanish: {
    "forjar": "forge",
    "ser": "be",
    "conjurar": "conjure",
    "rendir": "yield",
    "ponderar": "ponder",
    "sino": "otherwise",
    "ciclo": "cycle",
    "iterar": "iterate",
    "trav\xE9s": "through",
    "por": "through",
    "dentro": "within",
    "lanzar": "yeet",
    "saltar": "skip",
    "hablar": "speak",
    "mostrar": "speak",
    "decir": "speak",
    "esencia": "essence",
    "extender": "extend",
    "propio": "self",
    "padre": "super",
    "nuevo": "new",
    "intento": "attempt",
    "intentar": "attempt",
    "rescatar": "rescue",
    "tambi\xE9n": "also",
    "cualquiera": "either",
    "o": "either",
    "no_es": "isnt",
    "igual": "equals",
    "difiere": "differs",
    "s\xED": "yep",
    "no": "nope",
    "vac\xEDo": "void",
    "invocar": "summon",
    "as\xEDncrono": "async",
    "esperar": "await",
    "generar": "spawn",
    "verdadero": "yep",
    "falso": "nope",
    "nulo": "void",
    "clase": "essence",
    "retornar": "yield",
    "devolver": "yield",
    "mientras": "cycle",
    "para": "iterate",
    "si": "ponder",
    "romper": "yeet",
    "continuar": "skip",
    "y": "also",
    "importar": "summon",
    "funci\xF3n": "conjure",
    "crear": "new"
  },
  French: {
    "forger": "forge",
    "\xEAtre": "be",
    "est": "be",
    "\xE9voquer": "conjure",
    "rendre": "yield",
    "retourner": "yield",
    "r\xE9fl\xE9chir": "ponder",
    "si": "ponder",
    "sinon": "otherwise",
    "boucle": "cycle",
    "tantque": "cycle",
    "it\xE9rer": "iterate",
    "pour": "iterate",
    "\xE0_travers": "through",
    "dans": "within",
    "jeter": "yeet",
    "sauter": "skip",
    "parler": "speak",
    "dire": "speak",
    "afficher": "speak",
    "classe": "essence",
    "\xE9tendre": "extend",
    "soi": "self",
    "parent": "super",
    "nouveau": "new",
    "essayer": "attempt",
    "tenter": "attempt",
    "secourir": "rescue",
    "attraper": "rescue",
    "aussi": "also",
    "et": "also",
    "soit": "either",
    "ou": "either",
    "nest_pas": "isnt",
    "pas": "isnt",
    "\xE9gal": "equals",
    "diff\xE8re": "differs",
    "oui": "yep",
    "vrai": "yep",
    "non": "nope",
    "faux": "nope",
    "vide": "void",
    "nul": "void",
    "invoquer": "summon",
    "importer": "summon",
    "asynchrone": "async",
    "attendre": "await",
    "engendrer": "spawn",
    "fonction": "conjure",
    "cr\xE9er": "new"
  },
  German: {
    "schmieden": "forge",
    "erstellen": "forge",
    "sein": "be",
    "ist": "be",
    "beschw\xF6ren": "conjure",
    "funktion": "conjure",
    "ergeben": "yield",
    "zur\xFCckgeben": "yield",
    "\xFCberlegen": "ponder",
    "wenn": "ponder",
    "sonst": "otherwise",
    "ansonsten": "otherwise",
    "schleife": "cycle",
    "solange": "cycle",
    "iterieren": "iterate",
    "f\xFCr": "iterate",
    "durch": "through",
    "innerhalb": "within",
    "werfen": "yeet",
    "\xFCberspringen": "skip",
    "sprechen": "speak",
    "sagen": "speak",
    "ausgeben": "speak",
    "zeigen": "speak",
    "wesen": "essence",
    "klasse": "essence",
    "erweitern": "extend",
    "selbst": "self",
    "eltern": "super",
    "neu": "new",
    "versuch": "attempt",
    "versuchen": "attempt",
    "retten": "rescue",
    "fangen": "rescue",
    "auch": "also",
    "und": "also",
    "oder": "either",
    "nicht": "isnt",
    "gleich": "equals",
    "unterscheidet": "differs",
    "ja": "yep",
    "wahr": "yep",
    "nein": "nope",
    "falsch": "nope",
    "leer": "void",
    "null": "void",
    "herbeirufen": "summon",
    "importieren": "summon",
    "asynchron": "async",
    "warten": "await",
    "erzeugen": "spawn"
  },
  Portuguese: {
    "forjar": "forge",
    "criar": "forge",
    "ser": "be",
    "\xE9": "be",
    "conjurar": "conjure",
    "fun\xE7\xE3o": "conjure",
    "render": "yield",
    "retornar": "yield",
    "devolver": "yield",
    "ponderar": "ponder",
    "se": "ponder",
    "sen\xE3o": "otherwise",
    "ciclo": "cycle",
    "enquanto": "cycle",
    "iterar": "iterate",
    "para": "iterate",
    "atrav\xE9s": "through",
    "dentro": "within",
    "em": "within",
    "lan\xE7ar": "yeet",
    "pular": "skip",
    "falar": "speak",
    "mostrar": "speak",
    "exibir": "speak",
    "dizer": "speak",
    "ess\xEAncia": "essence",
    "classe": "essence",
    "estender": "extend",
    "pr\xF3prio": "self",
    "pai": "super",
    "novo": "new",
    "tentar": "attempt",
    "resgatar": "rescue",
    "capturar": "rescue",
    "tamb\xE9m": "also",
    "e": "also",
    "ou": "either",
    "n\xE3o_\xE9": "isnt",
    "igual": "equals",
    "difere": "differs",
    "sim": "yep",
    "verdadeiro": "yep",
    "n\xE3o": "nope",
    "falso": "nope",
    "vazio": "void",
    "nulo": "void",
    "invocar": "summon",
    "importar": "summon",
    "ass\xEDncrono": "async",
    "aguardar": "await",
    "gerar": "spawn"
  },
  Italian: {
    "forgiare": "forge",
    "creare": "forge",
    "essere": "be",
    "\xE8": "be",
    "evocare": "conjure",
    "funzione": "conjure",
    "cedere": "yield",
    "restituire": "yield",
    "ritornare": "yield",
    "ponderare": "ponder",
    "se": "ponder",
    "altrimenti": "otherwise",
    "ciclo": "cycle",
    "mentre": "cycle",
    "iterare": "iterate",
    "per": "iterate",
    "attraverso": "through",
    "dentro": "within",
    "in": "within",
    "lanciare": "yeet",
    "saltare": "skip",
    "parlare": "speak",
    "mostrare": "speak",
    "dire": "speak",
    "stampare": "speak",
    "essenza": "essence",
    "classe": "essence",
    "estendere": "extend",
    "s\xE9": "self",
    "genitore": "super",
    "nuovo": "new",
    "tentare": "attempt",
    "provare": "attempt",
    "salvare": "rescue",
    "catturare": "rescue",
    "anche": "also",
    "e": "also",
    "oppure": "either",
    "o": "either",
    "non_\xE8": "isnt",
    "uguale": "equals",
    "diverso": "differs",
    "s\xEC": "yep",
    "vero": "yep",
    "no": "nope",
    "falso": "nope",
    "vuoto": "void",
    "nullo": "void",
    "invocare": "summon",
    "importare": "summon",
    "asincrono": "async",
    "attendere": "await",
    "generare": "spawn"
  },
  Dutch: {
    "smeden": "forge",
    "maken": "forge",
    "zijn": "be",
    "is": "be",
    "oproepen": "conjure",
    "functie": "conjure",
    "opleveren": "yield",
    "teruggeven": "yield",
    "overdenken": "ponder",
    "als": "ponder",
    "anders": "otherwise",
    "lus": "cycle",
    "zolang": "cycle",
    "itereren": "iterate",
    "voor": "iterate",
    "door": "through",
    "binnen": "within",
    "in": "within",
    "gooien": "yeet",
    "overslaan": "skip",
    "spreken": "speak",
    "zeggen": "speak",
    "tonen": "speak",
    "wezen": "essence",
    "klasse": "essence",
    "uitbreiden": "extend",
    "zelf": "self",
    "ouder": "super",
    "nieuw": "new",
    "proberen": "attempt",
    "redden": "rescue",
    "vangen": "rescue",
    "ook": "also",
    "en": "also",
    "of": "either",
    "niet": "isnt",
    "gelijk": "equals",
    "verschilt": "differs",
    "ja": "yep",
    "waar": "yep",
    "nee": "nope",
    "onwaar": "nope",
    "leeg": "void",
    "nul": "void",
    "aanroepen": "summon",
    "importeren": "summon",
    "asynchroon": "async",
    "wachten": "await",
    "voortbrengen": "spawn"
  },
  Russian: {
    "\u043A\u043E\u0432\u0430\u0442\u044C": "forge",
    "\u0441\u043E\u0437\u0434\u0430\u0442\u044C": "forge",
    "\u0431\u044B\u0442\u044C": "be",
    "\u0435\u0441\u0442\u044C": "be",
    "\u0432\u044B\u0437\u0432\u0430\u0442\u044C": "conjure",
    "\u0444\u0443\u043D\u043A\u0446\u0438\u044F": "conjure",
    "\u0432\u0435\u0440\u043D\u0443\u0442\u044C": "yield",
    "\u043E\u0431\u0434\u0443\u043C\u0430\u0442\u044C": "ponder",
    "\u0435\u0441\u043B\u0438": "ponder",
    "\u0438\u043D\u0430\u0447\u0435": "otherwise",
    "\u0446\u0438\u043A\u043B": "cycle",
    "\u043F\u043E\u043A\u0430": "cycle",
    "\u043F\u0435\u0440\u0435\u0431\u0440\u0430\u0442\u044C": "iterate",
    "\u0434\u043B\u044F": "iterate",
    "\u0447\u0435\u0440\u0435\u0437": "through",
    "\u0432\u043D\u0443\u0442\u0440\u0438": "within",
    "\u0432": "within",
    "\u0431\u0440\u043E\u0441\u0438\u0442\u044C": "yeet",
    "\u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C": "skip",
    "\u0441\u043A\u0430\u0437\u0430\u0442\u044C": "speak",
    "\u0433\u043E\u0432\u043E\u0440\u0438\u0442\u044C": "speak",
    "\u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C": "speak",
    "\u0432\u044B\u0432\u0435\u0441\u0442\u0438": "speak",
    "\u043F\u0435\u0447\u0430\u0442\u044C": "speak",
    "\u0441\u0443\u0449\u043D\u043E\u0441\u0442\u044C": "essence",
    "\u043A\u043B\u0430\u0441\u0441": "essence",
    "\u0440\u0430\u0441\u0448\u0438\u0440\u0438\u0442\u044C": "extend",
    "\u0441\u0435\u0431\u044F": "self",
    "\u043F\u0440\u0435\u0434\u043E\u043A": "super",
    "\u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044C": "super",
    "\u043D\u043E\u0432\u044B\u0439": "new",
    "\u043F\u043E\u043F\u044B\u0442\u043A\u0430": "attempt",
    "\u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C": "attempt",
    "\u0441\u043F\u0430\u0441\u0442\u0438": "rescue",
    "\u043F\u043E\u0439\u043C\u0430\u0442\u044C": "rescue",
    "\u0442\u0430\u043A\u0436\u0435": "also",
    "\u0438": "also",
    "\u0438\u043B\u0438": "either",
    "\u043D\u0435": "isnt",
    "\u0440\u0430\u0432\u043D\u043E": "equals",
    "\u043E\u0442\u043B\u0438\u0447\u0430\u0435\u0442\u0441\u044F": "differs",
    "\u0434\u0430": "yep",
    "\u0438\u0441\u0442\u0438\u043D\u0430": "yep",
    "\u043D\u0435\u0442": "nope",
    "\u043B\u043E\u0436\u044C": "nope",
    "\u043F\u0443\u0441\u0442\u043E": "void",
    "\u043D\u0438\u0447\u0442\u043E": "void",
    "\u043F\u0440\u0438\u0437\u0432\u0430\u0442\u044C": "summon",
    "\u0438\u043C\u043F\u043E\u0440\u0442": "summon",
    "\u0430\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u043D\u044B\u0439": "async",
    "\u0436\u0434\u0430\u0442\u044C": "await",
    "\u043F\u043E\u0440\u043E\u0434\u0438\u0442\u044C": "spawn"
  },
  Chinese: {
    "\u94F8\u9020": "forge",
    "\u521B\u5EFA": "forge",
    "\u662F": "be",
    "\u8D4B\u503C": "be",
    "\u53EC\u5524": "conjure",
    "\u51FD\u6570": "conjure",
    "\u4EA7\u51FA": "yield",
    "\u8FD4\u56DE": "yield",
    "\u601D\u8003": "ponder",
    "\u5982\u679C": "ponder",
    "\u5426\u5219": "otherwise",
    "\u5FAA\u73AF": "cycle",
    "\u5F53": "cycle",
    "\u904D\u5386": "iterate",
    "\u4E3A": "iterate",
    "\u901A\u8FC7": "through",
    "\u5728\u5185": "within",
    "\u5728": "within",
    "\u629B\u51FA": "yeet",
    "\u8DF3\u8FC7": "skip",
    "\u8BF4": "speak",
    "\u8F93\u51FA": "speak",
    "\u6253\u5370": "speak",
    "\u663E\u793A": "speak",
    "\u672C\u8D28": "essence",
    "\u7C7B": "essence",
    "\u6269\u5C55": "extend",
    "\u81EA\u5DF1": "self",
    "\u7236\u7C7B": "super",
    "\u65B0": "new",
    "\u5C1D\u8BD5": "attempt",
    "\u62EF\u6551": "rescue",
    "\u6355\u83B7": "rescue",
    "\u5E76\u4E14": "also",
    "\u548C": "also",
    "\u6216\u8005": "either",
    "\u6216": "either",
    "\u4E0D\u662F": "isnt",
    "\u7B49\u4E8E": "equals",
    "\u4E0D\u540C": "differs",
    "\u662F\u7684": "yep",
    "\u771F": "yep",
    "\u4E0D": "nope",
    "\u5047": "nope",
    "\u7A7A": "void",
    "\u65E0": "void",
    "\u5BFC\u5165": "summon",
    "\u5F02\u6B65": "async",
    "\u7B49\u5F85": "await",
    "\u751F\u6210": "spawn"
  },
  Japanese: {
    "\u935B\u9020": "forge",
    "\u4F5C\u6210": "forge",
    "\u3067\u3042\u308B": "be",
    "\u306F": "be",
    "\u53EC\u559A": "conjure",
    "\u95A2\u6570": "conjure",
    "\u8FD4\u3059": "yield",
    "\u8003\u3048\u308B": "ponder",
    "\u3082\u3057": "ponder",
    "\u305D\u308C\u4EE5\u5916": "otherwise",
    "\u30EB\u30FC\u30D7": "cycle",
    "\u9593": "cycle",
    "\u53CD\u5FA9": "iterate",
    "\u7E70\u308A\u8FD4\u3059": "iterate",
    "\u901A\u3057\u3066": "through",
    "\u306E\u4E2D\u3067": "within",
    "\u6295\u3052\u308B": "yeet",
    "\u30B9\u30AD\u30C3\u30D7": "skip",
    "\u8A00\u3046": "speak",
    "\u8868\u793A": "speak",
    "\u51FA\u529B": "speak",
    "\u5370\u5237": "speak",
    "\u672C\u8CEA": "essence",
    "\u30AF\u30E9\u30B9": "essence",
    "\u62E1\u5F35": "extend",
    "\u81EA\u5206": "self",
    "\u89AA": "super",
    "\u65B0\u3057\u3044": "new",
    "\u8A66\u3059": "attempt",
    "\u6551\u51FA": "rescue",
    "\u307E\u305F": "also",
    "\u304B\u3064": "also",
    "\u307E\u305F\u306F": "either",
    "\u3067\u306F\u306A\u3044": "isnt",
    "\u7B49\u3057\u3044": "equals",
    "\u7570\u306A\u308B": "differs",
    "\u306F\u3044": "yep",
    "\u771F": "yep",
    "\u3044\u3044\u3048": "nope",
    "\u507D": "nope",
    "\u7A7A": "void",
    "\u30A4\u30F3\u30DD\u30FC\u30C8": "summon",
    "\u975E\u540C\u671F": "async",
    "\u5F85\u3064": "await",
    "\u751F\u6210": "spawn"
  },
  Korean: {
    "\uB2E8\uC870": "forge",
    "\uB9CC\uB4E4\uB2E4": "forge",
    "\uC774\uB2E4": "be",
    "\uC18C\uD658": "conjure",
    "\uD568\uC218": "conjure",
    "\uBC18\uD658": "yield",
    "\uB3CC\uB824\uC8FC\uB2E4": "yield",
    "\uC0DD\uAC01": "ponder",
    "\uB9CC\uC57D": "ponder",
    "\uC544\uB2C8\uBA74": "otherwise",
    "\uC21C\uD658": "cycle",
    "\uB3D9\uC548": "cycle",
    "\uBC18\uBCF5": "iterate",
    "\uC704\uD574": "iterate",
    "\uD1B5\uD574": "through",
    "\uC548\uC5D0\uC11C": "within",
    "\uB358\uC9C0\uB2E4": "yeet",
    "\uAC74\uB108\uB6F0\uAE30": "skip",
    "\uB9D0\uD558\uB2E4": "speak",
    "\uCD9C\uB825": "speak",
    "\uBCF4\uC5EC\uC8FC\uB2E4": "speak",
    "\uBCF8\uC9C8": "essence",
    "\uD074\uB798\uC2A4": "essence",
    "\uD655\uC7A5": "extend",
    "\uC790\uC2E0": "self",
    "\uBD80\uBAA8": "super",
    "\uC0C8": "new",
    "\uC0C8\uB85C\uC6B4": "new",
    "\uC2DC\uB3C4": "attempt",
    "\uAD6C\uCD9C": "rescue",
    "\uADF8\uB9AC\uACE0": "also",
    "\uB610\uB294": "either",
    "\uC544\uB2C8\uB2E4": "isnt",
    "\uAC19\uB2E4": "equals",
    "\uB2E4\uB974\uB2E4": "differs",
    "\uC608": "yep",
    "\uCC38": "yep",
    "\uC544\uB2C8\uC624": "nope",
    "\uAC70\uC9D3": "nope",
    "\uBE44\uC5B4\uC788\uB2E4": "void",
    "\uAC00\uC838\uC624\uAE30": "summon",
    "\uBE44\uB3D9\uAE30": "async",
    "\uAE30\uB2E4\uB9AC\uB2E4": "await",
    "\uC0DD\uC131": "spawn"
  },
  Arabic: {
    "\u0635\u0646\u0639": "forge",
    "\u0625\u0646\u0634\u0627\u0621": "forge",
    "\u064A\u0643\u0648\u0646": "be",
    "\u0647\u0648": "be",
    "\u0627\u0633\u062A\u062F\u0639\u0627\u0621": "conjure",
    "\u062F\u0627\u0644\u0629": "conjure",
    "\u0625\u0631\u062C\u0627\u0639": "yield",
    "\u0631\u062F": "yield",
    "\u062A\u0623\u0645\u0644": "ponder",
    "\u0625\u0630\u0627": "ponder",
    "\u0648\u0625\u0644\u0627": "otherwise",
    "\u062E\u0644\u0627\u0641": "otherwise",
    "\u062D\u0644\u0642\u0629": "cycle",
    "\u0637\u0627\u0644\u0645\u0627": "cycle",
    "\u062A\u0643\u0631\u0627\u0631": "iterate",
    "\u0644\u0643\u0644": "iterate",
    "\u0639\u0628\u0631": "through",
    "\u062E\u0644\u0627\u0644": "through",
    "\u062F\u0627\u062E\u0644": "within",
    "\u0641\u064A": "within",
    "\u0631\u0645\u064A": "yeet",
    "\u062A\u062E\u0637\u064A": "skip",
    "\u0642\u0644": "speak",
    "\u062A\u062D\u062F\u062B": "speak",
    "\u0627\u0637\u0628\u0639": "speak",
    "\u0627\u0639\u0631\u0636": "speak",
    "\u062C\u0648\u0647\u0631": "essence",
    "\u0641\u0626\u0629": "essence",
    "\u0635\u0646\u0641": "essence",
    "\u062A\u0648\u0633\u064A\u0639": "extend",
    "\u0630\u0627\u062A": "self",
    "\u0646\u0641\u0633": "self",
    "\u0623\u0628": "super",
    "\u062C\u062F\u064A\u062F": "new",
    "\u0645\u062D\u0627\u0648\u0644\u0629": "attempt",
    "\u062D\u0627\u0648\u0644": "attempt",
    "\u0625\u0646\u0642\u0627\u0630": "rescue",
    "\u0627\u0644\u062A\u0642\u0627\u0637": "rescue",
    "\u0623\u064A\u0636\u0627": "also",
    "\u0648": "also",
    "\u0623\u0648": "either",
    "\u0644\u064A\u0633": "isnt",
    "\u064A\u0633\u0627\u0648\u064A": "equals",
    "\u064A\u062E\u062A\u0644\u0641": "differs",
    "\u0646\u0639\u0645": "yep",
    "\u0635\u062D\u064A\u062D": "yep",
    "\u0644\u0627": "nope",
    "\u062E\u0637\u0623": "nope",
    "\u0641\u0627\u0631\u063A": "void",
    "\u0639\u062F\u0645": "void",
    "\u0627\u0633\u062A\u064A\u0631\u0627\u062F": "summon",
    "\u063A\u064A\u0631_\u0645\u062A\u0632\u0627\u0645\u0646": "async",
    "\u0627\u0646\u062A\u0638\u0627\u0631": "await",
    "\u062A\u0648\u0644\u064A\u062F": "spawn"
  },
  Hindi: {
    "\u0917\u0922\u093C\u0928\u093E": "forge",
    "\u092C\u0928\u093E\u0928\u093E": "forge",
    "\u0939\u094B\u0928\u093E": "be",
    "\u0939\u0948": "be",
    "\u092C\u0941\u0932\u093E\u0928\u093E": "conjure",
    "\u092B\u0932\u0928": "conjure",
    "\u0915\u093E\u0930\u094D\u092F": "conjure",
    "\u0932\u094C\u091F\u093E\u0928\u093E": "yield",
    "\u0935\u093E\u092A\u0938\u0940": "yield",
    "\u0938\u094B\u091A\u0928\u093E": "ponder",
    "\u0905\u0917\u0930": "ponder",
    "\u092F\u0926\u093F": "ponder",
    "\u0935\u0930\u0928\u093E": "otherwise",
    "\u0905\u0928\u094D\u092F\u0925\u093E": "otherwise",
    "\u091A\u0915\u094D\u0930": "cycle",
    "\u091C\u092C\u0924\u0915": "cycle",
    "\u0926\u094B\u0939\u0930\u093E\u0928\u093E": "iterate",
    "\u0939\u0947\u0924\u0941": "iterate",
    "\u0926\u094D\u0935\u093E\u0930\u093E": "through",
    "\u0905\u0902\u0926\u0930": "within",
    "\u092E\u0947\u0902": "within",
    "\u092B\u0947\u0902\u0915\u0928\u093E": "yeet",
    "\u091B\u094B\u0921\u093C\u0928\u093E": "skip",
    "\u092C\u094B\u0932\u0928\u093E": "speak",
    "\u0926\u093F\u0916\u093E\u0928\u093E": "speak",
    "\u091B\u093E\u092A\u0928\u093E": "speak",
    "\u0938\u093E\u0930": "essence",
    "\u0935\u0930\u094D\u0917": "essence",
    "\u0935\u093F\u0938\u094D\u0924\u093E\u0930": "extend",
    "\u0938\u094D\u0935\u092F\u0902": "self",
    "\u0905\u092D\u093F\u092D\u093E\u0935\u0915": "super",
    "\u0928\u092F\u093E": "new",
    "\u092A\u094D\u0930\u092F\u093E\u0938": "attempt",
    "\u0915\u094B\u0936\u093F\u0936": "attempt",
    "\u092C\u091A\u093E\u0928\u093E": "rescue",
    "\u092A\u0915\u0921\u093C\u0928\u093E": "rescue",
    "\u092D\u0940": "also",
    "\u0914\u0930": "also",
    "\u092F\u093E": "either",
    "\u0928\u0939\u0940\u0902": "isnt",
    "\u092C\u0930\u093E\u092C\u0930": "equals",
    "\u092D\u093F\u0928\u094D\u0928": "differs",
    "\u0939\u093E\u0902": "yep",
    "\u0938\u0924\u094D\u092F": "yep",
    "\u0905\u0938\u0924\u094D\u092F": "nope",
    "\u0930\u093F\u0915\u094D\u0924": "void",
    "\u0936\u0942\u0928\u094D\u092F": "void",
    "\u0906\u092F\u093E\u0924": "summon",
    "\u0905\u0938\u092E\u0915\u093E\u0932\u093F\u0915": "async",
    "\u092A\u094D\u0930\u0924\u0940\u0915\u094D\u0937\u093E": "await",
    "\u0909\u0924\u094D\u092A\u0928\u094D\u0928": "spawn"
  },
  Turkish: {
    "d\xF6vmek": "forge",
    "olu\u015Ftur": "forge",
    "olmak": "be",
    "olsun": "be",
    "\xE7a\u011F\u0131r": "conjure",
    "fonksiyon": "conjure",
    "i\u015Flev": "conjure",
    "d\xF6nd\xFCr": "yield",
    "ver": "yield",
    "d\xFC\u015F\xFCn": "ponder",
    "e\u011Fer": "ponder",
    "yoksa": "otherwise",
    "de\u011Filse": "otherwise",
    "d\xF6ng\xFC": "cycle",
    "iken": "cycle",
    "tekrarla": "iterate",
    "i\xE7in": "iterate",
    "boyunca": "through",
    "i\xE7inde": "within",
    "at": "yeet",
    "atla": "skip",
    "s\xF6yle": "speak",
    "g\xF6ster": "speak",
    "yazd\u0131r": "speak",
    "\xF6z": "essence",
    "s\u0131n\u0131f": "essence",
    "geni\u015Flet": "extend",
    "kendi": "self",
    "\xFCst": "super",
    "yeni": "new",
    "dene": "attempt",
    "kurtar": "rescue",
    "yakala": "rescue",
    "da": "also",
    "ve": "also",
    "veya": "either",
    "de\u011Fil": "isnt",
    "e\u015Fit": "equals",
    "farkl\u0131": "differs",
    "evet": "yep",
    "do\u011Fru": "yep",
    "hay\u0131r": "nope",
    "yanl\u0131\u015F": "nope",
    "bo\u015F": "void",
    "\xE7a\u011F\u0131rmak": "summon",
    "i\xE7eaktar": "summon",
    "e\u015Fzamans\u0131z": "async",
    "bekle": "await",
    "\xFCret": "spawn"
  },
  Polish: {
    "ku\u0107": "forge",
    "utw\xF3rz": "forge",
    "by\u0107": "be",
    "jest": "be",
    "przywo\u0142aj": "summon",
    "funkcja": "conjure",
    "zwr\xF3\u0107": "yield",
    "oddaj": "yield",
    "rozwa\u017C": "ponder",
    "je\u015Bli": "ponder",
    "je\u017Celi": "ponder",
    "inaczej": "otherwise",
    "p\u0119tla": "cycle",
    "dop\xF3ki": "cycle",
    "iteruj": "iterate",
    "dla": "iterate",
    "przez": "through",
    "wewn\u0105trz": "within",
    "w": "within",
    "rzu\u0107": "yeet",
    "pomi\u0144": "skip",
    "m\xF3w": "speak",
    "powiedz": "speak",
    "poka\u017C": "speak",
    "wypisz": "speak",
    "istota": "essence",
    "klasa": "essence",
    "rozszerz": "extend",
    "sam": "self",
    "rodzic": "super",
    "nowy": "new",
    "nowe": "new",
    "pr\xF3buj": "attempt",
    "spr\xF3buj": "attempt",
    "ratuj": "rescue",
    "z\u0142ap": "rescue",
    "te\u017C": "also",
    "i": "also",
    "lub": "either",
    "albo": "either",
    "nie": "isnt",
    "r\xF3wne": "equals",
    "r\xF3\u017Cni": "differs",
    "tak": "yep",
    "prawda": "yep",
    "fa\u0142sz": "nope",
    "pusty": "void",
    "importuj": "summon",
    "asynchroniczny": "async",
    "czekaj": "await",
    "stw\xF3rz": "spawn"
  },
  Swedish: {
    "smida": "forge",
    "skapa": "forge",
    "vara": "be",
    "\xE4r": "be",
    "framkalla": "conjure",
    "funktion": "conjure",
    "ge": "yield",
    "returnera": "yield",
    "fundera": "ponder",
    "om": "ponder",
    "annars": "otherwise",
    "slinga": "cycle",
    "medan": "cycle",
    "iterera": "iterate",
    "f\xF6r": "iterate",
    "genom": "through",
    "inom": "within",
    "i": "within",
    "kasta": "yeet",
    "hoppa": "skip",
    "tala": "speak",
    "visa": "speak",
    "skriv": "speak",
    "v\xE4sen": "essence",
    "klass": "essence",
    "ut\xF6ka": "extend",
    "sj\xE4lv": "self",
    "f\xF6r\xE4lder": "super",
    "ny": "new",
    "f\xF6rs\xF6k": "attempt",
    "r\xE4dda": "rescue",
    "f\xE5nga": "rescue",
    "ocks\xE5": "also",
    "och": "also",
    "eller": "either",
    "inte": "isnt",
    "lika": "equals",
    "skiljer": "differs",
    "ja": "yep",
    "sant": "yep",
    "nej": "nope",
    "falskt": "nope",
    "tom": "void",
    "\xE5kalla": "summon",
    "importera": "summon",
    "asynkron": "async",
    "v\xE4nta": "await",
    "skapa_process": "spawn"
  },
  Norwegian: {
    "smi": "forge",
    "lage": "forge",
    "v\xE6re": "be",
    "er": "be",
    "fremkalle": "conjure",
    "funksjon": "conjure",
    "gi": "yield",
    "returnere": "yield",
    "tenke": "ponder",
    "hvis": "ponder",
    "ellers": "otherwise",
    "sl\xF8yfe": "cycle",
    "mens": "cycle",
    "iterere": "iterate",
    "for": "iterate",
    "gjennom": "through",
    "innen": "within",
    "i": "within",
    "kaste": "yeet",
    "hoppe": "skip",
    "snakke": "speak",
    "vise": "speak",
    "skriv": "speak",
    "vesen": "essence",
    "klasse": "essence",
    "utvide": "extend",
    "selv": "self",
    "forelder": "super",
    "ny": "new",
    "fors\xF8k": "attempt",
    "redde": "rescue",
    "fange": "rescue",
    "ogs\xE5": "also",
    "og": "also",
    "eller": "either",
    "ikke": "isnt",
    "lik": "equals",
    "forskjellig": "differs",
    "ja": "yep",
    "sant": "yep",
    "nei": "nope",
    "usant": "nope",
    "tom": "void",
    "p\xE5kalle": "summon",
    "importere": "summon",
    "asynkron": "async",
    "vente": "await",
    "starte": "spawn"
  },
  Danish: {
    "smede": "forge",
    "skabe": "forge",
    "v\xE6re": "be",
    "er": "be",
    "fremkalde": "conjure",
    "funktion": "conjure",
    "give": "yield",
    "returnere": "yield",
    "overveje": "ponder",
    "hvis": "ponder",
    "ellers": "otherwise",
    "sl\xF8jfe": "cycle",
    "mens": "cycle",
    "iterere": "iterate",
    "for": "iterate",
    "igennem": "through",
    "inden": "within",
    "i": "within",
    "kaste": "yeet",
    "springe": "skip",
    "tale": "speak",
    "vise": "speak",
    "skriv": "speak",
    "v\xE6sen": "essence",
    "klasse": "essence",
    "udvide": "extend",
    "selv": "self",
    "for\xE6lder": "super",
    "ny": "new",
    "fors\xF8g": "attempt",
    "redde": "rescue",
    "fange": "rescue",
    "ogs\xE5": "also",
    "og": "also",
    "eller": "either",
    "ikke": "isnt",
    "lig": "equals",
    "anderledes": "differs",
    "ja": "yep",
    "sand": "yep",
    "nej": "nope",
    "falsk": "nope",
    "tom": "void",
    "p\xE5kalde": "summon",
    "importere": "summon",
    "asynkron": "async",
    "vente": "await",
    "starte": "spawn"
  },
  Finnish: {
    "takoa": "forge",
    "luoda": "forge",
    "olla": "be",
    "on": "be",
    "loitsia": "conjure",
    "funktio": "conjure",
    "tuottaa": "yield",
    "palauttaa": "yield",
    "pohtia": "ponder",
    "jos": "ponder",
    "muuten": "otherwise",
    "silmukka": "cycle",
    "kun": "cycle",
    "iteroida": "iterate",
    "jokaiselle": "iterate",
    "l\xE4pi": "through",
    "sis\xE4ll\xE4": "within",
    "kohdassa": "within",
    "heitt\xE4\xE4": "yeet",
    "ohittaa": "skip",
    "puhua": "speak",
    "n\xE4ytt\xE4\xE4": "speak",
    "tulostaa": "speak",
    "olemus": "essence",
    "luokka": "essence",
    "laajentaa": "extend",
    "itse": "self",
    "ylempi": "super",
    "uusi": "new",
    "yrit\xE4": "attempt",
    "pelasta": "rescue",
    "kiinni": "rescue",
    "my\xF6s": "also",
    "ja": "also",
    "tai": "either",
    "ei": "isnt",
    "yht\xE4suuri": "equals",
    "eroaa": "differs",
    "kyll\xE4": "yep",
    "tosi": "yep",
    "ep\xE4tosi": "nope",
    "tyhj\xE4": "void",
    "kutsu": "summon",
    "tuo": "summon",
    "asynkroninen": "async",
    "odota": "await",
    "synnyt\xE4": "spawn"
  },
  Greek: {
    "\u03C3\u03C6\u03C5\u03C1\u03B7\u03BB\u03B1\u03C4\u03CE": "forge",
    "\u03B4\u03B7\u03BC\u03B9\u03BF\u03C5\u03C1\u03B3\u03CE": "forge",
    "\u03B5\u03AF\u03BD\u03B1\u03B9": "be",
    "\u03BA\u03B1\u03BB\u03CE": "conjure",
    "\u03C3\u03C5\u03BD\u03AC\u03C1\u03C4\u03B7\u03C3\u03B7": "conjure",
    "\u03B5\u03C0\u03B9\u03C3\u03C4\u03C1\u03AD\u03C6\u03C9": "yield",
    "\u03C3\u03BA\u03AD\u03C6\u03C4\u03BF\u03BC\u03B1\u03B9": "ponder",
    "\u03B1\u03BD": "ponder",
    "\u03B1\u03BB\u03BB\u03B9\u03CE\u03C2": "otherwise",
    "\u03B2\u03C1\u03CC\u03C7\u03BF\u03C2": "cycle",
    "\u03CC\u03C3\u03BF": "cycle",
    "\u03B5\u03C0\u03B1\u03BD\u03B1\u03BB\u03B1\u03BC\u03B2\u03AC\u03BD\u03C9": "iterate",
    "\u03B3\u03B9\u03B1": "iterate",
    "\u03BC\u03AD\u03C3\u03C9": "through",
    "\u03BC\u03AD\u03C3\u03B1": "within",
    "\u03C3\u03B5": "within",
    "\u03C0\u03B5\u03C4\u03AC\u03C9": "yeet",
    "\u03C0\u03B1\u03C1\u03B1\u03BA\u03AC\u03BC\u03C0\u03C4\u03C9": "skip",
    "\u03BC\u03B9\u03BB\u03AC\u03C9": "speak",
    "\u03B5\u03BC\u03C6\u03AC\u03BD\u03B9\u03C3\u03B5": "speak",
    "\u03C4\u03CD\u03C0\u03C9\u03C3\u03B5": "speak",
    "\u03BF\u03C5\u03C3\u03AF\u03B1": "essence",
    "\u03BA\u03BB\u03AC\u03C3\u03B7": "essence",
    "\u03B5\u03C0\u03B5\u03BA\u03C4\u03B5\u03AF\u03BD\u03C9": "extend",
    "\u03B5\u03B1\u03C5\u03C4\u03CC\u03C2": "self",
    "\u03B3\u03BF\u03BD\u03AD\u03B1\u03C2": "super",
    "\u03BD\u03AD\u03BF": "new",
    "\u03B4\u03BF\u03BA\u03B9\u03BC\u03AE": "attempt",
    "\u03C3\u03CE\u03B6\u03C9": "rescue",
    "\u03C0\u03B9\u03AC\u03BD\u03C9": "rescue",
    "\u03B5\u03C0\u03AF\u03C3\u03B7\u03C2": "also",
    "\u03BA\u03B1\u03B9": "also",
    "\u03AE": "either",
    "\u03B4\u03B5\u03BD": "isnt",
    "\u03AF\u03C3\u03BF": "equals",
    "\u03B4\u03B9\u03B1\u03C6\u03AD\u03C1\u03B5\u03B9": "differs",
    "\u03BD\u03B1\u03B9": "yep",
    "\u03B1\u03BB\u03B7\u03B8\u03AD\u03C2": "yep",
    "\u03CC\u03C7\u03B9": "nope",
    "\u03C8\u03B5\u03C5\u03B4\u03AD\u03C2": "nope",
    "\u03BA\u03B5\u03BD\u03CC": "void",
    "\u03B5\u03B9\u03C3\u03B1\u03B3\u03C9\u03B3\u03AE": "summon",
    "\u03B1\u03C3\u03CD\u03B3\u03C7\u03C1\u03BF\u03BD\u03BF": "async",
    "\u03C0\u03B5\u03C1\u03B9\u03BC\u03AD\u03BD\u03C9": "await",
    "\u03C0\u03B1\u03C1\u03AC\u03B3\u03C9": "spawn"
  },
  Hebrew: {
    "\u05DC\u05D7\u05E9\u05DC": "forge",
    "\u05DC\u05D9\u05E6\u05D5\u05E8": "forge",
    "\u05DC\u05D4\u05D9\u05D5\u05EA": "be",
    "\u05D4\u05D5\u05D0": "be",
    "\u05DC\u05D6\u05DE\u05DF": "conjure",
    "\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4": "conjure",
    "\u05DC\u05D4\u05D7\u05D6\u05D9\u05E8": "yield",
    "\u05DC\u05D7\u05E9\u05D5\u05D1": "ponder",
    "\u05D0\u05DD": "ponder",
    "\u05D0\u05D7\u05E8\u05EA": "otherwise",
    "\u05DC\u05D5\u05DC\u05D0\u05D4": "cycle",
    "\u05DB\u05DC\u05E2\u05D5\u05D3": "cycle",
    "\u05DC\u05D7\u05D6\u05D5\u05E8": "iterate",
    "\u05DC\u05DB\u05DC": "iterate",
    "\u05D3\u05E8\u05DA": "through",
    "\u05D1\u05EA\u05D5\u05DA": "within",
    "\u05DC\u05D6\u05E8\u05D5\u05E7": "yeet",
    "\u05DC\u05D3\u05DC\u05D2": "skip",
    "\u05DC\u05D3\u05D1\u05E8": "speak",
    "\u05DC\u05D4\u05E6\u05D9\u05D2": "speak",
    "\u05DC\u05D4\u05D3\u05E4\u05D9\u05E1": "speak",
    "\u05DE\u05D4\u05D5\u05EA": "essence",
    "\u05DE\u05D7\u05DC\u05E7\u05D4": "essence",
    "\u05DC\u05D4\u05E8\u05D7\u05D9\u05D1": "extend",
    "\u05E2\u05E6\u05DE\u05D9": "self",
    "\u05D4\u05D5\u05E8\u05D4": "super",
    "\u05D7\u05D3\u05E9": "new",
    "\u05DC\u05E0\u05E1\u05D5\u05EA": "attempt",
    "\u05DC\u05D4\u05E6\u05D9\u05DC": "rescue",
    "\u05DC\u05EA\u05E4\u05D5\u05E1": "rescue",
    "\u05D2\u05DD": "also",
    "\u05D5": "also",
    "\u05D0\u05D5": "either",
    "\u05DC\u05D0": "isnt",
    "\u05E9\u05D5\u05D5\u05D4": "equals",
    "\u05E9\u05D5\u05E0\u05D4": "differs",
    "\u05DB\u05DF": "yep",
    "\u05D0\u05DE\u05EA": "yep",
    "\u05E9\u05E7\u05E8": "nope",
    "\u05E8\u05D9\u05E7": "void",
    "\u05DC\u05D9\u05D9\u05D1\u05D0": "summon",
    "\u05D0\u05E1\u05D9\u05E0\u05DB\u05E8\u05D5\u05E0\u05D9": "async",
    "\u05DC\u05D7\u05DB\u05D5\u05EA": "await",
    "\u05DC\u05D4\u05D5\u05DC\u05D9\u05D3": "spawn"
  },
  Ukrainian: {
    "\u043A\u0443\u0432\u0430\u0442\u0438": "forge",
    "\u0441\u0442\u0432\u043E\u0440\u0438\u0442\u0438": "forge",
    "\u0431\u0443\u0442\u0438": "be",
    "\u0454": "be",
    "\u0432\u0438\u043A\u043B\u0438\u043A\u0430\u0442\u0438": "conjure",
    "\u0444\u0443\u043D\u043A\u0446\u0456\u044F": "conjure",
    "\u043F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438": "yield",
    "\u043E\u0431\u043C\u0456\u0440\u043A\u0443\u0432\u0430\u0442\u0438": "ponder",
    "\u044F\u043A\u0449\u043E": "ponder",
    "\u0456\u043D\u0430\u043A\u0448\u0435": "otherwise",
    "\u0446\u0438\u043A\u043B": "cycle",
    "\u043F\u043E\u043A\u0438": "cycle",
    "\u043F\u0435\u0440\u0435\u0431\u0440\u0430\u0442\u0438": "iterate",
    "\u0434\u043B\u044F": "iterate",
    "\u0447\u0435\u0440\u0435\u0437": "through",
    "\u0432\u0441\u0435\u0440\u0435\u0434\u0438\u043D\u0456": "within",
    "\u0432": "within",
    "\u043A\u0438\u043D\u0443\u0442\u0438": "yeet",
    "\u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u0438": "skip",
    "\u0441\u043A\u0430\u0437\u0430\u0442\u0438": "speak",
    "\u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0438": "speak",
    "\u0432\u0438\u0432\u0435\u0441\u0442\u0438": "speak",
    "\u0441\u0443\u0442\u043D\u0456\u0441\u0442\u044C": "essence",
    "\u043A\u043B\u0430\u0441": "essence",
    "\u0440\u043E\u0437\u0448\u0438\u0440\u0438\u0442\u0438": "extend",
    "\u0441\u0435\u0431\u0435": "self",
    "\u0431\u0430\u0442\u044C\u043A\u043E": "super",
    "\u043D\u043E\u0432\u0438\u0439": "new",
    "\u0441\u043F\u0440\u043E\u0431\u0430": "attempt",
    "\u0441\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438": "attempt",
    "\u0432\u0440\u044F\u0442\u0443\u0432\u0430\u0442\u0438": "rescue",
    "\u0437\u043B\u043E\u0432\u0438\u0442\u0438": "rescue",
    "\u0442\u0430\u043A\u043E\u0436": "also",
    "\u0456": "also",
    "\u0430\u0431\u043E": "either",
    "\u043D\u0435": "isnt",
    "\u0434\u043E\u0440\u0456\u0432\u043D\u044E\u0454": "equals",
    "\u0432\u0456\u0434\u0440\u0456\u0437\u043D\u044F\u0454\u0442\u044C\u0441\u044F": "differs",
    "\u0442\u0430\u043A": "yep",
    "\u0456\u0441\u0442\u0438\u043D\u0430": "yep",
    "\u043D\u0456": "nope",
    "\u0445\u0438\u0431\u0430": "nope",
    "\u043F\u043E\u0440\u043E\u0436\u043D\u044C\u043E": "void",
    "\u043F\u0440\u0438\u0437\u0432\u0430\u0442\u0438": "summon",
    "\u0456\u043C\u043F\u043E\u0440\u0442": "summon",
    "\u0430\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u043D\u0438\u0439": "async",
    "\u0447\u0435\u043A\u0430\u0442\u0438": "await",
    "\u043F\u043E\u0440\u043E\u0434\u0438\u0442\u0438": "spawn"
  },
  Czech: {
    "kovat": "forge",
    "vytvo\u0159it": "forge",
    "b\xFDt": "be",
    "je": "be",
    "vyvolat": "conjure",
    "funkce": "conjure",
    "vr\xE1tit": "yield",
    "uv\xE1\u017Eit": "ponder",
    "pokud": "ponder",
    "jinak": "otherwise",
    "smy\u010Dka": "cycle",
    "dokud": "cycle",
    "iterovat": "iterate",
    "pro": "iterate",
    "skrz": "through",
    "uvnit\u0159": "within",
    "v": "within",
    "hodit": "yeet",
    "p\u0159esko\u010Dit": "skip",
    "\u0159\xEDci": "speak",
    "zobrazit": "speak",
    "vytisknout": "speak",
    "podstata": "essence",
    "t\u0159\xEDda": "essence",
    "roz\u0161\xED\u0159it": "extend",
    "s\xE1m": "self",
    "rodi\u010D": "super",
    "nov\xFD": "new",
    "zkusit": "attempt",
    "zachr\xE1nit": "rescue",
    "chytit": "rescue",
    "tak\xE9": "also",
    "a": "also",
    "nebo": "either",
    "nen\xED": "isnt",
    "rovn\xE1": "equals",
    "li\u0161\xED": "differs",
    "ano": "yep",
    "pravda": "yep",
    "ne": "nope",
    "nepravda": "nope",
    "pr\xE1zdn\xFD": "void",
    "importovat": "summon",
    "asynchronn\xED": "async",
    "\u010Dekat": "await",
    "vytvo\u0159it_proces": "spawn"
  },
  Romanian: {
    "forja": "forge",
    "crea": "forge",
    "fi": "be",
    "este": "be",
    "evoca": "conjure",
    "func\u021Bie": "conjure",
    "func\u021Bia": "conjure",
    "\xEEntoarce": "yield",
    "returna": "yield",
    "g\xE2ndi": "ponder",
    "dac\u0103": "ponder",
    "altfel": "otherwise",
    "bucl\u0103": "cycle",
    "c\xE2ttimp": "cycle",
    "itera": "iterate",
    "pentru": "iterate",
    "prin": "through",
    "\xEEn_interior": "within",
    "\xEEn": "within",
    "arunca": "yeet",
    "s\u0103ri": "skip",
    "spune": "speak",
    "arat\u0103": "speak",
    "afi\u0219eaz\u0103": "speak",
    "esen\u021B\u0103": "essence",
    "clas\u0103": "essence",
    "extinde": "extend",
    "sine": "self",
    "p\u0103rinte": "super",
    "nou": "new",
    "\xEEncearc\u0103": "attempt",
    "salveaz\u0103": "rescue",
    "prinde": "rescue",
    "de_asemenea": "also",
    "\u0219i": "also",
    "sau": "either",
    "nu_este": "isnt",
    "egal": "equals",
    "difer\u0103": "differs",
    "da": "yep",
    "adev\u0103rat": "yep",
    "nu": "nope",
    "fals": "nope",
    "gol": "void",
    "importa": "summon",
    "asincron": "async",
    "a\u0219teapt\u0103": "await",
    "genera": "spawn"
  },
  Hungarian: {
    "kov\xE1csol": "forge",
    "l\xE9trehoz": "forge",
    "lenni": "be",
    "legyen": "be",
    "id\xE9z": "conjure",
    "f\xFCggv\xE9ny": "conjure",
    "visszaad": "yield",
    "fontol": "ponder",
    "ha": "ponder",
    "k\xFCl\xF6nben": "otherwise",
    "ciklus": "cycle",
    "am\xEDg": "cycle",
    "iter\xE1l": "iterate",
    "minden": "iterate",
    "kereszt\xFCl": "through",
    "bel\xFCl": "within",
    "ban": "within",
    "dob": "yeet",
    "\xE1tugor": "skip",
    "mond": "speak",
    "mutat": "speak",
    "ki\xEDr": "speak",
    "l\xE9nyeg": "essence",
    "oszt\xE1ly": "essence",
    "b\u0151v\xEDt": "extend",
    "maga": "self",
    "sz\xFCl\u0151": "super",
    "\xFAj": "new",
    "pr\xF3ba": "attempt",
    "megpr\xF3b\xE1l": "attempt",
    "ment": "rescue",
    "elkap": "rescue",
    "is": "also",
    "\xE9s": "also",
    "vagy": "either",
    "nem": "isnt",
    "egyenl\u0151": "equals",
    "k\xFCl\xF6nb\xF6zik": "differs",
    "igen": "yep",
    "igaz": "yep",
    "hamis": "nope",
    "\xFCres": "void",
    "beh\xEDv": "summon",
    "import\xE1l": "summon",
    "aszinkron": "async",
    "v\xE1r": "await",
    "ind\xEDt": "spawn"
  },
  Bulgarian: {
    // forge — create / declare a variable. Accept many natural verbs.
    "\u0438\u0437\u043A\u043E\u0432\u0430": "forge",
    "\u0438\u0437\u043A\u043E\u0432\u0430\u0439": "forge",
    "\u0441\u044A\u0437\u0434\u0430\u0439": "forge",
    "\u0441\u044A\u0437\u0434\u0430\u043C": "forge",
    "\u0441\u044A\u0437\u0434\u0430\u0432\u0430\u043C": "forge",
    "\u0441\u044A\u0437\u0434\u0430\u0432\u0430\u043D\u0435": "forge",
    "\u043D\u0430\u043F\u0440\u0430\u0432\u0438": "forge",
    "\u043D\u0430\u043F\u0440\u0430\u0432\u044F": "forge",
    "\u043F\u0440\u0430\u0432\u044F": "forge",
    "\u043D\u0435\u043A\u0430": "forge",
    "\u0434\u0435\u0444\u0438\u043D\u0438\u0440\u0430\u0439": "forge",
    "\u0434\u0435\u0444\u0438\u043D\u0438\u0446\u0438\u044F": "forge",
    "\u043E\u0431\u044F\u0432\u0438": "forge",
    "\u043E\u0431\u044F\u0432\u044F\u0432\u0430\u043C": "forge",
    "\u043F\u0440\u0438\u0435\u043C\u0438": "forge",
    "\u0432\u0437\u0435\u043C\u0438": "forge",
    "\u0438\u043C\u0430\u043C\u0435": "forge",
    "\u0438\u043C\u0430\u043C": "forge",
    // be — assignment / equality binding
    "\u0431\u044A\u0434\u0435": "be",
    "\u0434\u0430_\u0431\u044A\u0434\u0435": "be",
    "\u0431\u044A\u0434\u0430": "be",
    "\u0435": "be",
    "\u0434\u0430_\u0435": "be",
    "\u0441\u0430": "be",
    "\u0441\u0442\u0430\u0432\u0430": "be",
    "\u0434\u0430_\u0441\u0442\u0430\u043D\u0435": "be",
    "\u0441\u0442\u0430\u043D\u0435": "be",
    "\u0440\u0430\u0432\u043D\u044F\u0432\u0430\u043D\u0435": "be",
    "\u043F\u0440\u0438\u0441\u0432\u043E\u0439": "be",
    "\u043F\u0440\u0438\u0441\u0432\u043E\u044F\u0432\u0430\u043C": "be",
    "\u0441\u044A\u0441_\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442": "be",
    // conjure — function / method definition
    "\u0438\u0437\u0432\u0438\u043A\u0430\u0439": "conjure",
    "\u0438\u0437\u0432\u0438\u043A\u0432\u0430\u043D\u0435": "conjure",
    "\u0444\u0443\u043D\u043A\u0446\u0438\u044F": "conjure",
    "\u043C\u0435\u0442\u043E\u0434": "conjure",
    "\u043F\u0440\u043E\u0446\u0435\u0434\u0443\u0440\u0430": "conjure",
    "\u043A\u043E\u043D\u0441\u0442\u0440\u0443\u0438\u0440\u0430\u0439": "conjure",
    // yield — return value
    "\u0432\u044A\u0440\u043D\u0438": "yield",
    "\u0432\u0440\u044A\u0449\u0430\u043C": "yield",
    "\u0432\u0440\u044A\u0449\u0430\u0439": "yield",
    "\u043E\u0442\u0433\u043E\u0432\u043E\u0440\u0438": "yield",
    "\u0434\u0430\u0439": "yield",
    // ponder — if / conditional
    "\u043E\u0431\u043C\u0438\u0441\u043B\u0438": "ponder",
    "\u0430\u043A\u043E": "ponder",
    "\u043A\u043E\u0433\u0430\u0442\u043E": "ponder",
    "\u0432_\u0441\u043B\u0443\u0447\u0430\u0439": "ponder",
    "\u043F\u0440\u0438_\u0443\u0441\u043B\u043E\u0432\u0438\u0435": "ponder",
    "\u043F\u0440\u043E\u0432\u0435\u0440\u0438": "ponder",
    // otherwise — else
    "\u0438\u043D\u0430\u0447\u0435": "otherwise",
    "\u0432_\u043F\u0440\u043E\u0442\u0438\u0432\u0435\u043D_\u0441\u043B\u0443\u0447\u0430\u0439": "otherwise",
    "\u0438\u043D\u0430\u0447\u0435_\u0430\u043A\u043E": "otherwise",
    "\u043E\u0431\u0440\u0430\u0442\u043D\u043E": "otherwise",
    "\u0430\u043A\u043E_\u043D\u0435": "otherwise",
    // cycle — while loop
    "\u0446\u0438\u043A\u044A\u043B": "cycle",
    "\u0434\u043E\u043A\u0430\u0442\u043E": "cycle",
    "\u043F\u043E\u0432\u0442\u0430\u0440\u044F\u0439": "cycle",
    "\u043F\u043E\u0432\u0442\u043E\u0440\u0438": "cycle",
    "\u043F\u0440\u043E\u0434\u044A\u043B\u0436\u0430\u0432\u0430\u0439": "cycle",
    "\u0432\u044A\u0440\u0442\u0438": "cycle",
    "\u0432\u044A\u0440\u0442\u0438_\u0441\u0435": "cycle",
    // iterate — for loop
    "\u043E\u0431\u0445\u043E\u0434\u0438": "iterate",
    "\u043E\u0431\u0445\u043E\u0436\u0434\u0430\u0439": "iterate",
    "\u0437\u0430_\u0432\u0441\u0435\u043A\u0438": "iterate",
    "\u0437\u0430": "iterate",
    "\u0432\u0441\u0435\u043A\u0438": "iterate",
    "\u0438\u0442\u0435\u0440\u0438\u0440\u0430\u0439": "iterate",
    "\u043C\u0438\u043D\u0430\u0432\u0430\u0439_\u043F\u0440\u0435\u0437": "iterate",
    // through — over a collection
    "\u043F\u0440\u0435\u0437": "through",
    "\u043F\u043E": "through",
    "\u043D\u0430\u0434": "through",
    // within — in / inside
    "\u0432\u044A\u0442\u0440\u0435": "within",
    "\u0432\u044A\u0442\u0440\u0435_\u0432": "within",
    "\u0432": "within",
    "\u0441\u0440\u0435\u0434": "within",
    // yeet — throw / break
    "\u0445\u0432\u044A\u0440\u043B\u0438": "yeet",
    "\u0445\u0432\u044A\u0440\u043B\u044F\u043C": "yeet",
    "\u0441\u0447\u0443\u043F\u0438": "yeet",
    "\u043F\u0440\u0435\u043A\u044A\u0441\u043D\u0438": "yeet",
    "\u0441\u043F\u0440\u0438": "yeet",
    "\u0438\u0437\u043B\u0435\u0437": "yeet",
    "\u043A\u0440\u0430\u0439": "yeet",
    // skip — continue
    "\u043F\u0440\u0435\u0441\u043A\u043E\u0447\u0438": "skip",
    "\u043F\u0440\u043E\u043F\u0443\u0441\u043D\u0438": "skip",
    "\u043F\u0440\u043E\u0434\u044A\u043B\u0436\u0438": "skip",
    "\u0441\u043B\u0435\u0434\u0432\u0430\u0449": "skip",
    // speak — print / output
    "\u043A\u0430\u0436\u0438": "speak",
    "\u043A\u0430\u0437\u0432\u0430\u0439": "speak",
    "\u0438\u0437\u043A\u0440\u0435\u0449\u0438": "speak",
    "\u043F\u043E\u043A\u0430\u0436\u0438": "speak",
    "\u043F\u043E\u043A\u0430\u0437\u0432\u0430\u0439": "speak",
    "\u0438\u0437\u0432\u0435\u0434\u0438": "speak",
    "\u0438\u0437\u0432\u0435\u0436\u0434\u0430\u0439": "speak",
    "\u043E\u0442\u043F\u0435\u0447\u0430\u0442\u0430\u0439": "speak",
    "\u043F\u0435\u0447\u0430\u0442\u0430\u0439": "speak",
    "\u0438\u0437\u043F\u0438\u0448\u0438": "speak",
    "\u043F\u0438\u0448\u0438": "speak",
    "\u043D\u0430\u043F\u0438\u0448\u0438": "speak",
    "\u043F\u0440\u0438\u043D\u0442\u0438\u0440\u0430\u0439": "speak",
    "\u043F\u0440\u0438\u043D\u0442": "speak",
    "\u043B\u043E\u0433\u043D\u0438": "speak",
    "\u0441\u044A\u043E\u0431\u0449\u0438": "speak",
    // essence — class
    "\u0441\u044A\u0449\u043D\u043E\u0441\u0442": "essence",
    "\u043A\u043B\u0430\u0441": "essence",
    "\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430": "essence",
    "\u0435\u0441\u0435\u043D\u0446\u0438\u044F": "essence",
    "\u0435\u0441\u0435\u043D\u0446\u0438\u044F_\u043D\u0430": "essence",
    // extend — inherit
    "\u0440\u0430\u0437\u0448\u0438\u0440\u0438": "extend",
    "\u0440\u0430\u0437\u0448\u0438\u0440\u044F\u0432\u0430\u043D\u0435": "extend",
    "\u043D\u0430\u0441\u043B\u0435\u0434\u0438": "extend",
    "\u043D\u0430\u0441\u043B\u0435\u0434\u044F\u0432\u0430\u043D\u0435": "extend",
    "\u043F\u0440\u043E\u0438\u0437\u043B\u0438\u0437\u0430": "extend",
    // self / super
    "\u0441\u0435\u0431\u0435_\u0441\u0438": "self",
    "\u0441\u0435\u0431\u0435": "self",
    "\u0442\u043E\u0437\u0438": "self",
    "\u0442\u0430\u0437\u0438": "self",
    "\u0440\u043E\u0434\u0438\u0442\u0435\u043B": "super",
    "\u0440\u043E\u0434\u0438\u0442\u0435\u043B\u044F\u0442": "super",
    "\u043D\u0430\u0441\u043B\u0435\u0434\u043D\u0438\u043A": "super",
    "\u0431\u0430\u0449\u0430": "super",
    // new — instantiate
    "\u043D\u043E\u0432": "new",
    "\u043D\u043E\u0432\u043E": "new",
    "\u043D\u043E\u0432\u0430": "new",
    "\u0441\u044A\u0437\u0434\u0430\u0439_\u043D\u043E\u0432": "new",
    "\u0438\u043D\u0441\u0442\u0430\u043D\u0446\u0438\u044F": "new",
    // init — constructor method name (not a keyword, but the runtime looks for `init`)
    "\u0438\u043D\u0438\u0442": "init",
    "\u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0442\u043E\u0440": "init",
    "\u0441\u044A\u0437\u0434\u0430\u0432\u0430\u043D\u0435_\u043D\u0430": "init",
    "\u043D\u0430\u0447\u0430\u043B\u043E": "init",
    // attempt / rescue
    "\u043E\u043F\u0438\u0442\u0430\u0439": "attempt",
    "\u043E\u043F\u0438\u0442\u0432\u0430\u0439": "attempt",
    "\u043F\u0440\u043E\u0431\u0432\u0430\u0439": "attempt",
    "\u043E\u043F\u0438\u0442_\u0437\u0430": "attempt",
    "\u0441\u043F\u0430\u0441\u0438": "rescue",
    "\u0445\u0432\u0430\u043D\u0438": "rescue",
    "\u043F\u0440\u0438\u0445\u0432\u0430\u043D\u0438": "rescue",
    "\u043F\u0440\u0438_\u0433\u0440\u0435\u0448\u043A\u0430": "rescue",
    "\u0430\u043A\u043E_\u0433\u0440\u0435\u0448\u043A\u0430": "rescue",
    "\u0443\u043B\u043E\u0432\u0438": "rescue",
    // logical
    "\u0441\u044A\u0449\u043E": "also",
    "\u0438": "also",
    "\u043A\u0430\u043A\u0442\u043E_\u0438": "also",
    "\u0438\u043B\u0438": "either",
    "\u0431\u0438\u043B\u043E_\u0442\u043E": "either",
    "\u043D\u0435_\u0435": "isnt",
    "\u043D\u0435": "isnt",
    "\u0440\u0430\u0432\u043D\u043E": "equals",
    "\u0440\u0430\u0432\u043D\u043E_\u043D\u0430": "equals",
    "\u0435\u0434\u043D\u0430\u043A\u0432\u043E": "equals",
    "\u0441\u044A\u0449\u043E\u0442\u043E": "equals",
    "\u0440\u0430\u0437\u043B\u0438\u0447\u043D\u043E": "differs",
    "\u0440\u0430\u0437\u043B\u0438\u0447\u043D\u043E_\u043E\u0442": "differs",
    "\u043D\u0435_\u0440\u0430\u0432\u043D\u043E": "differs",
    // booleans
    "\u0434\u0430": "yep",
    "\u0432\u044F\u0440\u043D\u043E": "yep",
    "\u0438\u0441\u0442\u0438\u043D\u0430": "yep",
    "\u0438\u0441\u0442\u0438\u043D\u043D\u043E": "yep",
    "\u0438\u0441\u0442\u0438\u043D\u0441\u043A\u043E": "yep",
    "\u043D\u0435\u0432\u044F\u0440\u043D\u043E": "nope",
    "\u043B\u044A\u0436\u0430": "nope",
    "\u0433\u0440\u0435\u0448\u043D\u043E": "nope",
    "\u043D\u0435\u0438\u0441\u0442\u0438\u043D\u0430": "nope",
    // void / null
    "\u043F\u0440\u0430\u0437\u043D\u043E": "void",
    "\u043D\u0438\u0449\u043E": "void",
    "\u043D\u0443\u043B\u0430": "void",
    "\u043D\u0443\u043B\u0435\u0432\u0430": "void",
    "\u043B\u0438\u043F\u0441\u0432\u0430": "void",
    // summon — import
    "\u043F\u0440\u0438\u0437\u043E\u0432\u0438": "summon",
    "\u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u0430\u0439": "summon",
    "\u0432\u043D\u0435\u0441\u0438": "summon",
    "\u0432\u043A\u0430\u0440\u0430\u0439": "summon",
    "\u0432\u043A\u043B\u044E\u0447\u0438": "summon",
    "\u0437\u0430\u0440\u0435\u0434\u0438": "summon",
    "\u0438\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u0439": "summon",
    // async / await / spawn
    "\u0430\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0435\u043D": "async",
    "\u0430\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u043D\u043E": "async",
    "\u043F\u0430\u0440\u0430\u043B\u0435\u043B\u043D\u043E": "async",
    "\u0438\u0437\u0447\u0430\u043A\u0430\u0439": "await",
    "\u0447\u0430\u043A\u0430\u0439": "await",
    "\u043F\u043E\u0447\u0430\u043A\u0430\u0439": "await",
    "\u043F\u043E\u0440\u043E\u0434\u0438": "spawn",
    "\u0441\u0442\u0430\u0440\u0442\u0438\u0440\u0430\u0439": "spawn",
    "\u043F\u0443\u0441\u043D\u0438": "spawn",
    "\u0438\u0437\u043F\u044A\u043B\u043D\u0438": "spawn"
  }
};
var SUPPORTED_LANGUAGES = Object.keys(KEYWORD_TABLES);
var PHRASE_NORMALIZATIONS = {};
function buildPhraseNormalizations(lang) {
  if (PHRASE_NORMALIZATIONS[lang]) return PHRASE_NORMALIZATIONS[lang];
  const table = KEYWORD_TABLES[lang];
  if (!table) return PHRASE_NORMALIZATIONS[lang] = [];
  const phrases = Object.keys(table).filter((k) => k.includes("_"));
  const result = phrases.map((p) => {
    const spaced = p.replace(/_/g, "\\s+");
    return [new RegExp(`(^|[^\\p{L}\\p{N}_])${spaced}(?=$|[^\\p{L}\\p{N}_])`, "gu"), `$1${p}`];
  });
  PHRASE_NORMALIZATIONS[lang] = result;
  return result;
}
var COMPILED_REPLACERS = {};
function compileReplacer(lang) {
  if (COMPILED_REPLACERS[lang]) return COMPILED_REPLACERS[lang];
  const table = KEYWORD_TABLES[lang];
  if (!table) return COMPILED_REPLACERS[lang] = (s) => s;
  const entries = Object.entries(table).sort((a, b) => b[0].length - a[0].length);
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = entries.map(([k]) => escape(k)).join("|");
  if (!pattern) return COMPILED_REPLACERS[lang] = (s) => s;
  const re = new RegExp(`(^|[^\\p{L}\\p{N}_])(${pattern})(?=$|[^\\p{L}\\p{N}_])`, "gu");
  const map = new Map(entries);
  const fn = (src) => {
    return src.replace(re, (_m, pre, word) => {
      const repl = map.get(word) ?? word;
      return pre + repl;
    });
  };
  COMPILED_REPLACERS[lang] = fn;
  return fn;
}
function segmentSource(source) {
  const segs = [];
  let i = 0;
  let buf = "";
  const flush = (code) => {
    if (buf) {
      segs.push({ code, text: buf });
      buf = "";
    }
  };
  while (i < source.length) {
    const c = source[i];
    if (c === "/" && source[i + 1] === "/" || c === "#") {
      flush(true);
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      segs.push({ code: false, text: source.slice(i, stop) });
      i = stop;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      flush(true);
      const quote = c;
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === "\\") {
          j += 2;
          continue;
        }
        if (source[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      segs.push({ code: false, text: source.slice(i, j) });
      i = j;
      continue;
    }
    buf += c;
    i++;
  }
  flush(true);
  return segs;
}
function hasNonAscii(code) {
  return /[^\x00-\x7F]/.test(code);
}
function detectLanguage(source) {
  const englishHits = (source.match(/\b(forge|be|conjure|ponder|cycle|speak|yield)\b/g) || []).length;
  let bestLang = null;
  let bestScore = 0;
  for (const lang of SUPPORTED_LANGUAGES) {
    const table = KEYWORD_TABLES[lang];
    let score = 0;
    for (const word of Object.keys(table)) {
      if (source.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }
  if (bestScore >= 2 && bestScore > englishHits) return bestLang;
  return null;
}
function translateSource(source, sourceLanguage = "auto") {
  if (!source) return { translated: source, detectedLanguage: null };
  let lang = sourceLanguage;
  if (lang === "English") return { translated: source, detectedLanguage: "English" };
  if (!lang || lang === "auto") {
    if (!hasNonAscii(source)) {
      const detected = detectLanguage(source);
      if (!detected) return { translated: source, detectedLanguage: null };
      lang = detected;
    } else {
      lang = detectLanguage(source);
      if (!lang) return { translated: source, detectedLanguage: null };
    }
  }
  if (!KEYWORD_TABLES[lang]) {
    return { translated: source, detectedLanguage: null };
  }
  const replace = compileReplacer(lang);
  const phraseNorms = buildPhraseNormalizations(lang);
  const fuzzy = compileFuzzyReplacer(lang);
  const segments = segmentSource(source);
  const translated = segments.map((seg) => {
    if (!seg.code) return seg.text;
    let t = seg.text;
    for (const [re, repl] of phraseNorms) {
      t = t.replace(re, repl);
    }
    t = replace(t);
    t = fuzzy(t);
    t = t.replace(
      /\bforge(\s+[\p{L}_][\p{L}\p{N}_]*\s*\()/gu,
      "conjure$1"
    );
    return t;
  }).join("");
  return { translated, detectedLanguage: lang };
}
function levenshtein(a, b) {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}
var FUZZY_REPLACERS = {};
function compileFuzzyReplacer(lang) {
  if (FUZZY_REPLACERS[lang]) return FUZZY_REPLACERS[lang];
  const table = KEYWORD_TABLES[lang];
  if (!table) return FUZZY_REPLACERS[lang] = (s) => s;
  const keys = Object.keys(table).filter((k) => !k.includes("_") && [...k].length >= 3);
  const keysByFirstChar = /* @__PURE__ */ new Map();
  for (const k of keys) {
    const c = k[0].toLowerCase();
    if (!keysByFirstChar.has(c)) keysByFirstChar.set(c, []);
    keysByFirstChar.get(c).push(k);
  }
  const wordRe = /[\p{L}][\p{L}\p{N}_]*/gu;
  const IDENT_INTRODUCERS = /* @__PURE__ */ new Set([
    "forge",
    "be",
    "new",
    "essence",
    "conjure",
    "extend",
    "summon",
    "within"
  ]);
  const fn = (src) => {
    let prevToken = "";
    return src.replace(wordRe, (word, offset) => {
      if (/^[\x00-\x7F]+$/.test(word)) {
        prevToken = word.toLowerCase();
        return word;
      }
      const lower = word.toLowerCase();
      if (table[lower]) {
        const out = table[lower];
        prevToken = out;
        return out;
      }
      const prevChar = offset > 0 ? src[offset - 1] : "";
      if (prevChar === "." || IDENT_INTRODUCERS.has(prevToken)) {
        prevToken = lower;
        return word;
      }
      if ([...lower].length < 4) {
        prevToken = lower;
        return word;
      }
      const threshold = [...lower].length >= 6 ? 2 : 1;
      const candidates = keysByFirstChar.get(lower[0]) ?? [];
      let best = null;
      for (const k of candidates) {
        if (Math.abs(k.length - lower.length) > threshold) continue;
        const d = levenshtein(lower, k);
        if (d <= threshold && (!best || d < best.dist)) {
          best = { key: k, dist: d };
          if (d === 0) break;
        }
      }
      if (best) {
        const out = table[best.key];
        prevToken = out;
        return out;
      }
      prevToken = lower;
      return word;
    });
  };
  FUZZY_REPLACERS[lang] = fn;
  return fn;
}

// src/lang/lexer.ts
var Lexer = class {
  source;
  pos = 0;
  line = 1;
  column = 1;
  tokens = [];
  /** Language detected (or used) by the built-in translator, if any. */
  detectedLanguage;
  constructor(source, options = {}) {
    const { sourceLanguage = "auto", translate = true } = options;
    if (translate && sourceLanguage !== "English" && sourceLanguage !== null) {
      const result = translateSource(source, sourceLanguage);
      this.source = result.translated;
      this.detectedLanguage = result.detectedLanguage;
    } else {
      this.source = source;
      this.detectedLanguage = null;
    }
  }
  tokenize() {
    while (!this.isAtEnd()) {
      this.scanToken();
    }
    this.tokens.push({ type: "EOF" /* EOF */, value: "", line: this.line, column: this.column });
    return this.tokens;
  }
  scanToken() {
    this.skipWhitespace();
    if (this.isAtEnd()) return;
    const startColumn = this.column;
    const char = this.advance();
    const singleTokens = {
      "(": "LPAREN" /* LPAREN */,
      ")": "RPAREN" /* RPAREN */,
      "[": "LBRACKET" /* LBRACKET */,
      "]": "RBRACKET" /* RBRACKET */,
      ",": "COMMA" /* COMMA */,
      ".": "DOT" /* DOT */,
      "+": "PLUS" /* PLUS */,
      "*": "STAR" /* STAR */,
      "%": "PERCENT" /* PERCENT */,
      "^": "CARET" /* CARET */,
      "~": "TILDE" /* TILDE */
    };
    if (singleTokens[char]) {
      this.addToken(singleTokens[char], char, startColumn);
      return;
    }
    if (char === "-") {
      if (this.peek() === ">") {
        this.advance();
        this.addToken("ARROW" /* ARROW */, "->", startColumn);
      } else {
        this.addToken("MINUS" /* MINUS */, char, startColumn);
      }
      return;
    }
    if (char === "|") {
      if (this.peek() === ">") {
        this.advance();
        this.addToken("PIPE" /* PIPE */, "|>", startColumn);
      } else {
        throw new SdevError(`Unexpected character: '${char}'`, this.line, startColumn);
      }
      return;
    }
    if (char === ":") {
      if (this.peek() === ":") {
        this.advance();
        this.addToken("DOUBLE_COLON" /* DOUBLE_COLON */, "::", startColumn);
      } else {
        this.addToken("COLON" /* COLON */, ":", startColumn);
      }
      return;
    }
    if (char === ";") {
      if (this.peek() === ";") {
        this.advance();
        this.addToken("DOUBLE_SEMI" /* DOUBLE_SEMI */, ";;", startColumn);
      }
      return;
    }
    if (char === "/") {
      if (this.peek() === "/") {
        while (!this.isAtEnd() && this.peek() !== "\n") {
          this.advance();
        }
        return;
      }
      this.addToken("SLASH" /* SLASH */, char, startColumn);
      return;
    }
    if (char === "#") {
      while (!this.isAtEnd() && this.peek() !== "\n") {
        this.advance();
      }
      return;
    }
    if (char === "<") {
      if (this.peek() === ">") {
        this.advance();
        this.addToken("DIFFERS" /* DIFFERS */, "<>", startColumn);
      } else if (this.peek() === "=") {
        this.advance();
        this.addToken("ATMOST" /* ATMOST */, "<=", startColumn);
      } else {
        this.addToken("LESS" /* LESS */, "<", startColumn);
      }
      return;
    }
    if (char === ">") {
      if (this.peek() === "=") {
        this.advance();
        this.addToken("ATLEAST" /* ATLEAST */, ">=", startColumn);
      } else {
        this.addToken("MORE" /* MORE */, ">", startColumn);
      }
      return;
    }
    if (char === '"' || char === "'" || char === "`") {
      this.scanString(char, startColumn);
      return;
    }
    if (this.isDigit(char)) {
      this.scanNumber(char, startColumn);
      return;
    }
    if (this.isAlpha(char)) {
      this.scanIdentifier(char, startColumn);
      return;
    }
    throw new SdevError(`Unexpected character: '${char}'`, this.line, startColumn);
  }
  scanString(quote, startColumn) {
    let value = "";
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === "\n") {
        if (quote === "`") {
          value += this.advance();
          this.line++;
          this.column = 1;
          continue;
        }
        throw new SdevError("Unterminated string", this.line, startColumn);
      }
      if (this.peek() === "\\") {
        this.advance();
        const escaped = this.advance();
        const escapes = {
          "n": "\n",
          "t": "	",
          "r": "\r",
          "\\": "\\",
          '"': '"',
          "'": "'",
          "`": "`"
        };
        value += escapes[escaped] ?? escaped;
      } else {
        value += this.advance();
      }
    }
    if (this.isAtEnd()) {
      throw new SdevError("Unterminated string", this.line, startColumn);
    }
    this.advance();
    this.addToken("STRING" /* STRING */, value, startColumn);
  }
  scanNumber(first, startColumn) {
    let value = first;
    if (first === "0" && (this.peek() === "x" || this.peek() === "X")) {
      value += this.advance();
      while (this.isHexDigit(this.peek())) {
        value += this.advance();
      }
      this.addToken("NUMBER" /* NUMBER */, String(parseInt(value, 16)), startColumn);
      return;
    }
    while (this.isDigit(this.peek())) {
      value += this.advance();
    }
    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      value += this.advance();
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }
    if ((this.peek() === "e" || this.peek() === "E") && (this.isDigit(this.peekNext()) || this.peekNext() === "+" || this.peekNext() === "-")) {
      value += this.advance();
      if (this.peek() === "+" || this.peek() === "-") {
        value += this.advance();
      }
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }
    this.addToken("NUMBER" /* NUMBER */, value, startColumn);
  }
  scanIdentifier(first, startColumn) {
    let value = first;
    while (this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }
    const type = KEYWORDS[value] ?? "IDENTIFIER" /* IDENTIFIER */;
    this.addToken(type, value, startColumn);
  }
  skipWhitespace() {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === " " || char === "	" || char === "\r") {
        this.advance();
      } else if (char === "\n") {
        this.line++;
        this.column = 0;
        this.advance();
      } else {
        break;
      }
    }
  }
  isAtEnd() {
    return this.pos >= this.source.length;
  }
  peek() {
    return this.source[this.pos] ?? "\0";
  }
  peekNext() {
    return this.source[this.pos + 1] ?? "\0";
  }
  advance() {
    const char = this.source[this.pos];
    this.pos++;
    this.column++;
    return char;
  }
  addToken(type, value, column) {
    this.tokens.push({ type, value, line: this.line, column });
  }
  isDigit(char) {
    return char >= "0" && char <= "9";
  }
  isHexDigit(char) {
    return char >= "0" && char <= "9" || char >= "a" && char <= "f" || char >= "A" && char <= "F";
  }
  isAlpha(char) {
    return char >= "a" && char <= "z" || char >= "A" && char <= "Z" || char === "_" || new RegExp("\\p{L}", "u").test(char);
  }
  isAlphaNumeric(char) {
    return this.isAlpha(char) || this.isDigit(char);
  }
};

// src/lang/parser.ts
var Parser = class {
  tokens;
  pos = 0;
  constructor(tokens) {
    this.tokens = tokens;
  }
  parse() {
    const statements = [];
    while (!this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    return { type: "Program", statements, line: 1 };
  }
  parseStatement() {
    if (this.check("FORGE" /* FORGE */)) return this.parseForgeStatement();
    if (this.check("CONJURE" /* CONJURE */)) return this.parseConjureDeclaration();
    if (this.check("ASYNC" /* ASYNC */)) return this.parseAsyncConjure();
    if (this.check("PONDER" /* PONDER */)) return this.parsePonderStatement();
    if (this.check("CYCLE" /* CYCLE */)) return this.parseCycleStatement();
    if (this.check("ITERATE" /* ITERATE */)) return this.parseIterateStatement();
    if (this.check("WITHIN" /* WITHIN */)) return this.parseWithinStatement();
    if (this.check("YIELD" /* YIELD */)) return this.parseYieldStatement();
    if (this.check("YEET" /* YEET */)) return this.parseYeetStatement();
    if (this.check("SKIP" /* SKIP */)) return this.parseSkipStatement();
    if (this.check("ATTEMPT" /* ATTEMPT */)) return this.parseAttemptStatement();
    if (this.checkIdentifierValue("essence")) return this.parseEssenceDeclaration();
    if (this.check("DOUBLE_COLON" /* DOUBLE_COLON */)) return this.parseBlockStatement();
    return this.parseExpressionStatement();
  }
  // forge name be value
  parseForgeStatement() {
    const forgeToken = this.consume("FORGE" /* FORGE */, "Expected 'forge'");
    const name = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected variable name").value;
    this.consume("BE" /* BE */, "Expected 'be'");
    const value = this.parseExpression();
    return { type: "LetStatement", name, value, line: forgeToken.line };
  }
  // conjure name(params) :: body ;;
  parseConjureDeclaration() {
    const conjureToken = this.consume("CONJURE" /* CONJURE */, "Expected 'conjure'");
    const name = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected function name").value;
    this.consume("LPAREN" /* LPAREN */, "Expected '('");
    const params = [];
    if (!this.check("RPAREN" /* RPAREN */)) {
      do {
        if (this.check("SELF" /* SELF */)) {
          this.advance();
          params.push("self");
        } else {
          params.push(this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected parameter name").value);
        }
      } while (this.match("COMMA" /* COMMA */));
    }
    this.consume("RPAREN" /* RPAREN */, "Expected ')'");
    const body = this.parseBlockStatement();
    return { type: "FuncDeclaration", name, params, body, line: conjureToken.line };
  }
  // async conjure name(params) :: body ;;
  parseAsyncConjure() {
    const asyncToken = this.consume("ASYNC" /* ASYNC */, "Expected 'async'");
    this.consume("CONJURE" /* CONJURE */, "Expected 'conjure' after 'async'");
    const name = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected function name").value;
    this.consume("LPAREN" /* LPAREN */, "Expected '('");
    const params = [];
    if (!this.check("RPAREN" /* RPAREN */)) {
      do {
        if (this.check("SELF" /* SELF */)) {
          this.advance();
          params.push("self");
        } else {
          params.push(this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected parameter name").value);
        }
      } while (this.match("COMMA" /* COMMA */));
    }
    this.consume("RPAREN" /* RPAREN */, "Expected ')'");
    const body = this.parseBlockStatement();
    return { type: "FuncDeclaration", name, params, body, line: asyncToken.line };
  }
  // essence ClassName (extend Parent)? :: methods ;;
  // 'essence' is treated as a contextual keyword (IDENTIFIER with value 'essence')
  parseEssenceDeclaration() {
    const essenceToken = this.advance();
    const name = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected class name").value;
    let superClass;
    if (this.match("EXTEND" /* EXTEND */)) {
      superClass = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected superclass name").value;
    }
    this.consume("DOUBLE_COLON" /* DOUBLE_COLON */, "Expected '::'");
    const methods = [];
    while (!this.check("DOUBLE_SEMI" /* DOUBLE_SEMI */) && !this.isAtEnd()) {
      if (this.check("CONJURE" /* CONJURE */)) {
        methods.push(this.parseConjureDeclaration());
      } else {
        this.advance();
      }
    }
    this.consume("DOUBLE_SEMI" /* DOUBLE_SEMI */, "Expected ';;'");
    return { type: "ClassDeclaration", name, superClass, methods, line: essenceToken.line };
  }
  // ponder condition :: body ;; otherwise :: body ;;
  parsePonderStatement() {
    const ponderToken = this.consume("PONDER" /* PONDER */, "Expected 'ponder'");
    const condition = this.parseExpression();
    const thenBranch = this.parseBlockStatement();
    let elseBranch;
    if (this.match("OTHERWISE" /* OTHERWISE */)) {
      if (this.check("PONDER" /* PONDER */)) {
        elseBranch = this.parsePonderStatement();
      } else {
        elseBranch = this.parseBlockStatement();
      }
    }
    return { type: "IfStatement", condition, thenBranch, elseBranch, line: ponderToken.line };
  }
  // cycle condition :: body ;;
  parseCycleStatement() {
    const cycleToken = this.consume("CYCLE" /* CYCLE */, "Expected 'cycle'");
    const condition = this.parseExpression();
    const body = this.parseBlockStatement();
    return { type: "WhileStatement", condition, body, line: cycleToken.line };
  }
  // iterate item through list :: body ;;
  parseIterateStatement() {
    const iterateToken = this.consume("ITERATE" /* ITERATE */, "Expected 'iterate'");
    const variable = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected variable name").value;
    this.consume("THROUGH" /* THROUGH */, "Expected 'through'");
    const iterable = this.parseExpression();
    const body = this.parseBlockStatement();
    return { type: "ForEachStatement", variable, iterable, body, line: iterateToken.line };
  }
  // within item be iterable :: body ;;
  parseWithinStatement() {
    const withinToken = this.consume("WITHIN" /* WITHIN */, "Expected 'within'");
    const variable = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected variable name").value;
    this.consume("BE" /* BE */, "Expected 'be'");
    const iterable = this.parseExpression();
    const body = this.parseBlockStatement();
    return { type: "ForInStatement", variable, iterable, body, line: withinToken.line };
  }
  // yield value
  parseYieldStatement() {
    const yieldToken = this.consume("YIELD" /* YIELD */, "Expected 'yield'");
    let value;
    if (!this.check("DOUBLE_SEMI" /* DOUBLE_SEMI */) && !this.isAtEnd()) {
      if (!this.check("FORGE" /* FORGE */) && !this.check("CONJURE" /* CONJURE */) && !this.check("PONDER" /* PONDER */) && !this.check("CYCLE" /* CYCLE */)) {
        value = this.parseExpression();
      }
    }
    return { type: "ReturnStatement", value, line: yieldToken.line };
  }
  // yeet (break)
  parseYeetStatement() {
    const t = this.consume("YEET" /* YEET */, "Expected 'yeet'");
    return { type: "BreakStatement", line: t.line };
  }
  // skip (continue)
  parseSkipStatement() {
    const t = this.consume("SKIP" /* SKIP */, "Expected 'skip'");
    return { type: "ContinueStatement", line: t.line };
  }
  // attempt :: body ;; rescue err :: body ;;
  parseAttemptStatement() {
    const attemptToken = this.consume("ATTEMPT" /* ATTEMPT */, "Expected 'attempt'");
    const tryBlock = this.parseBlockStatement();
    this.consume("RESCUE" /* RESCUE */, "Expected 'rescue' after attempt block");
    const errorVar = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected error variable name").value;
    const catchBlock = this.parseBlockStatement();
    return { type: "TryStatement", tryBlock, errorVar, catchBlock, line: attemptToken.line };
  }
  // :: statements ;;
  parseBlockStatement() {
    const colonToken = this.consume("DOUBLE_COLON" /* DOUBLE_COLON */, "Expected '::'");
    const statements = [];
    while (!this.check("DOUBLE_SEMI" /* DOUBLE_SEMI */) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    this.consume("DOUBLE_SEMI" /* DOUBLE_SEMI */, "Expected ';;'");
    return { type: "BlockStatement", statements, line: colonToken.line };
  }
  parseExpressionStatement() {
    const expr = this.parseExpression();
    if (this.match("BE" /* BE */)) {
      const value = this.parseExpression();
      if (expr.type === "Identifier") {
        return { type: "AssignStatement", name: expr.name, value, line: expr.line };
      }
      if (expr.type === "IndexExpr") {
        return { type: "IndexAssignStatement", object: expr.object, index: expr.index, value, line: expr.line };
      }
      if (expr.type === "MemberExpr") {
        return { type: "MemberAssignStatement", object: expr.object, property: expr.property, value, line: expr.line };
      }
      throw new SdevError("Invalid assignment target", expr.line);
    }
    return { type: "ExpressionStatement", expression: expr, line: expr.line };
  }
  parseExpression() {
    return this.parseTernary();
  }
  // Ternary: condition ~ thenExpr : elseExpr
  parseTernary() {
    let left = this.parsePipe();
    if (this.match("TILDE" /* TILDE */)) {
      const thenExpr = this.parsePipe();
      this.consume("COLON" /* COLON */, "Expected ':' in ternary expression");
      const elseExpr = this.parsePipe();
      return { type: "TernaryExpr", condition: left, thenExpr, elseExpr, line: left.line };
    }
    return left;
  }
  // Pipe operator |>
  parsePipe() {
    let left = this.parseOr();
    while (this.match("PIPE" /* PIPE */)) {
      const right = this.parseOr();
      if (right.type === "CallExpr") {
        right.args.unshift(left);
        left = right;
      } else if (right.type === "Identifier") {
        left = { type: "CallExpr", callee: right, args: [left], line: left.line };
      } else if (right.type === "LambdaExpr") {
        left = { type: "CallExpr", callee: right, args: [left], line: left.line };
      } else {
        left = { type: "CallExpr", callee: right, args: [left], line: left.line };
      }
    }
    return left;
  }
  parseOr() {
    let left = this.parseAnd();
    while (this.match("EITHER" /* EITHER */)) {
      const right = this.parseAnd();
      left = { type: "BinaryExpr", operator: "either", left, right, line: left.line };
    }
    return left;
  }
  parseAnd() {
    let left = this.parseEquality();
    while (this.match("ALSO" /* ALSO */)) {
      const right = this.parseEquality();
      left = { type: "BinaryExpr", operator: "also", left, right, line: left.line };
    }
    return left;
  }
  parseEquality() {
    let left = this.parseComparison();
    while (this.match("EQUALS" /* EQUALS */, "DIFFERS" /* DIFFERS */)) {
      const operator = this.previous().type === "EQUALS" /* EQUALS */ ? "equals" : "differs";
      const right = this.parseComparison();
      left = { type: "BinaryExpr", operator, left, right, line: left.line };
    }
    return left;
  }
  parseComparison() {
    let left = this.parseTerm();
    while (this.match("LESS" /* LESS */, "MORE" /* MORE */, "ATMOST" /* ATMOST */, "ATLEAST" /* ATLEAST */)) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      left = { type: "BinaryExpr", operator, left, right, line: left.line };
    }
    return left;
  }
  parseTerm() {
    let left = this.parseFactor();
    while (this.match("PLUS" /* PLUS */, "MINUS" /* MINUS */)) {
      const operator = this.previous().value;
      const right = this.parseFactor();
      left = { type: "BinaryExpr", operator, left, right, line: left.line };
    }
    return left;
  }
  parseFactor() {
    let left = this.parsePower();
    while (this.match("STAR" /* STAR */, "SLASH" /* SLASH */, "PERCENT" /* PERCENT */)) {
      const operator = this.previous().value;
      const right = this.parsePower();
      left = { type: "BinaryExpr", operator, left, right, line: left.line };
    }
    return left;
  }
  parsePower() {
    let left = this.parseUnary();
    while (this.match("CARET" /* CARET */)) {
      const right = this.parseUnary();
      left = { type: "BinaryExpr", operator: "^", left, right, line: left.line };
    }
    return left;
  }
  parseUnary() {
    if (this.match("MINUS" /* MINUS */, "ISNT" /* ISNT */)) {
      const operator = this.previous().value === "isnt" ? "isnt" : "-";
      const operand = this.parseUnary();
      return { type: "UnaryExpr", operator, operand, line: this.previous().line };
    }
    if (this.match("AWAIT" /* AWAIT */)) {
      const awaitLine = this.previous().line;
      const operand = this.parseUnary();
      return { type: "AwaitExpr", operand, line: awaitLine };
    }
    return this.parseCall();
  }
  parseCall() {
    let expr = this.parsePrimary();
    while (true) {
      if (this.match("LPAREN" /* LPAREN */)) {
        expr = this.finishCall(expr);
      } else if (this.match("LBRACKET" /* LBRACKET */)) {
        const index = this.parseExpression();
        this.consume("RBRACKET" /* RBRACKET */, "Expected ']'");
        expr = { type: "IndexExpr", object: expr, index, line: expr.line };
      } else if (this.match("DOT" /* DOT */)) {
        const property = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected property name").value;
        expr = { type: "MemberExpr", object: expr, property, line: expr.line };
      } else if (this.match("ARROW" /* ARROW */)) {
        if (expr.type === "Identifier") {
          let body;
          if (this.check("DOUBLE_COLON" /* DOUBLE_COLON */)) {
            body = this.parseBlockStatement();
          } else {
            body = this.parseExpression();
          }
          expr = { type: "LambdaExpr", params: [expr.name], body, line: expr.line };
        } else {
          throw new SdevError("Invalid lambda syntax", expr.line);
        }
      } else {
        break;
      }
    }
    return expr;
  }
  finishCall(callee) {
    const args2 = [];
    if (!this.check("RPAREN" /* RPAREN */)) {
      do {
        args2.push(this.parseExpression());
      } while (this.match("COMMA" /* COMMA */));
    }
    this.consume("RPAREN" /* RPAREN */, "Expected ')'");
    return { type: "CallExpr", callee, args: args2, line: callee.line };
  }
  parsePrimary() {
    const token = this.peek();
    if (this.match("NUMBER" /* NUMBER */)) {
      return { type: "NumberLiteral", value: parseFloat(token.value), line: token.line };
    }
    if (this.match("STRING" /* STRING */)) {
      return { type: "StringLiteral", value: token.value, line: token.line };
    }
    if (this.match("YEP" /* YEP */)) {
      return { type: "BooleanLiteral", value: true, line: token.line };
    }
    if (this.match("NOPE" /* NOPE */)) {
      return { type: "BooleanLiteral", value: false, line: token.line };
    }
    if (this.match("VOID" /* VOID */)) {
      return { type: "NullLiteral", line: token.line };
    }
    if (this.match("SELF" /* SELF */)) {
      return { type: "Identifier", name: "self", line: token.line };
    }
    if (this.match("SUPER" /* SUPER */)) {
      return { type: "Identifier", name: "super", line: token.line };
    }
    if (this.match("IDENTIFIER" /* IDENTIFIER */)) {
      return { type: "Identifier", name: token.value, line: token.line };
    }
    if (this.match("NEW" /* NEW */)) {
      const classExpr = this.parseCall();
      if (classExpr.type === "CallExpr") {
        return { type: "NewExpr", className: classExpr.callee, args: classExpr.args, line: token.line };
      }
      return { type: "NewExpr", className: classExpr, args: [], line: token.line };
    }
    if (this.match("LPAREN" /* LPAREN */)) {
      const exprs = [];
      const names = [];
      let isLambdaParams = true;
      if (!this.check("RPAREN" /* RPAREN */)) {
        do {
          const expr = this.parseExpression();
          exprs.push(expr);
          if (expr.type !== "Identifier") isLambdaParams = false;
          else names.push(expr.name);
        } while (this.match("COMMA" /* COMMA */));
      }
      this.consume("RPAREN" /* RPAREN */, "Expected ')'");
      if (this.match("ARROW" /* ARROW */)) {
        if (!isLambdaParams) {
          throw new SdevError("Invalid lambda parameters", token.line);
        }
        let body;
        if (this.check("DOUBLE_COLON" /* DOUBLE_COLON */)) {
          body = this.parseBlockStatement();
        } else {
          body = this.parseExpression();
        }
        return { type: "LambdaExpr", params: names, body, line: token.line };
      }
      if (exprs.length === 1) return exprs[0];
      if (exprs.length === 0) throw new SdevError("Empty parentheses", token.line);
      throw new SdevError("Unexpected multiple expressions", token.line);
    }
    if (this.match("LBRACKET" /* LBRACKET */)) {
      return this.parseArrayLiteral(token.line);
    }
    if (this.check("DOUBLE_COLON" /* DOUBLE_COLON */)) {
      const savedPos = this.pos;
      this.advance();
      if (this.check("DOUBLE_SEMI" /* DOUBLE_SEMI */)) {
        this.advance();
        return { type: "DictLiteral", entries: [], line: token.line };
      }
      this.pos = savedPos;
      this.advance();
      return this.parseDictLiteral(token.line);
    }
    throw new SdevError(`Unexpected token: '${token.value}'`, token.line, token.column);
  }
  parseArrayLiteral(line) {
    const elements = [];
    if (!this.check("RBRACKET" /* RBRACKET */)) {
      do {
        if (this.check("RBRACKET" /* RBRACKET */)) break;
        elements.push(this.parseExpression());
      } while (this.match("COMMA" /* COMMA */));
    }
    this.consume("RBRACKET" /* RBRACKET */, "Expected ']'");
    return { type: "ArrayLiteral", elements, line };
  }
  parseDictLiteral(line) {
    const entries = [];
    if (!this.check("DOUBLE_SEMI" /* DOUBLE_SEMI */)) {
      do {
        if (this.check("DOUBLE_SEMI" /* DOUBLE_SEMI */)) break;
        const key = this.parseExpression();
        this.consume("COLON" /* COLON */, "Expected ':'");
        const value = this.parseExpression();
        entries.push({ key, value });
      } while (this.match("COMMA" /* COMMA */));
    }
    this.consume("DOUBLE_SEMI" /* DOUBLE_SEMI */, "Expected ';;'");
    return { type: "DictLiteral", entries, line };
  }
  // Helper methods
  peek() {
    return this.tokens[this.pos];
  }
  previous() {
    return this.tokens[this.pos - 1];
  }
  isAtEnd() {
    return this.peek().type === "EOF" /* EOF */;
  }
  advance() {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }
  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }
  /** Check if current token is IDENTIFIER with a specific value */
  checkIdentifierValue(value) {
    if (this.isAtEnd()) return false;
    const t = this.peek();
    return t.type === "IDENTIFIER" /* IDENTIFIER */ && t.value === value;
  }
  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }
  consume(type, message) {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new SdevError(message + ` (got '${token.value}')`, token.line, token.column);
  }
};

// src/lang/bytecode.ts
var BYTECODE_VERSION = 2;
var BYTECODE_MAGIC = 1396983126;
function disassemble(fn, indent = "") {
  const lines = [];
  const label = fn.name ? `<func ${fn.name}(${fn.params.join(", ")})>` : "<main>";
  lines.push(`${indent}${label}:`);
  fn.code.forEach((ins, i) => {
    const op = ins.op.padEnd(18);
    const operand = ins.operand !== void 0 ? String(ins.operand) : "";
    lines.push(`${indent}  ${String(i).padStart(4, "0")}  ${op} ${operand}`);
  });
  for (const nested of fn.functions) {
    lines.push("");
    lines.push(disassemble(nested, indent + "  "));
  }
  return lines.join("\n");
}

// src/lang/compiler.ts
var FunctionCompiler = class {
  code = [];
  functions = [];
  name;
  params;
  constructor(name, params) {
    this.name = name;
    this.params = params;
  }
  emit(op, operand, line) {
    this.code.push({ op, operand, line });
    return this.code.length - 1;
  }
  emitJump(op, line) {
    return this.emit(op, -1, line);
  }
  patchJump(jumpIndex) {
    this.code[jumpIndex].operand = this.code.length;
  }
  currentPos() {
    return this.code.length;
  }
};
var Compiler = class {
  constants = { numbers: [], strings: [] };
  debugInfo = { sourceMap: [], localNames: [] };
  compile(program) {
    this.constants = { numbers: [], strings: [] };
    this.debugInfo = { sourceMap: [], localNames: [] };
    const fn = new FunctionCompiler("", []);
    this.compileStatements(program.statements, fn);
    fn.emit("HALT" /* HALT */, void 0, 0);
    return {
      version: BYTECODE_VERSION,
      magic: BYTECODE_MAGIC,
      entry: { name: "", params: [], code: fn.code, functions: fn.functions },
      constants: this.constants,
      debug: this.debugInfo
    };
  }
  compileStatements(stmts, fn) {
    for (const stmt of stmts) {
      this.compileNode(stmt, fn);
    }
  }
  compileNode(node, fn) {
    switch (node.type) {
      case "Program":
        this.compileStatements(node.statements, fn);
        break;
      case "NumberLiteral":
        fn.emit("PUSH_NUM" /* PUSH_NUM */, node.value, node.line);
        break;
      case "StringLiteral":
        fn.emit("PUSH_STR" /* PUSH_STR */, node.value, node.line);
        break;
      case "BooleanLiteral":
        fn.emit("PUSH_BOOL" /* PUSH_BOOL */, node.value, node.line);
        break;
      case "NullLiteral":
        fn.emit("PUSH_NULL" /* PUSH_NULL */, void 0, node.line);
        break;
      case "Identifier":
        fn.emit("LOAD" /* LOAD */, node.name, node.line);
        break;
      case "LetStatement":
        this.compileNode(node.value, fn);
        fn.emit("DEFINE" /* DEFINE */, node.name, node.line);
        break;
      case "AssignStatement":
        this.compileNode(node.value, fn);
        fn.emit("STORE" /* STORE */, node.name, node.line);
        break;
      case "IndexAssignStatement":
        this.compileNode(node.object, fn);
        this.compileNode(node.index, fn);
        this.compileNode(node.value, fn);
        fn.emit("INDEX_SET" /* INDEX_SET */, void 0, node.line);
        break;
      case "MemberAssignStatement":
        this.compileNode(node.object, fn);
        this.compileNode(node.value, fn);
        fn.emit("MEMBER_SET" /* MEMBER_SET */, node.property, node.line);
        break;
      case "ExpressionStatement":
        this.compileNode(node.expression, fn);
        fn.emit("POP" /* POP */, void 0, node.line);
        break;
      case "BinaryExpr":
        this.compileBinary(node, fn);
        break;
      case "UnaryExpr":
        this.compileNode(node.operand, fn);
        if (node.operator === "-") fn.emit("NEG" /* NEG */, void 0, node.line);
        else if (node.operator === "isnt") fn.emit("NOT" /* NOT */, void 0, node.line);
        else throw new SdevError(`Unknown unary op: ${node.operator}`, node.line);
        break;
      case "TernaryExpr":
        this.compileNode(node.condition, fn);
        const jumpFalseT = fn.emitJump("JUMP_IF_FALSE" /* JUMP_IF_FALSE */, node.line);
        this.compileNode(node.thenExpr, fn);
        const jumpEndT = fn.emitJump("JUMP" /* JUMP */, node.line);
        fn.patchJump(jumpFalseT);
        this.compileNode(node.elseExpr, fn);
        fn.patchJump(jumpEndT);
        break;
      case "CallExpr":
        this.compileNode(node.callee, fn);
        for (const arg of node.args) this.compileNode(arg, fn);
        fn.emit("CALL" /* CALL */, node.args.length, node.line);
        break;
      case "IndexExpr":
        this.compileNode(node.object, fn);
        this.compileNode(node.index, fn);
        fn.emit("INDEX_GET" /* INDEX_GET */, void 0, node.line);
        break;
      case "MemberExpr":
        this.compileNode(node.object, fn);
        fn.emit("MEMBER_GET" /* MEMBER_GET */, node.property, node.line);
        break;
      case "ArrayLiteral":
        for (const el of node.elements) this.compileNode(el, fn);
        fn.emit("MAKE_LIST" /* MAKE_LIST */, node.elements.length, node.line);
        break;
      case "DictLiteral":
        for (const entry of node.entries) {
          this.compileNode(entry.key, fn);
          this.compileNode(entry.value, fn);
        }
        fn.emit("MAKE_DICT" /* MAKE_DICT */, node.entries.length, node.line);
        break;
      case "LambdaExpr": {
        const lambdaFn = new FunctionCompiler("<lambda>", node.params);
        if (node.body.type === "BlockStatement") {
          this.compileStatements(node.body.statements, lambdaFn);
          lambdaFn.emit("PUSH_NULL" /* PUSH_NULL */, void 0, node.line);
          lambdaFn.emit("RETURN" /* RETURN */, void 0, node.line);
        } else {
          this.compileNode(node.body, lambdaFn);
          lambdaFn.emit("RETURN" /* RETURN */, void 0, node.line);
        }
        const def = { name: "<lambda>", params: node.params, code: lambdaFn.code, functions: lambdaFn.functions };
        const idx = fn.functions.length;
        fn.functions.push(def);
        fn.emit("MAKE_FUNC" /* MAKE_FUNC */, idx, node.line);
        break;
      }
      case "FuncDeclaration": {
        const funcFn = new FunctionCompiler(node.name, node.params);
        this.compileStatements(node.body.statements, funcFn);
        funcFn.emit("PUSH_NULL" /* PUSH_NULL */, void 0, node.line);
        funcFn.emit("RETURN" /* RETURN */, void 0, node.line);
        const def = { name: node.name, params: node.params, code: funcFn.code, functions: funcFn.functions };
        const idx = fn.functions.length;
        fn.functions.push(def);
        fn.emit("MAKE_FUNC" /* MAKE_FUNC */, idx, node.line);
        fn.emit("DEFINE" /* DEFINE */, node.name, node.line);
        break;
      }
      case "ReturnStatement":
        if (node.value) this.compileNode(node.value, fn);
        else fn.emit("PUSH_NULL" /* PUSH_NULL */, void 0, node.line);
        fn.emit("RETURN" /* RETURN */, void 0, node.line);
        break;
      case "BlockStatement":
        this.compileStatements(node.statements, fn);
        break;
      case "IfStatement":
        this.compileIf(node, fn);
        break;
      case "WhileStatement":
        this.compileWhile(node, fn);
        break;
      case "ForEachStatement":
        this.compileForEach(node, fn);
        break;
      case "ForInStatement":
        this.compileForIn(node, fn);
        break;
      case "TryStatement":
        this.compileTryCatch(node, fn);
        break;
      case "BreakStatement":
        fn.emit("NOP" /* NOP */, void 0, node.line);
        break;
      case "ContinueStatement":
        fn.emit("NOP" /* NOP */, void 0, node.line);
        break;
      case "ClassDeclaration":
        this.compileClass(node, fn);
        break;
      case "NewExpr":
        this.compileNode(node.className, fn);
        for (const arg of node.args) this.compileNode(arg, fn);
        fn.emit("CALL" /* CALL */, node.args.length + 0, node.line);
        break;
      case "AwaitExpr":
        this.compileNode(node.operand, fn);
        break;
      default:
        throw new SdevError(`Compiler: unknown node type ${node.type}`, 0);
    }
  }
  compileBinary(node, fn) {
    if (node.operator === "also") {
      this.compileNode(node.left, fn);
      fn.emit("DUP" /* DUP */, void 0, node.line);
      const jumpFalse = fn.emitJump("JUMP_IF_FALSE" /* JUMP_IF_FALSE */, node.line);
      fn.emit("POP" /* POP */, void 0, node.line);
      this.compileNode(node.right, fn);
      fn.patchJump(jumpFalse);
      return;
    }
    if (node.operator === "either") {
      this.compileNode(node.left, fn);
      fn.emit("DUP" /* DUP */, void 0, node.line);
      const jumpTrue = fn.emitJump("JUMP_IF_TRUE" /* JUMP_IF_TRUE */, node.line);
      fn.emit("POP" /* POP */, void 0, node.line);
      this.compileNode(node.right, fn);
      fn.patchJump(jumpTrue);
      return;
    }
    if (node.operator === "|>") {
      this.compileNode(node.left, fn);
      this.compileNode(node.right, fn);
      fn.emit("SWAP" /* SWAP */, void 0, node.line);
      fn.emit("CALL" /* CALL */, 1, node.line);
      return;
    }
    this.compileNode(node.left, fn);
    this.compileNode(node.right, fn);
    const opMap = {
      "+": "ADD" /* ADD */,
      "-": "SUB" /* SUB */,
      "*": "MUL" /* MUL */,
      "/": "DIV" /* DIV */,
      "%": "MOD" /* MOD */,
      "^": "POW" /* POW */,
      "equals": "EQ" /* EQ */,
      "differs": "NEQ" /* NEQ */,
      "<>": "NEQ" /* NEQ */,
      "<": "LT" /* LT */,
      ">": "GT" /* GT */,
      "<=": "LTE" /* LTE */,
      ">=": "GTE" /* GTE */,
      "==": "EQ" /* EQ */,
      "!=": "NEQ" /* NEQ */,
      "&": "BIT_AND" /* BIT_AND */,
      "|": "BIT_OR" /* BIT_OR */,
      "~": "BIT_XOR" /* BIT_XOR */,
      "<<": "BIT_SHL" /* BIT_SHL */,
      ">>": "BIT_SHR" /* BIT_SHR */
    };
    const op = opMap[node.operator];
    if (!op) throw new SdevError(`Unknown binary op: ${node.operator}`, node.line);
    fn.emit(op, void 0, node.line);
  }
  compileIf(node, fn) {
    this.compileNode(node.condition, fn);
    const jumpFalse = fn.emitJump("JUMP_IF_FALSE" /* JUMP_IF_FALSE */, node.line);
    this.compileStatements(node.thenBranch.statements, fn);
    if (node.elseBranch) {
      const jumpEnd = fn.emitJump("JUMP" /* JUMP */, node.line);
      fn.patchJump(jumpFalse);
      this.compileNode(node.elseBranch, fn);
      fn.patchJump(jumpEnd);
    } else {
      fn.patchJump(jumpFalse);
    }
  }
  compileWhile(node, fn) {
    const loopStart = fn.currentPos();
    this.compileNode(node.condition, fn);
    const exitJump = fn.emitJump("JUMP_IF_FALSE" /* JUMP_IF_FALSE */, node.line);
    this.compileStatements(node.body.statements, fn);
    fn.emit("JUMP" /* JUMP */, loopStart, node.line);
    fn.patchJump(exitJump);
  }
  compileForEach(node, fn) {
    const iterVar = `__iter_${node.line}`;
    const idxVar = `__idx_${node.line}`;
    this.compileNode(node.iterable, fn);
    fn.emit("DEFINE" /* DEFINE */, iterVar, node.line);
    fn.emit("PUSH_NUM" /* PUSH_NUM */, 0, node.line);
    fn.emit("DEFINE" /* DEFINE */, idxVar, node.line);
    const loopStart = fn.currentPos();
    fn.emit("LOAD" /* LOAD */, "len", node.line);
    fn.emit("LOAD" /* LOAD */, iterVar, node.line);
    fn.emit("CALL" /* CALL */, 1, node.line);
    fn.emit("LOAD" /* LOAD */, idxVar, node.line);
    fn.emit("GT" /* GT */, void 0, node.line);
    const exitJump = fn.emitJump("JUMP_IF_FALSE" /* JUMP_IF_FALSE */, node.line);
    fn.emit("LOAD" /* LOAD */, iterVar, node.line);
    fn.emit("LOAD" /* LOAD */, idxVar, node.line);
    fn.emit("INDEX_GET" /* INDEX_GET */, void 0, node.line);
    fn.emit("DEFINE" /* DEFINE */, node.variable, node.line);
    this.compileStatements(node.body.statements, fn);
    fn.emit("LOAD" /* LOAD */, idxVar, node.line);
    fn.emit("PUSH_NUM" /* PUSH_NUM */, 1, node.line);
    fn.emit("ADD" /* ADD */, void 0, node.line);
    fn.emit("STORE" /* STORE */, idxVar, node.line);
    fn.emit("JUMP" /* JUMP */, loopStart, node.line);
    fn.patchJump(exitJump);
  }
  compileForIn(node, fn) {
    const iterVar = `__iter_${node.line}`;
    const idxVar = `__idx_${node.line}`;
    this.compileNode(node.iterable, fn);
    fn.emit("DEFINE" /* DEFINE */, iterVar, node.line);
    fn.emit("PUSH_NUM" /* PUSH_NUM */, 0, node.line);
    fn.emit("DEFINE" /* DEFINE */, idxVar, node.line);
    const loopStart = fn.currentPos();
    fn.emit("LOAD" /* LOAD */, "len", node.line);
    fn.emit("LOAD" /* LOAD */, iterVar, node.line);
    fn.emit("CALL" /* CALL */, 1, node.line);
    fn.emit("LOAD" /* LOAD */, idxVar, node.line);
    fn.emit("GT" /* GT */, void 0, node.line);
    const exitJump = fn.emitJump("JUMP_IF_FALSE" /* JUMP_IF_FALSE */, node.line);
    fn.emit("LOAD" /* LOAD */, iterVar, node.line);
    fn.emit("LOAD" /* LOAD */, idxVar, node.line);
    fn.emit("INDEX_GET" /* INDEX_GET */, void 0, node.line);
    fn.emit("DEFINE" /* DEFINE */, node.variable, node.line);
    this.compileStatements(node.body.statements, fn);
    fn.emit("LOAD" /* LOAD */, idxVar, node.line);
    fn.emit("PUSH_NUM" /* PUSH_NUM */, 1, node.line);
    fn.emit("ADD" /* ADD */, void 0, node.line);
    fn.emit("STORE" /* STORE */, idxVar, node.line);
    fn.emit("JUMP" /* JUMP */, loopStart, node.line);
    fn.patchJump(exitJump);
  }
  compileTryCatch(node, fn) {
    const tryFn = new FunctionCompiler("<try>", []);
    this.compileStatements(node.tryBlock.statements, tryFn);
    tryFn.emit("PUSH_NULL" /* PUSH_NULL */, void 0, node.line);
    tryFn.emit("RETURN" /* RETURN */, void 0, node.line);
    const tryDef = { name: "<try>", params: [], code: tryFn.code, functions: tryFn.functions };
    const tryIdx = fn.functions.length;
    fn.functions.push(tryDef);
    const catchFn = new FunctionCompiler("<catch>", [node.errorVar]);
    this.compileStatements(node.catchBlock.statements, catchFn);
    catchFn.emit("PUSH_NULL" /* PUSH_NULL */, void 0, node.line);
    catchFn.emit("RETURN" /* RETURN */, void 0, node.line);
    const catchDef = { name: "<catch>", params: [node.errorVar], code: catchFn.code, functions: catchFn.functions };
    const catchIdx = fn.functions.length;
    fn.functions.push(catchDef);
    fn.emit("LOAD" /* LOAD */, "__tryCatch", node.line);
    fn.emit("MAKE_FUNC" /* MAKE_FUNC */, tryIdx, node.line);
    fn.emit("MAKE_FUNC" /* MAKE_FUNC */, catchIdx, node.line);
    fn.emit("CALL" /* CALL */, 2, node.line);
    fn.emit("POP" /* POP */, void 0, node.line);
  }
  compileClass(node, fn) {
    const ctorFn = new FunctionCompiler(node.name, []);
    const initMethod = node.methods.find((m) => m.name === "init");
    const otherMethods = node.methods.filter((m) => m.name !== "init");
    if (initMethod) {
      ctorFn.params = initMethod.params.filter((p) => p !== "self");
    }
    ctorFn.emit("MAKE_DICT" /* MAKE_DICT */, 0, node.line);
    ctorFn.emit("DEFINE" /* DEFINE */, "self", node.line);
    if (initMethod) {
      for (const stmt of initMethod.body.statements) {
        this.compileNode(stmt, ctorFn);
      }
    }
    for (const method of otherMethods) {
      const methodFn = new FunctionCompiler(method.name, method.params);
      this.compileStatements(method.body.statements, methodFn);
      methodFn.emit("PUSH_NULL" /* PUSH_NULL */, void 0, node.line);
      methodFn.emit("RETURN" /* RETURN */, void 0, node.line);
      const methodDef = { name: method.name, params: method.params, code: methodFn.code, functions: methodFn.functions };
      const methodIdx = ctorFn.functions.length;
      ctorFn.functions.push(methodDef);
      ctorFn.emit("LOAD" /* LOAD */, "self", node.line);
      ctorFn.emit("MAKE_FUNC" /* MAKE_FUNC */, methodIdx, node.line);
      ctorFn.emit("MEMBER_SET" /* MEMBER_SET */, method.name, node.line);
    }
    ctorFn.emit("LOAD" /* LOAD */, "self", node.line);
    ctorFn.emit("RETURN" /* RETURN */, void 0, node.line);
    const def = { name: node.name, params: ctorFn.params, code: ctorFn.code, functions: ctorFn.functions };
    const idx = fn.functions.length;
    fn.functions.push(def);
    fn.emit("MAKE_FUNC" /* MAKE_FUNC */, idx, node.line);
    fn.emit("DEFINE" /* DEFINE */, node.name, node.line);
  }
};

// src/lang/builtins.ts
function createBuiltins(output) {
  const builtins = /* @__PURE__ */ new Map();
  builtins.set("speak", {
    type: "builtin",
    call: (args2) => {
      const message = args2.map(stringify).join(" ");
      output(message);
      return null;
    }
  });
  builtins.set("whisper", {
    type: "builtin",
    call: (args2) => {
      const message = args2.map(stringify).join("");
      output(message);
      return null;
    }
  });
  builtins.set("shout", {
    type: "builtin",
    call: (args2) => {
      const message = args2.map(stringify).join(" ").toUpperCase();
      output(message);
      return null;
    }
  });
  builtins.set("measure", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) {
        throw new SdevError("measure() takes exactly 1 argument", line);
      }
      const arg = args2[0];
      if (typeof arg === "string") return arg.length;
      if (Array.isArray(arg)) return arg.length;
      if (arg && typeof arg === "object") return Object.keys(arg).length;
      throw new SdevError("measure() argument must be string, list, or dict", line);
    }
  });
  builtins.set("morph", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("morph() takes 2 arguments (value, type)", line);
      const val = args2[0];
      const targetType = args2[1];
      if (typeof targetType !== "string") throw new SdevError("Second argument must be type name", line);
      switch (targetType) {
        case "number":
          if (typeof val === "number") return val;
          if (typeof val === "string") {
            const num = parseFloat(val);
            if (isNaN(num)) throw new SdevError(`Cannot morph '${val}' to number`, line);
            return num;
          }
          throw new SdevError("Cannot morph to number", line);
        case "text":
          return stringify(val);
        case "truth":
          return isTruthy(val);
        default:
          throw new SdevError(`Unknown type: ${targetType}`, line);
      }
    }
  });
  builtins.set("sequence", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 1 || args2.length > 3) {
        throw new SdevError("sequence() takes 1 to 3 arguments", line);
      }
      let start = 0, end = 0, step = 1;
      if (args2.length === 1) {
        end = toNumber(args2[0], line);
      } else if (args2.length === 2) {
        start = toNumber(args2[0], line);
        end = toNumber(args2[1], line);
      } else {
        start = toNumber(args2[0], line);
        end = toNumber(args2[1], line);
        step = toNumber(args2[2], line);
      }
      if (step === 0) throw new SdevError("sequence() step cannot be 0", line);
      const result = [];
      if (step > 0) {
        for (let i = start; i < end; i += step) result.push(i);
      } else {
        for (let i = start; i > end; i += step) result.push(i);
      }
      return result;
    }
  });
  builtins.set("each", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("each() takes 2 arguments (list, transform)", line);
      const arr = args2[0];
      const fn = args2[1];
      if (!Array.isArray(arr)) throw new SdevError("First argument must be a list", line);
      if (!fn || typeof fn !== "object" || !("call" in fn)) {
        throw new SdevError("Second argument must be a function", line);
      }
      return arr.map((item, idx) => {
        try {
          return fn.call([item, idx], line);
        } catch {
          return fn.call([item], line);
        }
      });
    }
  });
  builtins.set("sift", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("sift() takes 2 arguments (list, predicate)", line);
      const arr = args2[0];
      const fn = args2[1];
      if (!Array.isArray(arr)) throw new SdevError("First argument must be a list", line);
      if (!fn || typeof fn !== "object" || !("call" in fn)) {
        throw new SdevError("Second argument must be a function", line);
      }
      return arr.filter((item) => isTruthy(fn.call([item], line)));
    }
  });
  builtins.set("fold", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 3) throw new SdevError("fold() takes 3 arguments (list, initial, reducer)", line);
      const arr = args2[0];
      let acc = args2[1];
      const fn = args2[2];
      if (!Array.isArray(arr)) throw new SdevError("First argument must be a list", line);
      if (!fn || typeof fn !== "object" || !("call" in fn)) {
        throw new SdevError("Third argument must be a function", line);
      }
      for (const item of arr) {
        acc = fn.call([acc, item], line);
      }
      return acc;
    }
  });
  builtins.set("gather", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("gather() takes 2 arguments", line);
      const arr = args2[0];
      if (!Array.isArray(arr)) throw new SdevError("First argument must be a list", line);
      arr.push(args2[1]);
      return arr;
    }
  });
  builtins.set("pluck", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("pluck() takes 1 argument", line);
      const arr = args2[0];
      if (!Array.isArray(arr)) throw new SdevError("Argument must be a list", line);
      if (arr.length === 0) throw new SdevError("Cannot pluck from empty list", line);
      return arr.pop();
    }
  });
  builtins.set("portion", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2 || args2.length > 3) {
        throw new SdevError("portion() takes 2 or 3 arguments", line);
      }
      const arr = args2[0];
      if (!Array.isArray(arr) && typeof arr !== "string") {
        throw new SdevError("First argument must be a list or string", line);
      }
      const start = toNumber(args2[1], line);
      const end = args2.length === 3 ? toNumber(args2[2], line) : void 0;
      return arr.slice(start, end);
    }
  });
  builtins.set("weave", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("weave() takes 2 arguments", line);
      const arr = args2[0];
      if (!Array.isArray(arr)) throw new SdevError("First argument must be a list", line);
      const sep = args2[1];
      if (typeof sep !== "string") throw new SdevError("Second argument must be a string", line);
      return arr.map(stringify).join(sep);
    }
  });
  builtins.set("shatter", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("shatter() takes 2 arguments", line);
      const str = args2[0];
      if (typeof str !== "string") throw new SdevError("First argument must be a string", line);
      const sep = args2[1];
      if (typeof sep !== "string") throw new SdevError("Second argument must be a string", line);
      return str.split(sep);
    }
  });
  builtins.set("essence", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("essence() takes 1 argument", line);
      const val = args2[0];
      if (val === null) return "void";
      if (typeof val === "number") return "number";
      if (typeof val === "string") return "text";
      if (typeof val === "boolean") return "truth";
      if (Array.isArray(val)) return "list";
      if (typeof val === "object") {
        if (val.type === "builtin" || val.type === "user" || val.type === "lambda") {
          return "conjuration";
        }
        return "tome";
      }
      return "mystery";
    }
  });
  builtins.set("magnitude", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("magnitude() takes 1 argument", line);
      return Math.abs(toNumber(args2[0], line));
    }
  });
  builtins.set("least", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length === 0) throw new SdevError("least() takes at least 1 argument", line);
      if (args2.length === 1 && Array.isArray(args2[0])) {
        return Math.min(...args2[0].map((x) => toNumber(x, line)));
      }
      return Math.min(...args2.map((x) => toNumber(x, line)));
    }
  });
  builtins.set("greatest", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length === 0) throw new SdevError("greatest() takes at least 1 argument", line);
      if (args2.length === 1 && Array.isArray(args2[0])) {
        return Math.max(...args2[0].map((x) => toNumber(x, line)));
      }
      return Math.max(...args2.map((x) => toNumber(x, line)));
    }
  });
  builtins.set("root", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("root() takes 1 argument", line);
      return Math.sqrt(toNumber(args2[0], line));
    }
  });
  builtins.set("ground", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("ground() takes 1 argument", line);
      return Math.floor(toNumber(args2[0], line));
    }
  });
  builtins.set("elevate", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("elevate() takes 1 argument", line);
      return Math.ceil(toNumber(args2[0], line));
    }
  });
  builtins.set("nearby", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("nearby() takes 1 argument", line);
      return Math.round(toNumber(args2[0], line));
    }
  });
  builtins.set("chaos", {
    type: "builtin",
    call: () => Math.random()
  });
  builtins.set("inscriptions", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("inscriptions() takes 1 argument", line);
      const obj = args2[0];
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        throw new SdevError("Argument must be a tome (dict)", line);
      }
      return Object.keys(obj);
    }
  });
  builtins.set("contents", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("contents() takes 1 argument", line);
      const obj = args2[0];
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        throw new SdevError("Argument must be a tome (dict)", line);
      }
      return Object.values(obj);
    }
  });
  builtins.set("upper", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("upper() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].toUpperCase();
    }
  });
  builtins.set("lower", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("lower() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].toLowerCase();
    }
  });
  builtins.set("trim", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("trim() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].trim();
    }
  });
  builtins.set("reverse", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("reverse() takes 1 argument", line);
      const val = args2[0];
      if (typeof val === "string") return val.split("").reverse().join("");
      if (Array.isArray(val)) return [...val].reverse();
      throw new SdevError("Argument must be text or list", line);
    }
  });
  builtins.set("contains", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("contains() takes 2 arguments", line);
      const haystack = args2[0];
      const needle = args2[1];
      if (typeof haystack === "string" && typeof needle === "string") {
        return haystack.includes(needle);
      }
      if (Array.isArray(haystack)) {
        return haystack.some((item) => JSON.stringify(item) === JSON.stringify(needle));
      }
      if (haystack && typeof haystack === "object") {
        const key = String(needle);
        return key in haystack;
      }
      throw new SdevError("First argument must be text, list, or tome", line);
    }
  });
  builtins.set("len", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("len() takes 1 argument", line);
      const arg = args2[0];
      if (typeof arg === "string") return arg.length;
      if (Array.isArray(arg)) return arg.length;
      if (arg && typeof arg === "object") return Object.keys(arg).length;
      throw new SdevError("len() argument must be string, list, or dict", line);
    }
  });
  builtins.set("gettype", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("gettype() takes 1 argument", line);
      const val = args2[0];
      if (val === null) return "void";
      if (typeof val === "number") return "number";
      if (typeof val === "string") return "text";
      if (typeof val === "boolean") return "truth";
      if (Array.isArray(val)) return "list";
      if (typeof val === "object") {
        if (val.type === "builtin" || val.type === "user" || val.type === "lambda") return "conjuration";
        if (val.type === "class") return "class";
        return "tome";
      }
      return "mystery";
    }
  });
  builtins.set("sin", { type: "builtin", call: (args2) => Math.sin(args2[0]) });
  builtins.set("cos", { type: "builtin", call: (args2) => Math.cos(args2[0]) });
  builtins.set("tan", { type: "builtin", call: (args2) => Math.tan(args2[0]) });
  builtins.set("log", { type: "builtin", call: (args2) => Math.log(args2[0]) });
  builtins.set("exp", { type: "builtin", call: (args2) => Math.exp(args2[0]) });
  builtins.set("PI", { type: "builtin", call: () => Math.PI });
  builtins.set("TAU", { type: "builtin", call: () => Math.PI * 2 });
  builtins.set("random", {
    type: "builtin",
    call: () => Math.random()
  });
  builtins.set("randint", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("randint() takes 2 arguments", line);
      const min = Math.ceil(args2[0]);
      const max = Math.floor(args2[1]);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  });
  builtins.set("pick", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("pick() takes 1 argument", line);
      const arr = args2[0];
      if (!Array.isArray(arr)) throw new SdevError("Argument must be a list", line);
      return arr[Math.floor(Math.random() * arr.length)] ?? null;
    }
  });
  builtins.set("shuffle", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("shuffle() takes 1 argument", line);
      const arr = args2[0];
      if (!Array.isArray(arr)) throw new SdevError("Argument must be a list", line);
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
  });
  builtins.set("etch", { type: "builtin", call: (args2) => JSON.stringify(args2[0]) });
  builtins.set("unetch", {
    type: "builtin",
    call: (args2, line) => {
      try {
        return JSON.parse(args2[0]);
      } catch {
        throw new SdevError("Invalid JSON", line);
      }
    }
  });
  builtins.set("replace", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 3) throw new SdevError("replace() takes 3 arguments (text, search, replacement)", line);
      if (typeof args2[0] !== "string") throw new SdevError("First argument must be text", line);
      if (typeof args2[1] !== "string") throw new SdevError("Second argument must be text", line);
      if (typeof args2[2] !== "string") throw new SdevError("Third argument must be text", line);
      return args2[0].split(args2[1]).join(args2[2]);
    }
  });
  builtins.set("startswith", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("startswith() takes 2 arguments", line);
      if (typeof args2[0] !== "string" || typeof args2[1] !== "string") {
        throw new SdevError("Arguments must be text", line);
      }
      return args2[0].startsWith(args2[1]);
    }
  });
  builtins.set("endswith", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("endswith() takes 2 arguments", line);
      if (typeof args2[0] !== "string" || typeof args2[1] !== "string") {
        throw new SdevError("Arguments must be text", line);
      }
      return args2[0].endsWith(args2[1]);
    }
  });
  builtins.set("repeat", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("repeat() takes 2 arguments (text, count)", line);
      if (typeof args2[0] !== "string") throw new SdevError("First argument must be text", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      return args2[0].repeat(Math.max(0, Math.floor(args2[1])));
    }
  });
  builtins.set("padleft", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2 || args2.length > 3) throw new SdevError("padleft() takes 2-3 arguments", line);
      if (typeof args2[0] !== "string") throw new SdevError("First argument must be text", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      const pad = args2.length === 3 ? String(args2[2]) : " ";
      return args2[0].padStart(args2[1], pad);
    }
  });
  builtins.set("padright", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2 || args2.length > 3) throw new SdevError("padright() takes 2-3 arguments", line);
      if (typeof args2[0] !== "string") throw new SdevError("First argument must be text", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      const pad = args2.length === 3 ? String(args2[2]) : " ";
      return args2[0].padEnd(args2[1], pad);
    }
  });
  builtins.set("charAt", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("charAt() takes 2 arguments (text, index)", line);
      if (typeof args2[0] !== "string") throw new SdevError("First argument must be text", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      const str = args2[0];
      const idx = args2[1] < 0 ? str.length + args2[1] : args2[1];
      return str[idx] ?? "";
    }
  });
  builtins.set("indexOf", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("indexOf() takes 2 arguments", line);
      if (typeof args2[0] === "string" && typeof args2[1] === "string") {
        return args2[0].indexOf(args2[1]);
      }
      if (Array.isArray(args2[0])) {
        return args2[0].findIndex(
          (item) => JSON.stringify(item) === JSON.stringify(args2[1])
        );
      }
      throw new SdevError("First argument must be text or list", line);
    }
  });
  builtins.set("lastIndexOf", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("lastIndexOf() takes 2 arguments", line);
      if (typeof args2[0] === "string" && typeof args2[1] === "string") {
        return args2[0].lastIndexOf(args2[1]);
      }
      if (Array.isArray(args2[0])) {
        for (let i = args2[0].length - 1; i >= 0; i--) {
          if (JSON.stringify(args2[0][i]) === JSON.stringify(args2[1])) return i;
        }
        return -1;
      }
      throw new SdevError("First argument must be text or list", line);
    }
  });
  builtins.set("insert", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 3) throw new SdevError("insert() takes 3 arguments (list, index, value)", line);
      if (!Array.isArray(args2[0])) throw new SdevError("First argument must be a list", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      const arr = args2[0];
      arr.splice(args2[1], 0, args2[2]);
      return arr;
    }
  });
  builtins.set("remove", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("remove() takes 2 arguments (list, index)", line);
      if (!Array.isArray(args2[0])) throw new SdevError("First argument must be a list", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      const arr = args2[0];
      const idx = args2[1] < 0 ? arr.length + args2[1] : args2[1];
      if (idx < 0 || idx >= arr.length) throw new SdevError("Index out of bounds", line);
      return arr.splice(idx, 1)[0];
    }
  });
  builtins.set("concat", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2) throw new SdevError("concat() takes at least 2 arguments", line);
      if (Array.isArray(args2[0])) {
        return args2.reduce((acc, arr) => {
          if (!Array.isArray(arr)) throw new SdevError("All arguments must be lists", line);
          return [...acc, ...arr];
        }, []);
      }
      if (typeof args2[0] === "string") {
        return args2.map((a) => String(a)).join("");
      }
      throw new SdevError("First argument must be a list or text", line);
    }
  });
  builtins.set("flatten", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("flatten() takes 1 argument", line);
      if (!Array.isArray(args2[0])) throw new SdevError("Argument must be a list", line);
      return args2[0].flat(Infinity);
    }
  });
  builtins.set("zip", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2) throw new SdevError("zip() takes at least 2 arguments", line);
      const arrays = args2.map((a, i) => {
        if (!Array.isArray(a)) throw new SdevError(`Argument ${i + 1} must be a list`, line);
        return a;
      });
      const minLen = Math.min(...arrays.map((a) => a.length));
      const result = [];
      for (let i = 0; i < minLen; i++) {
        result.push(arrays.map((arr) => arr[i]));
      }
      return result;
    }
  });
  builtins.set("unzip", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("unzip() takes 1 argument", line);
      if (!Array.isArray(args2[0])) throw new SdevError("Argument must be a list", line);
      if (args2[0].length === 0) return [];
      const first = args2[0][0];
      if (!Array.isArray(first)) throw new SdevError("Elements must be lists", line);
      const numArrays = first.length;
      const result = Array.from({ length: numArrays }, () => []);
      for (const tuple of args2[0]) {
        if (!Array.isArray(tuple)) throw new SdevError("Elements must be lists", line);
        for (let i = 0; i < tuple.length; i++) {
          result[i]?.push(tuple[i]);
        }
      }
      return result;
    }
  });
  builtins.set("first", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("first() takes 1 argument", line);
      if (Array.isArray(args2[0])) return args2[0][0] ?? null;
      if (typeof args2[0] === "string") return args2[0][0] ?? "";
      throw new SdevError("Argument must be a list or text", line);
    }
  });
  builtins.set("last", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("last() takes 1 argument", line);
      if (Array.isArray(args2[0])) return args2[0][args2[0].length - 1] ?? null;
      if (typeof args2[0] === "string") return args2[0][args2[0].length - 1] ?? "";
      throw new SdevError("Argument must be a list or text", line);
    }
  });
  builtins.set("rest", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("rest() takes 1 argument", line);
      if (Array.isArray(args2[0])) return args2[0].slice(1);
      if (typeof args2[0] === "string") return args2[0].slice(1);
      throw new SdevError("Argument must be a list or text", line);
    }
  });
  builtins.set("take", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("take() takes 2 arguments (list, count)", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      if (Array.isArray(args2[0])) return args2[0].slice(0, args2[1]);
      if (typeof args2[0] === "string") return args2[0].slice(0, args2[1]);
      throw new SdevError("First argument must be a list or text", line);
    }
  });
  builtins.set("drop", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("drop() takes 2 arguments (list, count)", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      if (Array.isArray(args2[0])) return args2[0].slice(args2[1]);
      if (typeof args2[0] === "string") return args2[0].slice(args2[1]);
      throw new SdevError("First argument must be a list or text", line);
    }
  });
  builtins.set("sum", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("sum() takes 1 argument", line);
      if (!Array.isArray(args2[0])) throw new SdevError("Argument must be a list", line);
      return args2[0].reduce((acc, val) => {
        if (typeof val !== "number") throw new SdevError("All elements must be numbers", line);
        return acc + val;
      }, 0);
    }
  });
  builtins.set("product", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("product() takes 1 argument", line);
      if (!Array.isArray(args2[0])) throw new SdevError("Argument must be a list", line);
      return args2[0].reduce((acc, val) => {
        if (typeof val !== "number") throw new SdevError("All elements must be numbers", line);
        return acc * val;
      }, 1);
    }
  });
  builtins.set("average", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("average() takes 1 argument", line);
      if (!Array.isArray(args2[0])) throw new SdevError("Argument must be a list", line);
      if (args2[0].length === 0) throw new SdevError("Cannot average empty list", line);
      const total = args2[0].reduce((acc, val) => {
        if (typeof val !== "number") throw new SdevError("All elements must be numbers", line);
        return acc + val;
      }, 0);
      return total / args2[0].length;
    }
  });
  builtins.set("sort", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 1 || args2.length > 2) throw new SdevError("sort() takes 1-2 arguments", line);
      if (!Array.isArray(args2[0])) throw new SdevError("First argument must be a list", line);
      const arr = [...args2[0]];
      if (args2.length === 2) {
        const fn = args2[1];
        if (!fn || typeof fn !== "object" || !("call" in fn)) {
          throw new SdevError("Second argument must be a function", line);
        }
        arr.sort((a, b) => fn.call([a, b], line));
      } else {
        arr.sort((a, b) => {
          if (typeof a === "number" && typeof b === "number") return a - b;
          return String(a).localeCompare(String(b));
        });
      }
      return arr;
    }
  });
  builtins.set("unique", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("unique() takes 1 argument", line);
      if (!Array.isArray(args2[0])) throw new SdevError("Argument must be a list", line);
      const seen = /* @__PURE__ */ new Set();
      return args2[0].filter((item) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  });
  builtins.set("count", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("count() takes 2 arguments (list, value)", line);
      if (!Array.isArray(args2[0])) throw new SdevError("First argument must be a list", line);
      const needle = JSON.stringify(args2[1]);
      return args2[0].filter((item) => JSON.stringify(item) === needle).length;
    }
  });
  builtins.set("all", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("all() takes 2 arguments (list, predicate)", line);
      if (!Array.isArray(args2[0])) throw new SdevError("First argument must be a list", line);
      const fn = args2[1];
      if (!fn || typeof fn !== "object" || !("call" in fn)) {
        throw new SdevError("Second argument must be a function", line);
      }
      return args2[0].every((item) => isTruthy(fn.call([item], line)));
    }
  });
  builtins.set("any", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("any() takes 2 arguments (list, predicate)", line);
      if (!Array.isArray(args2[0])) throw new SdevError("First argument must be a list", line);
      const fn = args2[1];
      if (!fn || typeof fn !== "object" || !("call" in fn)) {
        throw new SdevError("Second argument must be a function", line);
      }
      return args2[0].some((item) => isTruthy(fn.call([item], line)));
    }
  });
  builtins.set("find", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("find() takes 2 arguments (list, predicate)", line);
      if (!Array.isArray(args2[0])) throw new SdevError("First argument must be a list", line);
      const fn = args2[1];
      if (!fn || typeof fn !== "object" || !("call" in fn)) {
        throw new SdevError("Second argument must be a function", line);
      }
      for (const item of args2[0]) {
        if (isTruthy(fn.call([item], line))) return item;
      }
      return null;
    }
  });
  builtins.set("isNum", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isNum() takes 1 argument", line);
      return typeof args2[0] === "number";
    }
  });
  builtins.set("isText", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isText() takes 1 argument", line);
      return typeof args2[0] === "string";
    }
  });
  builtins.set("isList", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isList() takes 1 argument", line);
      return Array.isArray(args2[0]);
    }
  });
  builtins.set("isTome", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isTome() takes 1 argument", line);
      return args2[0] !== null && typeof args2[0] === "object" && !Array.isArray(args2[0]);
    }
  });
  builtins.set("isTruth", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isTruth() takes 1 argument", line);
      return typeof args2[0] === "boolean";
    }
  });
  builtins.set("isVoid", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isVoid() takes 1 argument", line);
      return args2[0] === null;
    }
  });
  builtins.set("isFunc", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isFunc() takes 1 argument", line);
      const val = args2[0];
      if (val && typeof val === "object" && "type" in val) {
        const t = val.type;
        return t === "builtin" || t === "user" || t === "lambda";
      }
      return false;
    }
  });
  builtins.set("clamp", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 3) throw new SdevError("clamp() takes 3 arguments (value, min, max)", line);
      const [val, min, max] = args2.map((a) => {
        if (typeof a !== "number") throw new SdevError("All arguments must be numbers", line);
        return a;
      });
      return Math.min(Math.max(val, min), max);
    }
  });
  builtins.set("lerp", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 3) throw new SdevError("lerp() takes 3 arguments (start, end, t)", line);
      const [start, end, t] = args2.map((a) => {
        if (typeof a !== "number") throw new SdevError("All arguments must be numbers", line);
        return a;
      });
      return start + (end - start) * t;
    }
  });
  builtins.set("mapRange", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 5) throw new SdevError("mapRange() takes 5 arguments (value, inMin, inMax, outMin, outMax)", line);
      const [value, inMin, inMax, outMin, outMax] = args2.map((a) => {
        if (typeof a !== "number") throw new SdevError("All arguments must be numbers", line);
        return a;
      });
      return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
    }
  });
  builtins.set("sign", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("sign() takes 1 argument", line);
      if (typeof args2[0] !== "number") throw new SdevError("Argument must be a number", line);
      return Math.sign(args2[0]);
    }
  });
  builtins.set("pow", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("pow() takes 2 arguments (base, exponent)", line);
      if (typeof args2[0] !== "number" || typeof args2[1] !== "number") {
        throw new SdevError("Arguments must be numbers", line);
      }
      return Math.pow(args2[0], args2[1]);
    }
  });
  builtins.set("asin", { type: "builtin", call: (args2) => Math.asin(args2[0]) });
  builtins.set("acos", { type: "builtin", call: (args2) => Math.acos(args2[0]) });
  builtins.set("atan", { type: "builtin", call: (args2) => Math.atan(args2[0]) });
  builtins.set("atan2", {
    type: "builtin",
    call: (args2) => Math.atan2(args2[0], args2[1])
  });
  builtins.set("sinh", { type: "builtin", call: (args2) => Math.sinh(args2[0]) });
  builtins.set("cosh", { type: "builtin", call: (args2) => Math.cosh(args2[0]) });
  builtins.set("tanh", { type: "builtin", call: (args2) => Math.tanh(args2[0]) });
  builtins.set("log10", { type: "builtin", call: (args2) => Math.log10(args2[0]) });
  builtins.set("log2", { type: "builtin", call: (args2) => Math.log2(args2[0]) });
  builtins.set("E", { type: "builtin", call: () => Math.E });
  builtins.set("INFINITY", { type: "builtin", call: () => Infinity });
  builtins.set("now", {
    type: "builtin",
    call: () => Date.now()
  });
  builtins.set("timestamp", {
    type: "builtin",
    call: () => (/* @__PURE__ */ new Date()).toISOString()
  });
  builtins.set("has", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("has() takes 2 arguments (tome, key)", line);
      if (!args2[0] || typeof args2[0] !== "object" || Array.isArray(args2[0])) {
        throw new SdevError("First argument must be a tome", line);
      }
      const key = String(args2[1]);
      return key in args2[0];
    }
  });
  builtins.set("get", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2 || args2.length > 3) throw new SdevError("get() takes 2-3 arguments (tome, key, default?)", line);
      if (!args2[0] || typeof args2[0] !== "object" || Array.isArray(args2[0])) {
        throw new SdevError("First argument must be a tome", line);
      }
      const key = String(args2[1]);
      const obj = args2[0];
      if (key in obj) return obj[key];
      return args2.length === 3 ? args2[2] : null;
    }
  });
  builtins.set("set", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 3) throw new SdevError("set() takes 3 arguments (tome, key, value)", line);
      if (!args2[0] || typeof args2[0] !== "object" || Array.isArray(args2[0])) {
        throw new SdevError("First argument must be a tome", line);
      }
      const key = String(args2[1]);
      args2[0][key] = args2[2];
      return args2[0];
    }
  });
  builtins.set("del", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("del() takes 2 arguments (tome, key)", line);
      if (!args2[0] || typeof args2[0] !== "object" || Array.isArray(args2[0])) {
        throw new SdevError("First argument must be a tome", line);
      }
      const key = String(args2[1]);
      const obj = args2[0];
      const existed = key in obj;
      delete obj[key];
      return existed;
    }
  });
  builtins.set("merge", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2) throw new SdevError("merge() takes at least 2 arguments", line);
      const result = {};
      for (const arg of args2) {
        if (!arg || typeof arg !== "object" || Array.isArray(arg)) {
          throw new SdevError("All arguments must be tomes", line);
        }
        Object.assign(result, arg);
      }
      return result;
    }
  });
  builtins.set("entries", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("entries() takes 1 argument", line);
      if (!args2[0] || typeof args2[0] !== "object" || Array.isArray(args2[0])) {
        throw new SdevError("Argument must be a tome", line);
      }
      return Object.entries(args2[0]).map(([k, v]) => [k, v]);
    }
  });
  builtins.set("fromEntries", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("fromEntries() takes 1 argument", line);
      if (!Array.isArray(args2[0])) throw new SdevError("Argument must be a list", line);
      const result = {};
      for (const entry of args2[0]) {
        if (!Array.isArray(entry) || entry.length !== 2) {
          throw new SdevError("Each entry must be a [key, value] pair", line);
        }
        result[String(entry[0])] = entry[1];
      }
      return result;
    }
  });
  builtins.set("starts", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("starts() takes 2 arguments", line);
      if (typeof args2[0] !== "string" || typeof args2[1] !== "string") throw new SdevError("Arguments must be text", line);
      return args2[0].startsWith(args2[1]);
    }
  });
  builtins.set("ends", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("ends() takes 2 arguments", line);
      if (typeof args2[0] !== "string" || typeof args2[1] !== "string") throw new SdevError("Arguments must be text", line);
      return args2[0].endsWith(args2[1]);
    }
  });
  builtins.set("locate", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("locate() takes 2 arguments", line);
      if (typeof args2[0] === "string" && typeof args2[1] === "string") return args2[0].indexOf(args2[1]);
      if (Array.isArray(args2[0])) return args2[0].findIndex((item) => JSON.stringify(item) === JSON.stringify(args2[1]));
      throw new SdevError("First argument must be text or list", line);
    }
  });
  builtins.set("chars", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("chars() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].split("");
    }
  });
  builtins.set("format", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 1) throw new SdevError("format() takes at least 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("First argument must be text", line);
      let template = args2[0];
      let argIdx = 1;
      template = template.replace(/\{(\d+)?\}/g, (_, idx) => {
        const i = idx !== void 0 ? parseInt(idx) + 1 : argIdx++;
        return stringify(args2[i] !== void 0 ? args2[i] : "");
      });
      return template;
    }
  });
  builtins.set("padLeft", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2 || args2.length > 3) throw new SdevError("padLeft() takes 2-3 arguments", line);
      if (typeof args2[0] !== "string") throw new SdevError("First argument must be text", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      const pad = args2.length === 3 ? String(args2[2]) : " ";
      return args2[0].padStart(args2[1], pad);
    }
  });
  builtins.set("padRight", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2 || args2.length > 3) throw new SdevError("padRight() takes 2-3 arguments", line);
      if (typeof args2[0] !== "string") throw new SdevError("First argument must be text", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      const pad = args2.length === 3 ? String(args2[2]) : " ";
      return args2[0].padEnd(args2[1], pad);
    }
  });
  builtins.set("snatch", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2) throw new SdevError("snatch() takes 2-3 arguments", line);
      if (typeof args2[0] === "string") {
        const str = args2[0];
        const start = args2[1];
        const end = args2.length === 3 ? args2[2] : void 0;
        return str.slice(start, end);
      }
      if (Array.isArray(args2[0])) {
        if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
        const arr = args2[0];
        const idx = args2[1] < 0 ? arr.length + args2[1] : args2[1];
        if (idx < 0 || idx >= arr.length) throw new SdevError("Index out of bounds", line);
        return arr.splice(idx, 1)[0];
      }
      throw new SdevError("First argument must be text or list", line);
    }
  });
  builtins.set("sortDesc", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("sortDesc() takes 1 argument", line);
      if (!Array.isArray(args2[0])) throw new SdevError("Argument must be a list", line);
      return [...args2[0]].sort((a, b) => {
        if (typeof a === "number" && typeof b === "number") return b - a;
        return String(b).localeCompare(String(a));
      });
    }
  });
  builtins.set("clone", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("clone() takes 1 argument", line);
      return JSON.parse(JSON.stringify(args2[0]));
    }
  });
  builtins.set("difference", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("difference() takes 2 arguments", line);
      if (!Array.isArray(args2[0]) || !Array.isArray(args2[1])) throw new SdevError("Arguments must be lists", line);
      const setB = new Set(args2[1].map((x) => JSON.stringify(x)));
      return args2[0].filter((x) => !setB.has(JSON.stringify(x)));
    }
  });
  builtins.set("seek", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("seek() takes 2 arguments (list, predicate)", line);
      if (!Array.isArray(args2[0])) throw new SdevError("First argument must be a list", line);
      const fn = args2[1];
      if (!fn || typeof fn !== "object" || !("call" in fn)) throw new SdevError("Second argument must be a function", line);
      for (const item of args2[0]) {
        if (isTruthy(fn.call([item], line))) return item;
      }
      return null;
    }
  });
  builtins.set("every", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("every() takes 2 arguments", line);
      if (!Array.isArray(args2[0])) throw new SdevError("First argument must be a list", line);
      const fn = args2[1];
      if (!fn || typeof fn !== "object" || !("call" in fn)) throw new SdevError("Second argument must be a function", line);
      return args2[0].every((item) => isTruthy(fn.call([item], line)));
    }
  });
  builtins.set("some", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("some() takes 2 arguments", line);
      if (!Array.isArray(args2[0])) throw new SdevError("First argument must be a list", line);
      const fn = args2[1];
      if (!fn || typeof fn !== "object" || !("call" in fn)) throw new SdevError("Second argument must be a function", line);
      return args2[0].some((item) => isTruthy(fn.call([item], line)));
    }
  });
  builtins.set("enumerate", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("enumerate() takes 1 argument", line);
      if (!Array.isArray(args2[0])) throw new SdevError("Argument must be a list", line);
      return args2[0].map((item, idx) => [idx, item]);
    }
  });
  builtins.set("constrain", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 3) throw new SdevError("constrain() takes 3 arguments (value, min, max)", line);
      const [val, min, max] = args2.map((a) => {
        if (typeof a !== "number") throw new SdevError("All arguments must be numbers", line);
        return a;
      });
      return Math.min(Math.max(val, min), max);
    }
  });
  builtins.set("dist", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 4) throw new SdevError("dist() takes 4 arguments (x1, y1, x2, y2)", line);
      const [x1, y1, x2, y2] = args2.map((a) => {
        if (typeof a !== "number") throw new SdevError("All arguments must be numbers", line);
        return a;
      });
      return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
  });
  builtins.set("radians", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("radians() takes 1 argument", line);
      if (typeof args2[0] !== "number") throw new SdevError("Argument must be a number", line);
      return args2[0] * (Math.PI / 180);
    }
  });
  builtins.set("degrees", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("degrees() takes 1 argument", line);
      if (typeof args2[0] !== "number") throw new SdevError("Argument must be a number", line);
      return args2[0] * (180 / Math.PI);
    }
  });
  builtins.set("random", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length === 0) return Math.random();
      if (args2.length === 2) {
        const min = args2[0];
        const max = args2[1];
        return Math.random() * (max - min) + min;
      }
      throw new SdevError("random() takes 0 or 2 arguments", line);
    }
  });
  builtins.set("mean", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("mean() takes 1 argument", line);
      if (!Array.isArray(args2[0])) throw new SdevError("Argument must be a list", line);
      if (args2[0].length === 0) throw new SdevError("Cannot compute mean of empty list", line);
      const total = args2[0].reduce((acc, val) => {
        if (typeof val !== "number") throw new SdevError("All elements must be numbers", line);
        return acc + val;
      }, 0);
      return total / args2[0].length;
    }
  });
  builtins.set("input", {
    type: "builtin",
    call: (args2) => {
      const promptText = args2.length > 0 ? String(args2[0]) : "";
      if (typeof globalThis !== "undefined" && typeof globalThis.prompt === "function") {
        const result = globalThis.prompt(promptText);
        return result !== null ? result : "";
      }
      if (args2.length > 0) output(promptText);
      return "";
    }
  });
  builtins.set("delay", {
    type: "builtin",
    call: () => null
  });
  builtins.set("sleep", {
    type: "builtin",
    call: () => null
  });
  builtins.set("print", {
    type: "builtin",
    call: (args2) => {
      const message = args2.map(stringify).join(" ");
      output(message);
      return null;
    }
  });
  builtins.set("println", {
    type: "builtin",
    call: (args2) => {
      const message = args2.map(stringify).join(" ");
      output(message);
      return null;
    }
  });
  builtins.set("range", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 1 || args2.length > 3) throw new SdevError("range() takes 1-3 arguments", line);
      let start = 0, end = 0, step = 1;
      if (args2.length === 1) {
        end = toNumber(args2[0], line);
      } else if (args2.length === 2) {
        start = toNumber(args2[0], line);
        end = toNumber(args2[1], line);
      } else {
        start = toNumber(args2[0], line);
        end = toNumber(args2[1], line);
        step = toNumber(args2[2], line);
      }
      if (step === 0) throw new SdevError("range() step cannot be 0", line);
      const result = [];
      if (step > 0) {
        for (let i = start; i < end; i += step) result.push(i);
      } else {
        for (let i = start; i > end; i += step) result.push(i);
      }
      return result;
    }
  });
  builtins.set("typeof", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("typeof() takes 1 argument", line);
      const val = args2[0];
      if (val === null) return "void";
      if (typeof val === "number") return "number";
      if (typeof val === "string") return "text";
      if (typeof val === "boolean") return "truth";
      if (Array.isArray(val)) return "list";
      if (typeof val === "object") {
        if (val.type === "builtin" || val.type === "user" || val.type === "lambda") return "conjuration";
        if (val.type === "class") return "class";
        return "tome";
      }
      return "mystery";
    }
  });
  builtins.set("exit", {
    type: "builtin",
    call: (args2) => {
      const code = args2.length > 0 ? Number(args2[0]) : 0;
      throw new SdevError(`Program exited with code ${code}`, 0);
    }
  });
  builtins.set("panic", {
    type: "builtin",
    call: (args2, line) => {
      const msg = args2.length > 0 ? stringify(args2[0]) : "panic!";
      throw new SdevError(`PANIC: ${msg}`, line);
    }
  });
  builtins.set("throw", {
    type: "builtin",
    call: (args2, line) => {
      const msg = args2.length > 0 ? stringify(args2[0]) : "Error";
      throw new SdevError(msg, line);
    }
  });
  builtins.set("chr", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("chr() takes 1 argument", line);
      if (typeof args2[0] !== "number") throw new SdevError("Argument must be a number", line);
      return String.fromCharCode(args2[0]);
    }
  });
  builtins.set("ord", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("ord() takes 1 argument", line);
      if (typeof args2[0] !== "string" || args2[0].length === 0) throw new SdevError("Argument must be a non-empty string", line);
      return args2[0].charCodeAt(0);
    }
  });
  builtins.set("hex", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("hex() takes 1 argument", line);
      if (typeof args2[0] !== "number") throw new SdevError("Argument must be a number", line);
      return "0x" + Math.trunc(args2[0]).toString(16).toUpperCase();
    }
  });
  builtins.set("oct", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("oct() takes 1 argument", line);
      if (typeof args2[0] !== "number") throw new SdevError("Argument must be a number", line);
      return "0o" + Math.trunc(args2[0]).toString(8);
    }
  });
  builtins.set("bin", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("bin() takes 1 argument", line);
      if (typeof args2[0] !== "number") throw new SdevError("Argument must be a number", line);
      return "0b" + (Math.trunc(args2[0]) >>> 0).toString(2);
    }
  });
  builtins.set("parseNum", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 1 || args2.length > 2) throw new SdevError("parseNum() takes 1-2 arguments", line);
      if (typeof args2[0] !== "string") throw new SdevError("First argument must be text", line);
      const base = args2.length === 2 ? Number(args2[1]) : void 0;
      const n = base ? parseInt(args2[0], base) : parseFloat(args2[0]);
      if (isNaN(n)) throw new SdevError(`Cannot parse '${args2[0]}' as number`, line);
      return n;
    }
  });
  builtins.set("toFixed", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("toFixed() takes 2 arguments (number, digits)", line);
      if (typeof args2[0] !== "number") throw new SdevError("First argument must be a number", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      return args2[0].toFixed(args2[1]);
    }
  });
  builtins.set("toPrecision", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("toPrecision() takes 2 arguments", line);
      if (typeof args2[0] !== "number") throw new SdevError("First argument must be a number", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      return args2[0].toPrecision(args2[1]);
    }
  });
  builtins.set("isNaN", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isNaN() takes 1 argument", line);
      return typeof args2[0] === "number" && isNaN(args2[0]);
    }
  });
  builtins.set("isFinite", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isFinite() takes 1 argument", line);
      return typeof args2[0] === "number" && isFinite(args2[0]);
    }
  });
  builtins.set("isInteger", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isInteger() takes 1 argument", line);
      return typeof args2[0] === "number" && Number.isInteger(args2[0]);
    }
  });
  builtins.set("capitalize", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("capitalize() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].charAt(0).toUpperCase() + args2[0].slice(1).toLowerCase();
    }
  });
  builtins.set("title", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("title() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].replace(/\b\w/g, (c) => c.toUpperCase());
    }
  });
  builtins.set("center", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2 || args2.length > 3) throw new SdevError("center() takes 2-3 arguments", line);
      if (typeof args2[0] !== "string") throw new SdevError("First argument must be text", line);
      if (typeof args2[1] !== "number") throw new SdevError("Second argument must be a number", line);
      const pad = args2.length === 3 ? String(args2[2]) : " ";
      const s = args2[0];
      const width = args2[1];
      if (s.length >= width) return s;
      const total = width - s.length;
      const left = Math.floor(total / 2);
      const right = total - left;
      return pad.repeat(left) + s + pad.repeat(right);
    }
  });
  builtins.set("trimLeft", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("trimLeft() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].trimStart();
    }
  });
  builtins.set("trimRight", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("trimRight() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].trimEnd();
    }
  });
  builtins.set("isUpper", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isUpper() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].length > 0 && args2[0] === args2[0].toUpperCase() && args2[0] !== args2[0].toLowerCase();
    }
  });
  builtins.set("isLower", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isLower() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].length > 0 && args2[0] === args2[0].toLowerCase() && args2[0] !== args2[0].toUpperCase();
    }
  });
  builtins.set("isDigit", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isDigit() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].length > 0 && /^\d+$/.test(args2[0]);
    }
  });
  builtins.set("isAlpha", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isAlpha() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].length > 0 && /^[a-zA-Z]+$/.test(args2[0]);
    }
  });
  builtins.set("isAlphaNum", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isAlphaNum() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].length > 0 && /^[a-zA-Z0-9]+$/.test(args2[0]);
    }
  });
  builtins.set("isSpace", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isSpace() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return args2[0].length > 0 && /^\s+$/.test(args2[0]);
    }
  });
  builtins.set("match", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("match() takes 2 arguments (text, pattern)", line);
      if (typeof args2[0] !== "string" || typeof args2[1] !== "string") throw new SdevError("Arguments must be text", line);
      const m = args2[0].match(new RegExp(args2[1]));
      return m ? Array.from(m) : null;
    }
  });
  builtins.set("matchAll", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("matchAll() takes 2 arguments (text, pattern)", line);
      if (typeof args2[0] !== "string" || typeof args2[1] !== "string") throw new SdevError("Arguments must be text", line);
      const matches = Array.from(args2[0].matchAll(new RegExp(args2[1], "g")));
      return matches.map((m) => Array.from(m));
    }
  });
  builtins.set("replaceRegex", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 3) throw new SdevError("replaceRegex() takes 3 arguments", line);
      if (typeof args2[0] !== "string" || typeof args2[1] !== "string" || typeof args2[2] !== "string") {
        throw new SdevError("Arguments must be text", line);
      }
      return args2[0].replace(new RegExp(args2[1], "g"), args2[2]);
    }
  });
  builtins.set("test", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("test() takes 2 arguments (text, pattern)", line);
      if (typeof args2[0] !== "string" || typeof args2[1] !== "string") throw new SdevError("Arguments must be text", line);
      return new RegExp(args2[1]).test(args2[0]);
    }
  });
  builtins.set("bitAnd", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("bitAnd() takes 2 arguments", line);
      return args2[0] & args2[1];
    }
  });
  builtins.set("bitOr", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("bitOr() takes 2 arguments", line);
      return args2[0] | args2[1];
    }
  });
  builtins.set("bitXor", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("bitXor() takes 2 arguments", line);
      return args2[0] ^ args2[1];
    }
  });
  builtins.set("bitNot", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("bitNot() takes 1 argument", line);
      return ~args2[0];
    }
  });
  builtins.set("bitShiftLeft", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("bitShiftLeft() takes 2 arguments", line);
      return args2[0] << args2[1];
    }
  });
  builtins.set("bitShiftRight", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("bitShiftRight() takes 2 arguments", line);
      return args2[0] >> args2[1];
    }
  });
  builtins.set("base64encode", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("base64encode() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      return btoa(args2[0]);
    }
  });
  builtins.set("base64decode", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("base64decode() takes 1 argument", line);
      if (typeof args2[0] !== "string") throw new SdevError("Argument must be text", line);
      try {
        return atob(args2[0]);
      } catch {
        throw new SdevError("Invalid base64 string", line);
      }
    }
  });
  builtins.set("hash", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("hash() takes 1 argument", line);
      const str = stringify(args2[0]);
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h = (h << 5) - h + ch;
        h |= 0;
      }
      return h;
    }
  });
  builtins.set("time", {
    type: "builtin",
    call: () => {
      const d = /* @__PURE__ */ new Date();
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        hour: d.getHours(),
        minute: d.getMinutes(),
        second: d.getSeconds(),
        ms: d.getMilliseconds(),
        timestamp: d.getTime(),
        iso: d.toISOString()
      };
    }
  });
  builtins.set("formatTime", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 1) throw new SdevError("formatTime() takes at least 1 argument", line);
      if (typeof args2[0] !== "number") throw new SdevError("First argument must be a number (ms)", line);
      const d = new Date(args2[0]);
      return d.toISOString();
    }
  });
  builtins.set("compose", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2) throw new SdevError("compose() takes at least 2 arguments", line);
      const fns = args2.map((a) => {
        if (!a || typeof a !== "object" || !("call" in a)) throw new SdevError("All arguments must be functions", line);
        return a;
      });
      return {
        type: "builtin",
        call: (innerArgs, innerLine) => {
          let result = fns[fns.length - 1].call(innerArgs, innerLine);
          for (let i = fns.length - 2; i >= 0; i--) {
            result = fns[i].call([result], innerLine);
          }
          return result;
        }
      };
    }
  });
  builtins.set("pipe", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2) throw new SdevError("pipe() takes at least 2 arguments (value, ...fns)", line);
      let result = args2[0];
      for (let i = 1; i < args2.length; i++) {
        const fn = args2[i];
        if (!fn || typeof fn !== "object" || !("call" in fn)) throw new SdevError("Arguments after first must be functions", line);
        result = fn.call([result], line);
      }
      return result;
    }
  });
  builtins.set("curry", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("curry() takes 2 arguments (fn, arity)", line);
      const fn = args2[0];
      const arity = args2[1];
      if (!fn || typeof fn !== "object" || !("call" in fn)) throw new SdevError("First argument must be a function", line);
      const curried = (collected) => ({
        type: "builtin",
        call: (innerArgs, innerLine) => {
          const all = [...collected, ...innerArgs];
          if (all.length >= arity) return fn.call(all, innerLine);
          return curried(all);
        }
      });
      return curried([]);
    }
  });
  builtins.set("memoize", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("memoize() takes 1 argument", line);
      const fn = args2[0];
      if (!fn || typeof fn !== "object" || !("call" in fn)) throw new SdevError("Argument must be a function", line);
      const cache = /* @__PURE__ */ new Map();
      return {
        type: "builtin",
        call: (innerArgs, innerLine) => {
          const key = JSON.stringify(innerArgs);
          if (cache.has(key)) return cache.get(key);
          const result = fn.call(innerArgs, innerLine);
          cache.set(key, result);
          return result;
        }
      };
    }
  });
  builtins.set("buffer", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("buffer() takes 1 argument (size)", line);
      if (typeof args2[0] !== "number") throw new SdevError("Argument must be a number", line);
      const size = Math.trunc(args2[0]);
      const data = new Uint8Array(size);
      const obj = {};
      obj._type = "buffer";
      obj._data = data;
      obj.size = { type: "builtin", call: () => size };
      obj.get = { type: "builtin", call: (a, l) => {
        const i = a[0];
        if (i < 0 || i >= size) throw new SdevError("Buffer index out of bounds", l);
        return data[i];
      } };
      obj.set = { type: "builtin", call: (a, l) => {
        const i = a[0];
        const v = a[1];
        if (i < 0 || i >= size) throw new SdevError("Buffer index out of bounds", l);
        data[i] = v & 255;
        return null;
      } };
      obj.fill = { type: "builtin", call: (a) => {
        data.fill(a[0]);
        return null;
      } };
      obj.slice = { type: "builtin", call: (a) => {
        const start = a[0] || 0;
        const end = a[1] || size;
        return Array.from(data.slice(start, end));
      } };
      obj.toList = { type: "builtin", call: () => Array.from(data) };
      obj.toText = { type: "builtin", call: () => new TextDecoder().decode(data) };
      obj.fromString = { type: "builtin", call: (a) => {
        const bytes = new TextEncoder().encode(a[0]);
        data.set(bytes.slice(0, size));
        return null;
      } };
      obj.copyTo = { type: "builtin", call: (a, l) => {
        const target = a[0];
        if (!target || target._type !== "buffer") throw new SdevError("Target must be a buffer", l);
        target._data.set(data.slice(0, target._data.length));
        return null;
      } };
      return obj;
    }
  });
  builtins.set("pointer", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("pointer() takes 2 arguments (buffer, offset)", line);
      const buf = args2[0];
      if (!buf || buf._type !== "buffer") throw new SdevError("First argument must be a buffer", line);
      const offset = args2[1];
      const data = buf._data;
      const obj = {};
      obj._type = "pointer";
      obj.offset = offset;
      obj.read = { type: "builtin", call: () => data[offset] ?? 0 };
      obj.write = { type: "builtin", call: (a) => {
        data[offset] = a[0] & 255;
        return null;
      } };
      obj.advance = { type: "builtin", call: (a) => {
        const newOffset = offset + (a.length > 0 ? a[0] : 1);
        return builtins.get("pointer").call([buf, newOffset], line);
      } };
      obj.readU16 = { type: "builtin", call: () => data[offset] | data[offset + 1] << 8 };
      obj.readU32 = { type: "builtin", call: () => data[offset] | data[offset + 1] << 8 | data[offset + 2] << 16 | data[offset + 3] << 24 };
      obj.writeU16 = { type: "builtin", call: (a) => {
        const v = a[0];
        data[offset] = v & 255;
        data[offset + 1] = v >> 8 & 255;
        return null;
      } };
      obj.writeU32 = { type: "builtin", call: (a) => {
        const v = a[0];
        data[offset] = v & 255;
        data[offset + 1] = v >> 8 & 255;
        data[offset + 2] = v >> 16 & 255;
        data[offset + 3] = v >> 24 & 255;
        return null;
      } };
      return obj;
    }
  });
  builtins.set("keys", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("keys() takes 1 argument", line);
      if (!args2[0] || typeof args2[0] !== "object" || Array.isArray(args2[0])) throw new SdevError("Argument must be a tome", line);
      return Object.keys(args2[0]);
    }
  });
  builtins.set("values", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("values() takes 1 argument", line);
      if (!args2[0] || typeof args2[0] !== "object" || Array.isArray(args2[0])) throw new SdevError("Argument must be a tome", line);
      return Object.values(args2[0]);
    }
  });
  builtins.set("freeze", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("freeze() takes 1 argument", line);
      if (args2[0] && typeof args2[0] === "object") Object.freeze(args2[0]);
      return args2[0];
    }
  });
  builtins.set("isFrozen", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("isFrozen() takes 1 argument", line);
      if (args2[0] && typeof args2[0] === "object") return Object.isFrozen(args2[0]);
      return true;
    }
  });
  builtins.set("groupBy", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("groupBy() takes 2 arguments", line);
      if (!Array.isArray(args2[0])) throw new SdevError("First argument must be a list", line);
      const fn = args2[1];
      if (!fn || typeof fn !== "object" || !("call" in fn)) throw new SdevError("Second argument must be a function", line);
      const groups = {};
      for (const item of args2[0]) {
        const key = String(fn.call([item], line));
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
      return groups;
    }
  });
  builtins.set("chunk", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("chunk() takes 2 arguments (list, size)", line);
      if (!Array.isArray(args2[0])) throw new SdevError("First argument must be a list", line);
      if (typeof args2[1] !== "number" || args2[1] <= 0) throw new SdevError("Second argument must be a positive number", line);
      const result = [];
      const size = Math.floor(args2[1]);
      for (let i = 0; i < args2[0].length; i += size) {
        result.push(args2[0].slice(i, i + size));
      }
      return result;
    }
  });
  builtins.set("tap", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("tap() takes 2 arguments (value, fn)", line);
      const fn = args2[1];
      if (!fn || typeof fn !== "object" || !("call" in fn)) throw new SdevError("Second argument must be a function", line);
      fn.call([args2[0]], line);
      return args2[0];
    }
  });
  builtins.set("times", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("times() takes 2 arguments (count, fn)", line);
      if (typeof args2[0] !== "number") throw new SdevError("First argument must be a number", line);
      const fn = args2[1];
      if (!fn || typeof fn !== "object" || !("call" in fn)) throw new SdevError("Second argument must be a function", line);
      const results = [];
      for (let i = 0; i < Math.floor(args2[0]); i++) {
        results.push(fn.call([i], line));
      }
      return results;
    }
  });
  builtins.set("Vec2", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("Vec2() takes 2 arguments (x, y)", line);
      const x = args2[0];
      const y = args2[1];
      const vec = { x, y };
      const makeVecMethod = (fn) => ({
        type: "builtin",
        call: (margs) => fn(vec, ...margs)
      });
      vec.add = makeVecMethod((self, other) => {
        const o = other;
        return buildVec(self.x + o.x, self.y + o.y);
      });
      vec.sub = makeVecMethod((self, other) => {
        const o = other;
        return buildVec(self.x - o.x, self.y - o.y);
      });
      vec.mul = makeVecMethod((self, scalar) => buildVec(self.x * scalar, self.y * scalar));
      vec.mag = makeVecMethod((self) => Math.sqrt(self.x ** 2 + self.y ** 2));
      vec.normalize = makeVecMethod((self) => {
        const m = Math.sqrt(self.x ** 2 + self.y ** 2);
        return m === 0 ? buildVec(0, 0) : buildVec(self.x / m, self.y / m);
      });
      vec.dot = makeVecMethod((self, other) => {
        const o = other;
        return self.x * o.x + self.y * o.y;
      });
      vec.distance = makeVecMethod((self, other) => {
        const o = other;
        return Math.sqrt((self.x - o.x) ** 2 + (self.y - o.y) ** 2);
      });
      return vec;
    }
  });
  function buildVec(x, y) {
    const vec = { x, y };
    const makeMethod = (fn) => ({
      type: "builtin",
      call: (args2) => fn(vec, ...args2)
    });
    vec.add = makeMethod((s, o) => buildVec(s.x + o.x, s.y + o.y));
    vec.sub = makeMethod((s, o) => buildVec(s.x - o.x, s.y - o.y));
    vec.mul = makeMethod((s, sc) => buildVec(s.x * sc, s.y * sc));
    vec.mag = makeMethod((s) => Math.sqrt(s.x ** 2 + s.y ** 2));
    vec.normalize = makeMethod((s) => {
      const m = Math.sqrt(s.x ** 2 + s.y ** 2);
      return m === 0 ? buildVec(0, 0) : buildVec(s.x / m, s.y / m);
    });
    vec.dot = makeMethod((s, o) => s.x * o.x + s.y * o.y);
    vec.distance = makeMethod((s, o) => Math.sqrt((s.x - o.x) ** 2 + (s.y - o.y) ** 2));
    return vec;
  }
  builtins.set("Set", {
    type: "builtin",
    call: () => {
      const data = /* @__PURE__ */ new Set();
      const obj = {};
      const update = () => {
        obj._data = Array.from(data).map((x) => JSON.parse(x));
      };
      obj.add = { type: "builtin", call: (args2) => {
        data.add(JSON.stringify(args2[0]));
        update();
        return null;
      } };
      obj.remove = { type: "builtin", call: (args2) => {
        data.delete(JSON.stringify(args2[0]));
        update();
        return null;
      } };
      obj.has = { type: "builtin", call: (args2) => data.has(JSON.stringify(args2[0])) };
      obj.size = { type: "builtin", call: () => data.size };
      obj.values = { type: "builtin", call: () => Array.from(data).map((x) => JSON.parse(x)) };
      obj.clear = { type: "builtin", call: () => {
        data.clear();
        update();
        return null;
      } };
      obj.isEmpty = { type: "builtin", call: () => data.size === 0 };
      return obj;
    }
  });
  builtins.set("Map", {
    type: "builtin",
    call: () => {
      const data = /* @__PURE__ */ new Map();
      const obj = {};
      obj.set = { type: "builtin", call: (args2) => {
        data.set(String(args2[0]), args2[1]);
        return null;
      } };
      obj.get = { type: "builtin", call: (args2) => data.get(String(args2[0])) ?? null };
      obj.has = { type: "builtin", call: (args2) => data.has(String(args2[0])) };
      obj.delete = { type: "builtin", call: (args2) => {
        data.delete(String(args2[0]));
        return null;
      } };
      obj.keys = { type: "builtin", call: () => Array.from(data.keys()) };
      obj.values = { type: "builtin", call: () => Array.from(data.values()) };
      obj.entries = { type: "builtin", call: () => Array.from(data.entries()).map(([k, v]) => [k, v]) };
      obj.size = { type: "builtin", call: () => data.size };
      obj.isEmpty = { type: "builtin", call: () => data.size === 0 };
      obj.clear = { type: "builtin", call: () => {
        data.clear();
        return null;
      } };
      return obj;
    }
  });
  builtins.set("Queue", {
    type: "builtin",
    call: () => {
      const data = [];
      const obj = {};
      obj.enqueue = { type: "builtin", call: (args2) => {
        data.push(args2[0]);
        return null;
      } };
      obj.dequeue = { type: "builtin", call: (_args, line) => {
        if (data.length === 0) throw new SdevError("Queue is empty", line);
        return data.shift();
      } };
      obj.peek = { type: "builtin", call: () => data[0] ?? null };
      obj.size = { type: "builtin", call: () => data.length };
      obj.isEmpty = { type: "builtin", call: () => data.length === 0 };
      obj.clear = { type: "builtin", call: () => {
        data.length = 0;
        return null;
      } };
      obj.toList = { type: "builtin", call: () => [...data] };
      return obj;
    }
  });
  builtins.set("Stack", {
    type: "builtin",
    call: () => {
      const data = [];
      const obj = {};
      obj.push = { type: "builtin", call: (args2) => {
        data.push(args2[0]);
        return null;
      } };
      obj.pop = { type: "builtin", call: (_args, line) => {
        if (data.length === 0) throw new SdevError("Stack is empty", line);
        return data.pop();
      } };
      obj.peek = { type: "builtin", call: () => data[data.length - 1] ?? null };
      obj.size = { type: "builtin", call: () => data.length };
      obj.isEmpty = { type: "builtin", call: () => data.length === 0 };
      obj.clear = { type: "builtin", call: () => {
        data.length = 0;
        return null;
      } };
      obj.toList = { type: "builtin", call: () => [...data] };
      return obj;
    }
  });
  builtins.set("LinkedList", {
    type: "builtin",
    call: () => {
      const data = [];
      const obj = {};
      obj.append = { type: "builtin", call: (args2) => {
        data.push(args2[0]);
        return null;
      } };
      obj.prepend = { type: "builtin", call: (args2) => {
        data.unshift(args2[0]);
        return null;
      } };
      obj.get = { type: "builtin", call: (args2, line) => {
        const idx = args2[0];
        const ri = idx < 0 ? data.length + idx : idx;
        if (ri < 0 || ri >= data.length) throw new SdevError("Index out of bounds", line);
        return data[ri];
      } };
      obj.remove = { type: "builtin", call: (args2) => {
        const idx = data.findIndex((x) => JSON.stringify(x) === JSON.stringify(args2[0]));
        if (idx !== -1) data.splice(idx, 1);
        return null;
      } };
      obj.size = { type: "builtin", call: () => data.length };
      obj.isEmpty = { type: "builtin", call: () => data.length === 0 };
      obj.head = { type: "builtin", call: (_args, line) => {
        if (data.length === 0) throw new SdevError("LinkedList is empty", line);
        return data[0];
      } };
      obj.tail = { type: "builtin", call: (_args, line) => {
        if (data.length === 0) throw new SdevError("LinkedList is empty", line);
        return data[data.length - 1];
      } };
      obj.toList = { type: "builtin", call: () => [...data] };
      obj.clear = { type: "builtin", call: () => {
        data.length = 0;
        return null;
      } };
      return obj;
    }
  });
  builtins.set("appendFile", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("appendFile() takes 2 arguments", line);
      output(`\u{1F4DD} Appended to ${args2[0]}: ${stringify(args2[1])}`);
      return true;
    }
  });
  builtins.set("fileExists", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("fileExists() takes 1 argument", line);
      return false;
    }
  });
  builtins.set("deleteFile", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("deleteFile() takes 1 argument", line);
      return false;
    }
  });
  builtins.set("listDir", {
    type: "builtin",
    call: () => []
  });
  builtins.set("spawn", {
    type: "builtin",
    call: (args2, line) => {
      const fn = args2[0];
      if (!fn || typeof fn !== "object" || !("call" in fn)) throw new SdevError("spawn() requires a function", line);
      fn.call([], line);
      return null;
    }
  });
  builtins.set("min", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length === 0) throw new SdevError("min() takes at least 1 argument", line);
      if (args2.length === 1 && Array.isArray(args2[0])) return Math.min(...args2[0]);
      return Math.min(...args2);
    }
  });
  builtins.set("max", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length === 0) throw new SdevError("max() takes at least 1 argument", line);
      if (args2.length === 1 && Array.isArray(args2[0])) return Math.max(...args2[0]);
      return Math.max(...args2);
    }
  });
  builtins.set("abs", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("abs() takes 1 argument", line);
      return Math.abs(args2[0]);
    }
  });
  builtins.set("floor", { type: "builtin", call: (args2) => Math.floor(args2[0]) });
  builtins.set("ceil", { type: "builtin", call: (args2) => Math.ceil(args2[0]) });
  builtins.set("round", { type: "builtin", call: (args2) => Math.round(args2[0]) });
  builtins.set("sqrt", { type: "builtin", call: (args2) => Math.sqrt(args2[0]) });
  builtins.set("str", {
    type: "builtin",
    call: (args2) => stringify(args2[0])
  });
  builtins.set("int", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("int() takes 1 argument", line);
      const n = typeof args2[0] === "string" ? parseInt(args2[0]) : Number(args2[0]);
      if (isNaN(n)) throw new SdevError(`Cannot convert to integer: ${stringify(args2[0])}`, line);
      return Math.trunc(n);
    }
  });
  builtins.set("num", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("num() takes 1 argument", line);
      const n = Number(args2[0]);
      if (isNaN(n)) throw new SdevError(`Cannot convert to number: ${stringify(args2[0])}`, line);
      return n;
    }
  });
  builtins.set("__tryCatch", {
    type: "builtin",
    call: (args2, line) => {
      const tryFn = args2[0];
      const catchFn = args2[1];
      if (!tryFn || !catchFn) throw new SdevError("__tryCatch requires 2 function arguments", line);
      try {
        return tryFn.call([], line);
      } catch (e) {
        const msg = e instanceof SdevError ? e.message : String(e);
        return catchFn.call([msg], line);
      }
    }
  });
  return builtins;
}
function stringify(value) {
  if (value === null) return "void";
  if (typeof value === "boolean") return value ? "yep" : "nope";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    if (value === Infinity) return "inf";
    if (value === -Infinity) return "-inf";
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stringify).join(", ") + "]";
  }
  if (typeof value === "object") {
    if (value.type === "builtin" || value.type === "user" || value.type === "lambda" || value.type === "class") {
      return "<conjuration>";
    }
    const entries = Object.entries(value).filter(([k]) => ![
      "add",
      "sub",
      "mul",
      "mag",
      "normalize",
      "dot",
      "distance",
      "enqueue",
      "dequeue",
      "push",
      "pop",
      "peek",
      "size",
      "isEmpty",
      "clear",
      "values",
      "keys",
      "entries",
      "get",
      "set",
      "has",
      "delete",
      "remove",
      "append",
      "prepend",
      "toList",
      "_data"
    ].includes(k)).map(([k, v]) => `${k}: ${stringify(v)}`).join(", ");
    return ":: " + entries + " ;;";
  }
  return String(value);
}
function isTruthy(value) {
  if (value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
function toNumber(value, line) {
  if (typeof value === "number") return value;
  throw new SdevError(`Expected number, got ${typeof value}`, line);
}

// src/lang/environment.ts
var Environment = class {
  values = /* @__PURE__ */ new Map();
  parent;
  constructor(parent) {
    this.parent = parent;
  }
  define(name, value) {
    this.values.set(name, value);
  }
  get(name, line) {
    if (this.values.has(name)) {
      return this.values.get(name);
    }
    if (this.parent) {
      return this.parent.get(name, line);
    }
    throw new SdevError(`Undefined variable: '${name}'`, line);
  }
  set(name, value, line) {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.set(name, value, line);
      return;
    }
    throw new SdevError(`Undefined variable: '${name}'`, line);
  }
  has(name) {
    if (this.values.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }
};

// src/lang/kernel.ts
var VirtualFileSystem = class {
  root;
  constructor() {
    this.root = this.makeDir("kernel");
    this.mkdir("/home");
    this.mkdir("/tmp");
    this.mkdir("/bin");
    this.mkdir("/etc");
    this.mkdir("/dev");
    this.mkdir("/var");
    this.mkdir("/var/log");
  }
  makeDir(owner) {
    return {
      type: "directory",
      children: /* @__PURE__ */ new Map(),
      permissions: 493,
      owner,
      created: Date.now(),
      modified: Date.now()
    };
  }
  makeFile(content, owner) {
    return {
      type: "file",
      content,
      permissions: 420,
      owner,
      created: Date.now(),
      modified: Date.now()
    };
  }
  resolve(path) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) return { parent: this.root, name: "", node: this.root };
    let current = this.root;
    for (let i = 0; i < parts.length - 1; i++) {
      const child = current.children?.get(parts[i]);
      if (!child || child.type !== "directory") {
        throw new SdevError(`VFS: directory not found: ${parts.slice(0, i + 1).join("/")}`, 0);
      }
      current = child;
    }
    const name = parts[parts.length - 1];
    return { parent: current, name, node: current.children?.get(name) };
  }
  read(path) {
    const { node } = this.resolve(path);
    if (!node) throw new SdevError(`VFS: file not found: ${path}`, 0);
    if (node.type !== "file") throw new SdevError(`VFS: not a file: ${path}`, 0);
    return typeof node.content === "string" ? node.content : new TextDecoder().decode(node.content);
  }
  readBytes(path) {
    const { node } = this.resolve(path);
    if (!node) throw new SdevError(`VFS: file not found: ${path}`, 0);
    if (node.type !== "file") throw new SdevError(`VFS: not a file: ${path}`, 0);
    if (node.content instanceof Uint8Array) return node.content;
    return new TextEncoder().encode(node.content);
  }
  write(path, content, owner = "user") {
    const { parent, name } = this.resolve(path);
    const existing = parent.children?.get(name);
    if (existing && existing.type === "directory") {
      throw new SdevError(`VFS: cannot write to directory: ${path}`, 0);
    }
    const file = this.makeFile(typeof content === "string" ? content : "", owner);
    if (content instanceof Uint8Array) file.content = content;
    else file.content = content;
    parent.children.set(name, file);
  }
  append(path, content) {
    const { parent, name, node } = this.resolve(path);
    if (node && node.type === "file") {
      const existing = typeof node.content === "string" ? node.content : "";
      node.content = existing + content;
      node.modified = Date.now();
    } else {
      parent.children.set(name, this.makeFile(content, "user"));
    }
  }
  mkdir(path, owner = "kernel") {
    const parts = path.split("/").filter(Boolean);
    let current = this.root;
    for (const part of parts) {
      if (!current.children.has(part)) {
        current.children.set(part, this.makeDir(owner));
      }
      current = current.children.get(part);
    }
  }
  list(path) {
    const { node } = this.resolve(path || "/");
    if (!node) throw new SdevError(`VFS: path not found: ${path}`, 0);
    if (node.type !== "directory") throw new SdevError(`VFS: not a directory: ${path}`, 0);
    return Array.from(node.children.keys());
  }
  exists(path) {
    try {
      const { node } = this.resolve(path);
      return !!node;
    } catch {
      return false;
    }
  }
  delete(path) {
    const { parent, name, node } = this.resolve(path);
    if (!node) return false;
    parent.children.delete(name);
    return true;
  }
  stat(path) {
    const { node } = this.resolve(path);
    if (!node) throw new SdevError(`VFS: not found: ${path}`, 0);
    return {
      type: node.type,
      permissions: node.permissions,
      owner: node.owner,
      created: node.created,
      modified: node.modified,
      size: node.type === "file" ? typeof node.content === "string" ? node.content.length : node.content.length : node.children.size
    };
  }
  // Export entire VFS as a tome for sdev code
  toTome() {
    const convert = (node) => {
      if (node.type === "file") return typeof node.content === "string" ? node.content : "<binary>";
      const obj = {};
      node.children.forEach((child, name) => {
        obj[name] = convert(child);
      });
      return obj;
    };
    return convert(this.root);
  }
};
var TaskScheduler = class {
  tasks = /* @__PURE__ */ new Map();
  nextId = 1;
  currentTask = null;
  tickCount = 0;
  output;
  quantum = 100;
  // instructions per time slice
  constructor(output) {
    this.output = output;
  }
  createTask(fn, name = "", priority = 0, privilege = "user") {
    const id = this.nextId++;
    this.tasks.set(id, {
      id,
      name: name || `task_${id}`,
      state: "ready",
      priority,
      privilegeLevel: privilege,
      fn,
      created: Date.now(),
      cpuTime: 0
    });
    return id;
  }
  killTask(id) {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.state = "terminated";
    return true;
  }
  getTask(id) {
    return this.tasks.get(id);
  }
  listTasks() {
    return Array.from(this.tasks.values());
  }
  yieldCurrent() {
    if (this.currentTask !== null) {
      const task = this.tasks.get(this.currentTask);
      if (task && task.state === "running") task.state = "ready";
    }
  }
  // Round-robin scheduler with priority
  schedule() {
    const ready = Array.from(this.tasks.values()).filter((t) => t.state === "ready").sort((a, b) => b.priority - a.priority);
    if (ready.length === 0) return null;
    const task = ready[0];
    task.state = "running";
    this.currentTask = task.id;
    return task;
  }
  // Run one scheduling cycle (cooperative)
  tick(line) {
    this.tickCount++;
    const task = this.schedule();
    if (!task) return;
    try {
      const t0 = performance.now();
      task.result = task.fn.call([], line);
      task.cpuTime += performance.now() - t0;
      task.state = "terminated";
    } catch (e) {
      task.state = "terminated";
      this.output(`[KERNEL] Task ${task.name} crashed: ${e instanceof SdevError ? e.message : String(e)}`);
    }
  }
  runAll(line) {
    let safety = 0;
    while (this.tasks.size > 0 && safety < 1e4) {
      const alive = Array.from(this.tasks.values()).filter((t) => t.state !== "terminated");
      if (alive.length === 0) break;
      this.tick(line);
      safety++;
    }
  }
  getCurrentPrivilege() {
    if (this.currentTask === null) return "kernel";
    return this.tasks.get(this.currentTask)?.privilegeLevel ?? "user";
  }
};
var SyscallInterface = class {
  handlers = /* @__PURE__ */ new Map();
  privilegeRequired = /* @__PURE__ */ new Map();
  register(name, handler, privilege = "user") {
    this.handlers.set(name, handler);
    this.privilegeRequired.set(name, privilege);
  }
  call(name, args2, line, currentPrivilege) {
    const handler = this.handlers.get(name);
    if (!handler) throw new SdevError(`Syscall not found: ${name}`, line);
    const required = this.privilegeRequired.get(name) ?? "user";
    if (required === "kernel" && currentPrivilege !== "kernel") {
      throw new SdevError(`Permission denied: syscall '${name}' requires kernel privilege`, line);
    }
    return handler(args2, line);
  }
  list() {
    return Array.from(this.handlers.keys());
  }
};
var HeapManager = class {
  blocks = [];
  nextAddress = 0;
  totalAllocated = 0;
  totalFreed = 0;
  maxHeapSize;
  constructor(maxSize = 1048576) {
    this.maxHeapSize = maxSize;
  }
  alloc(size, line) {
    if (size <= 0) throw new SdevError("Heap: allocation size must be positive", line);
    if (this.totalAllocated - this.totalFreed + size > this.maxHeapSize) {
      throw new SdevError("Heap: out of memory", line);
    }
    for (const block of this.blocks) {
      if (block.free && block.size >= size) {
        block.free = false;
        block.data = new Array(size).fill(null);
        return block.address;
      }
    }
    const address = this.nextAddress;
    this.blocks.push({ address, size, free: false, data: new Array(size).fill(null) });
    this.nextAddress += size;
    this.totalAllocated += size;
    return address;
  }
  free(address, line) {
    const block = this.blocks.find((b) => b.address === address);
    if (!block) throw new SdevError(`Heap: invalid address ${address}`, line);
    if (block.free) throw new SdevError(`Heap: double free at address ${address}`, line);
    block.free = true;
    this.totalFreed += block.size;
  }
  load(address, line) {
    for (const block of this.blocks) {
      if (!block.free && address >= block.address && address < block.address + block.size) {
        return block.data[address - block.address];
      }
    }
    throw new SdevError(`Heap: access violation at address ${address}`, line);
  }
  store(address, value, line) {
    for (const block of this.blocks) {
      if (!block.free && address >= block.address && address < block.address + block.size) {
        block.data[address - block.address] = value;
        return;
      }
    }
    throw new SdevError(`Heap: access violation at address ${address}`, line);
  }
  // Mark-and-sweep GC
  gc(roots) {
    const marked = /* @__PURE__ */ new Set();
    for (const addr of roots) {
      for (const block of this.blocks) {
        if (!block.free && addr >= block.address && addr < block.address + block.size) {
          marked.add(block.address);
        }
      }
    }
    let freed = 0;
    for (const block of this.blocks) {
      if (!block.free && !marked.has(block.address)) {
        block.free = true;
        this.totalFreed += block.size;
        freed++;
      }
    }
    return freed;
  }
  stats() {
    const usedBlocks = this.blocks.filter((b) => !b.free);
    const freeBlocks = this.blocks.filter((b) => b.free);
    return {
      totalAllocated: this.totalAllocated,
      totalFreed: this.totalFreed,
      inUse: this.totalAllocated - this.totalFreed,
      usedBlocks: usedBlocks.length,
      freeBlocks: freeBlocks.length,
      maxHeapSize: this.maxHeapSize
    };
  }
};
var HAL = class {
  devices = /* @__PURE__ */ new Map();
  interruptHandlers = /* @__PURE__ */ new Map();
  pendingInterrupts = [];
  eventQueue = [];
  registerDevice(device) {
    this.devices.set(device.name, device);
  }
  getDevice(name) {
    return this.devices.get(name);
  }
  listDevices() {
    return Array.from(this.devices.keys());
  }
  registerInterrupt(num, handler) {
    this.interruptHandlers.set(num, handler);
  }
  triggerInterrupt(num) {
    this.pendingInterrupts.push(num);
  }
  processPendingInterrupts(line) {
    while (this.pendingInterrupts.length > 0) {
      const num = this.pendingInterrupts.shift();
      const handler = this.interruptHandlers.get(num);
      if (handler) {
        handler.call([num], line);
      }
    }
  }
  pushEvent(type, data) {
    this.eventQueue.push({ type, data });
  }
  pollEvent() {
    return this.eventQueue.shift() ?? null;
  }
};
var WindowManager = class {
  windows = /* @__PURE__ */ new Map();
  nextId = 1;
  focusedId = null;
  createWindow(title, x, y, w, h) {
    const id = this.nextId++;
    this.windows.set(id, {
      id,
      title,
      x,
      y,
      width: w,
      height: h,
      visible: true,
      focused: false,
      content: [],
      zIndex: id
    });
    this.focusWindow(id);
    return id;
  }
  closeWindow(id) {
    const existed = this.windows.delete(id);
    if (this.focusedId === id) this.focusedId = null;
    return existed;
  }
  moveWindow(id, x, y) {
    const w = this.windows.get(id);
    if (w) {
      w.x = x;
      w.y = y;
    }
  }
  resizeWindow(id, width, height) {
    const w = this.windows.get(id);
    if (w) {
      w.width = width;
      w.height = height;
    }
  }
  focusWindow(id) {
    this.windows.forEach((w2) => {
      w2.focused = false;
    });
    const w = this.windows.get(id);
    if (w) {
      w.focused = true;
      this.focusedId = id;
    }
  }
  setContent(id, content) {
    const w = this.windows.get(id);
    if (w) w.content = content;
  }
  getWindow(id) {
    return this.windows.get(id);
  }
  listWindows() {
    return Array.from(this.windows.values()).sort((a, b) => a.zIndex - b.zIndex);
  }
};
var Kernel = class {
  vfs;
  scheduler;
  syscalls;
  heap;
  hal;
  windowManager;
  privilegeLevel = "kernel";
  output;
  booted = false;
  constructor(output) {
    this.output = output;
    this.vfs = new VirtualFileSystem();
    this.scheduler = new TaskScheduler(output);
    this.syscalls = new SyscallInterface();
    this.heap = new HeapManager();
    this.hal = new HAL();
    this.windowManager = new WindowManager();
    this.registerDefaultSyscalls();
    this.registerDefaultDevices();
  }
  registerDefaultSyscalls() {
    const { vfs, heap, scheduler, hal, windowManager } = this;
    this.syscalls.register("fs_read", (args2) => vfs.read(String(args2[0])));
    this.syscalls.register("fs_read_bytes", (args2) => {
      const bytes = vfs.readBytes(String(args2[0]));
      return Array.from(bytes);
    });
    this.syscalls.register("fs_write", (args2) => {
      vfs.write(String(args2[0]), String(args2[1]));
      return true;
    });
    this.syscalls.register("fs_append", (args2) => {
      vfs.append(String(args2[0]), String(args2[1]));
      return true;
    });
    this.syscalls.register("fs_mkdir", (args2) => {
      vfs.mkdir(String(args2[0]));
      return true;
    });
    this.syscalls.register("fs_list", (args2) => vfs.list(String(args2[0])));
    this.syscalls.register("fs_exists", (args2) => vfs.exists(String(args2[0])));
    this.syscalls.register("fs_delete", (args2) => vfs.delete(String(args2[0])));
    this.syscalls.register("fs_stat", (args2) => vfs.stat(String(args2[0])));
    this.syscalls.register("mem_alloc", (args2, line) => heap.alloc(Number(args2[0]), line), "kernel");
    this.syscalls.register("mem_free", (args2, line) => {
      heap.free(Number(args2[0]), line);
      return null;
    }, "kernel");
    this.syscalls.register("mem_load", (args2, line) => heap.load(Number(args2[0]), line), "kernel");
    this.syscalls.register("mem_store", (args2, line) => {
      heap.store(Number(args2[0]), args2[1], line);
      return null;
    }, "kernel");
    this.syscalls.register("mem_stats", () => heap.stats());
    this.syscalls.register("gc", () => heap.gc(/* @__PURE__ */ new Set()));
    this.syscalls.register("write", (args2) => {
      this.output(stringify(args2[0]));
      return null;
    });
    this.syscalls.register("read", () => {
      if (typeof globalThis !== "undefined" && typeof globalThis.prompt === "function") {
        return globalThis.prompt("") ?? "";
      }
      return "";
    });
    this.syscalls.register("task_create", (args2, line) => {
      const fn = args2[0];
      if (!fn || typeof fn !== "object" || !("call" in fn)) throw new SdevError("task_create: argument must be a function", line);
      return scheduler.createTask(fn, String(args2[1] ?? ""), Number(args2[2] ?? 0));
    });
    this.syscalls.register("task_kill", (args2) => scheduler.killTask(Number(args2[0])));
    this.syscalls.register("task_yield", () => {
      scheduler.yieldCurrent();
      return null;
    });
    this.syscalls.register("task_list", () => scheduler.listTasks().map((t) => ({
      id: t.id,
      name: t.name,
      state: t.state,
      priority: t.priority,
      privilege: t.privilegeLevel
    })));
    this.syscalls.register("dev_list", () => hal.listDevices());
    this.syscalls.register("dev_read", (args2, line) => {
      const dev = hal.getDevice(String(args2[0]));
      if (!dev) throw new SdevError(`Device not found: ${args2[0]}`, line);
      return dev.read();
    });
    this.syscalls.register("dev_write", (args2, line) => {
      const dev = hal.getDevice(String(args2[0]));
      if (!dev) throw new SdevError(`Device not found: ${args2[0]}`, line);
      dev.write(args2[1]);
      return null;
    });
    this.syscalls.register("win_create", (args2) => windowManager.createWindow(String(args2[0]), Number(args2[1] ?? 0), Number(args2[2] ?? 0), Number(args2[3] ?? 400), Number(args2[4] ?? 300)));
    this.syscalls.register("win_close", (args2) => windowManager.closeWindow(Number(args2[0])));
    this.syscalls.register("win_move", (args2) => {
      windowManager.moveWindow(Number(args2[0]), Number(args2[1]), Number(args2[2]));
      return null;
    });
    this.syscalls.register("win_resize", (args2) => {
      windowManager.resizeWindow(Number(args2[0]), Number(args2[1]), Number(args2[2]));
      return null;
    });
    this.syscalls.register("win_focus", (args2) => {
      windowManager.focusWindow(Number(args2[0]));
      return null;
    });
    this.syscalls.register("win_list", () => windowManager.listWindows().map((w) => ({
      id: w.id,
      title: w.title,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      focused: w.focused
    })));
    this.syscalls.register("time", () => Date.now());
    this.syscalls.register("uptime", () => this.booted ? Date.now() : 0);
    this.syscalls.register("interrupt", (args2, line) => {
      const num = Number(args2[0]);
      const handler = args2[1];
      if (!handler || typeof handler !== "object" || !("call" in handler)) throw new SdevError("interrupt handler must be a function", line);
      hal.registerInterrupt(num, handler);
      return null;
    }, "kernel");
    this.syscalls.register("get_privilege", () => this.privilegeLevel);
    this.syscalls.register("set_privilege", (args2, line) => {
      const level = String(args2[0]);
      if (level !== "kernel" && level !== "user") throw new SdevError("Invalid privilege level", line);
      if (this.privilegeLevel !== "kernel") throw new SdevError("Permission denied: only kernel can change privilege", line);
      this.privilegeLevel = level;
      return null;
    }, "kernel");
    this.syscalls.register("panic", (args2, line) => {
      const msg = args2.length > 0 ? stringify(args2[0]) : "kernel panic";
      this.output(`
========================================`);
      this.output(`  KERNEL PANIC: ${msg}`);
      this.output(`========================================`);
      this.output(`  System halted.`);
      throw new SdevError(`KERNEL PANIC: ${msg}`, line);
    }, "kernel");
  }
  registerDefaultDevices() {
    const keyBuffer = [];
    this.hal.registerDevice({
      name: "keyboard",
      type: "keyboard",
      read: () => keyBuffer.shift() ?? null,
      write: (data) => {
        keyBuffer.push(String(data));
      },
      status: () => ({ buffered: keyBuffer.length })
    });
    const displayBuffer = [];
    this.hal.registerDevice({
      name: "display",
      type: "display",
      read: () => [...displayBuffer],
      write: (data) => {
        displayBuffer.push(String(data));
      },
      status: () => ({ lines: displayBuffer.length })
    });
    let timerTicks = 0;
    this.hal.registerDevice({
      name: "timer",
      type: "timer",
      read: () => timerTicks,
      write: () => {
        timerTicks++;
      },
      status: () => ({ ticks: timerTicks, time: Date.now() })
    });
    this.hal.registerDevice({
      name: "disk0",
      type: "disk",
      read: () => this.vfs.toTome(),
      write: () => {
      },
      status: () => ({ type: "virtual", mounted: true })
    });
  }
  boot() {
    this.booted = true;
    this.output("[KERNEL] sdev OS booting...");
    this.output("[KERNEL] VFS initialized");
    this.output("[KERNEL] Task scheduler ready");
    this.output("[KERNEL] Syscall interface registered");
    this.output("[KERNEL] HAL: " + this.hal.listDevices().join(", "));
    this.output("[KERNEL] Window manager ready");
    this.output("[KERNEL] Boot complete.");
    this.vfs.write("/var/log/boot.log", [
      `sdev OS boot at ${(/* @__PURE__ */ new Date()).toISOString()}`,
      `Devices: ${this.hal.listDevices().join(", ")}`,
      `Syscalls: ${this.syscalls.list().join(", ")}`
    ].join("\n"));
  }
  getPrivilege() {
    return this.privilegeLevel;
  }
  setPrivilege(level) {
    this.privilegeLevel = level;
  }
};
function createKernelBuiltins(output) {
  const kernel = new Kernel(output);
  const builtins = /* @__PURE__ */ new Map();
  builtins.set("syscall", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 1) throw new SdevError("syscall() requires at least 1 argument (name)", line);
      const name = String(args2[0]);
      return kernel.syscalls.call(name, args2.slice(1), line, kernel.getPrivilege());
    }
  });
  builtins.set("kernelBoot", {
    type: "builtin",
    call: () => {
      kernel.boot();
      return true;
    }
  });
  builtins.set("fsRead", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("fsRead() takes 1 argument", line);
      return kernel.vfs.read(String(args2[0]));
    }
  });
  builtins.set("fsWrite", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("fsWrite() takes 2 arguments (path, content)", line);
      kernel.vfs.write(String(args2[0]), String(args2[1]));
      return true;
    }
  });
  builtins.set("fsList", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("fsList() takes 1 argument", line);
      return kernel.vfs.list(String(args2[0]));
    }
  });
  builtins.set("fsMkdir", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("fsMkdir() takes 1 argument", line);
      kernel.vfs.mkdir(String(args2[0]));
      return true;
    }
  });
  builtins.set("fsDelete", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("fsDelete() takes 1 argument", line);
      return kernel.vfs.delete(String(args2[0]));
    }
  });
  builtins.set("fsExists", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("fsExists() takes 1 argument", line);
      return kernel.vfs.exists(String(args2[0]));
    }
  });
  builtins.set("fsStat", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("fsStat() takes 1 argument", line);
      return kernel.vfs.stat(String(args2[0]));
    }
  });
  builtins.set("fsAppend", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("fsAppend() takes 2 arguments", line);
      kernel.vfs.append(String(args2[0]), String(args2[1]));
      return true;
    }
  });
  builtins.set("createTask", {
    type: "builtin",
    call: (args2, line) => {
      const fn = args2[0];
      if (!fn || typeof fn !== "object" || !("call" in fn)) throw new SdevError("createTask() requires a function", line);
      return kernel.scheduler.createTask(fn, String(args2[1] ?? ""), Number(args2[2] ?? 0));
    }
  });
  builtins.set("killTask", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("killTask() takes 1 argument", line);
      return kernel.scheduler.killTask(Number(args2[0]));
    }
  });
  builtins.set("yieldTask", {
    type: "builtin",
    call: () => {
      kernel.scheduler.yieldCurrent();
      return null;
    }
  });
  builtins.set("taskList", {
    type: "builtin",
    call: () => kernel.scheduler.listTasks().map((t) => ({
      id: t.id,
      name: t.name,
      state: t.state,
      priority: t.priority
    }))
  });
  builtins.set("runTasks", {
    type: "builtin",
    call: (_args, line) => {
      kernel.scheduler.runAll(line);
      return null;
    }
  });
  builtins.set("heapAlloc", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("heapAlloc() takes 1 argument (size)", line);
      return kernel.heap.alloc(Number(args2[0]), line);
    }
  });
  builtins.set("heapFree", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("heapFree() takes 1 argument (address)", line);
      kernel.heap.free(Number(args2[0]), line);
      return null;
    }
  });
  builtins.set("heapLoad", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("heapLoad() takes 1 argument (address)", line);
      return kernel.heap.load(Number(args2[0]), line);
    }
  });
  builtins.set("heapStore", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("heapStore() takes 2 arguments (address, value)", line);
      kernel.heap.store(Number(args2[0]), args2[1], line);
      return null;
    }
  });
  builtins.set("heapStats", {
    type: "builtin",
    call: () => kernel.heap.stats()
  });
  builtins.set("gc", {
    type: "builtin",
    call: () => kernel.heap.gc(/* @__PURE__ */ new Set())
  });
  builtins.set("createWindow", {
    type: "builtin",
    call: (args2) => {
      return kernel.windowManager.createWindow(
        String(args2[0] ?? "Window"),
        Number(args2[1] ?? 0),
        Number(args2[2] ?? 0),
        Number(args2[3] ?? 400),
        Number(args2[4] ?? 300)
      );
    }
  });
  builtins.set("closeWindow", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("closeWindow() takes 1 argument", line);
      return kernel.windowManager.closeWindow(Number(args2[0]));
    }
  });
  builtins.set("moveWindow", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 3) throw new SdevError("moveWindow() takes 3 arguments (id, x, y)", line);
      kernel.windowManager.moveWindow(Number(args2[0]), Number(args2[1]), Number(args2[2]));
      return null;
    }
  });
  builtins.set("resizeWindow", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 3) throw new SdevError("resizeWindow() takes 3 arguments (id, w, h)", line);
      kernel.windowManager.resizeWindow(Number(args2[0]), Number(args2[1]), Number(args2[2]));
      return null;
    }
  });
  builtins.set("windowList", {
    type: "builtin",
    call: () => kernel.windowManager.listWindows().map((w) => ({
      id: w.id,
      title: w.title,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      focused: w.focused
    }))
  });
  builtins.set("deviceList", {
    type: "builtin",
    call: () => kernel.hal.listDevices()
  });
  builtins.set("deviceRead", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("deviceRead() takes 1 argument", line);
      const dev = kernel.hal.getDevice(String(args2[0]));
      if (!dev) throw new SdevError(`Device not found: ${args2[0]}`, line);
      return dev.read();
    }
  });
  builtins.set("deviceWrite", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("deviceWrite() takes 2 arguments", line);
      const dev = kernel.hal.getDevice(String(args2[0]));
      if (!dev) throw new SdevError(`Device not found: ${args2[0]}`, line);
      dev.write(args2[1]);
      return null;
    }
  });
  builtins.set("deviceStatus", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("deviceStatus() takes 1 argument", line);
      const dev = kernel.hal.getDevice(String(args2[0]));
      if (!dev) throw new SdevError(`Device not found: ${args2[0]}`, line);
      return dev.status();
    }
  });
  builtins.set("onInterrupt", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("onInterrupt() takes 2 arguments (num, handler)", line);
      const handler = args2[1];
      if (!handler || typeof handler !== "object" || !("call" in handler)) throw new SdevError("Second argument must be a function", line);
      kernel.hal.registerInterrupt(Number(args2[0]), handler);
      return null;
    }
  });
  builtins.set("triggerInterrupt", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("triggerInterrupt() takes 1 argument", line);
      kernel.hal.triggerInterrupt(Number(args2[0]));
      kernel.hal.processPendingInterrupts(line);
      return null;
    }
  });
  builtins.set("getPrivilege", {
    type: "builtin",
    call: () => kernel.getPrivilege()
  });
  builtins.set("setPrivilege", {
    type: "builtin",
    call: (args2, line) => {
      const level = String(args2[0]);
      if (level !== "kernel" && level !== "user") throw new SdevError("Invalid privilege level", line);
      if (kernel.getPrivilege() !== "kernel") throw new SdevError("Permission denied", line);
      kernel.setPrivilege(level);
      return null;
    }
  });
  const typedArrayFactory = (TypedArrayCtor, typeName) => ({
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError(`${typeName}() takes 1 argument (size)`, line);
      const size = Math.trunc(Number(args2[0]));
      const data = new TypedArrayCtor(size);
      const obj = { _type: typeName, length: size };
      obj.get = { type: "builtin", call: (a) => data[a[0]] };
      obj.set = { type: "builtin", call: (a) => {
        data[a[0]] = a[1];
        return null;
      } };
      obj.fill = { type: "builtin", call: (a) => {
        data.fill(a[0]);
        return null;
      } };
      obj.toList = { type: "builtin", call: () => Array.from(data) };
      obj.slice = { type: "builtin", call: (a) => Array.from(data.slice(a[0], a[1])) };
      obj.size = { type: "builtin", call: () => size };
      obj.copyTo = { type: "builtin", call: (a, l) => {
        const target = a[0];
        if (!target || !target._type) throw new SdevError("Target must be a typed array", l);
        return null;
      } };
      return obj;
    }
  });
  builtins.set("u8", typedArrayFactory(Uint8Array, "u8"));
  builtins.set("u16", typedArrayFactory(Uint16Array, "u16"));
  builtins.set("u32", typedArrayFactory(Uint32Array, "u32"));
  builtins.set("i8", typedArrayFactory(Int8Array, "i8"));
  builtins.set("i16", typedArrayFactory(Int16Array, "i16"));
  builtins.set("i32", typedArrayFactory(Int32Array, "i32"));
  builtins.set("f32", typedArrayFactory(Float32Array, "f32"));
  builtins.set("f64", typedArrayFactory(Float64Array, "f64"));
  const eventHandlers = /* @__PURE__ */ new Map();
  builtins.set("onEvent", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("onEvent() takes 2 arguments (event, handler)", line);
      const event = String(args2[0]);
      const handler = args2[1];
      if (!handler || typeof handler !== "object" || !("call" in handler)) throw new SdevError("Second argument must be a function", line);
      if (!eventHandlers.has(event)) eventHandlers.set(event, []);
      eventHandlers.get(event).push(handler);
      return null;
    }
  });
  builtins.set("emitEvent", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 1) throw new SdevError("emitEvent() takes at least 1 argument", line);
      const event = String(args2[0]);
      const data = args2.slice(1);
      const handlers = eventHandlers.get(event);
      if (handlers) {
        for (const h of handlers) h.call(data, line);
      }
      return null;
    }
  });
  builtins.set("loadModule", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("loadModule() takes 1 argument (path)", line);
      const path = String(args2[0]);
      if (kernel.vfs.exists(path)) {
        return kernel.vfs.read(path);
      }
      throw new SdevError(`Module not found: ${path}`, line);
    }
  });
  builtins.set("getTime", { type: "builtin", call: () => Date.now() });
  return { builtins, kernel };
}

// src/lang/vm.ts
var VM = class {
  stack = [];
  frames = [];
  globals;
  output;
  maxSteps = 5e6;
  steps = 0;
  kernel;
  constructor(output) {
    this.output = output;
    this.globals = new Environment();
    const builtins = createBuiltins(output);
    builtins.forEach((fn, name) => this.globals.define(name, fn));
    const { builtins: kernelBuiltins, kernel } = createKernelBuiltins(output);
    this.kernel = kernel;
    kernelBuiltins.forEach((fn, name) => this.globals.define(name, fn));
    this.globals.define("PI", Math.PI);
    this.globals.define("TAU", Math.PI * 2);
    this.globals.define("E", Math.E);
    this.globals.define("INFINITY", Infinity);
    this.globals.define("NAN", NaN);
  }
  run(chunk) {
    this.stack = [];
    this.frames = [];
    this.steps = 0;
    this.pushFrame(chunk.entry, this.globals);
    return this.executeLoop();
  }
  pushFrame(def, env) {
    this.frames.push({ def, ip: 0, env });
  }
  executeLoop() {
    while (this.frames.length > 0) {
      const frame = this.frames[this.frames.length - 1];
      if (frame.ip >= frame.def.code.length) {
        this.frames.pop();
        continue;
      }
      const ins = frame.def.code[frame.ip++];
      this.steps++;
      if (this.steps > this.maxSteps) {
        throw new SdevError("VM: maximum execution steps exceeded (infinite loop?)", ins.line);
      }
      this.execute(ins, frame);
    }
    return this.stack.length > 0 ? this.peek() : null;
  }
  execute(ins, frame) {
    switch (ins.op) {
      case "PUSH_NUM" /* PUSH_NUM */:
        this.push(ins.operand);
        break;
      case "PUSH_STR" /* PUSH_STR */:
        this.push(ins.operand);
        break;
      case "PUSH_BOOL" /* PUSH_BOOL */:
        this.push(ins.operand);
        break;
      case "PUSH_NULL" /* PUSH_NULL */:
        this.push(null);
        break;
      case "POP" /* POP */:
        this.pop();
        break;
      case "DUP" /* DUP */:
        this.push(this.peek());
        break;
      case "SWAP" /* SWAP */: {
        const a = this.pop();
        const b = this.pop();
        this.push(a);
        this.push(b);
        break;
      }
      case "LOAD" /* LOAD */: {
        const name = ins.operand;
        this.push(frame.env.get(name, ins.line));
        break;
      }
      case "DEFINE" /* DEFINE */: {
        const val = this.pop();
        frame.env.define(ins.operand, val);
        break;
      }
      case "STORE" /* STORE */: {
        const val = this.pop();
        frame.env.set(ins.operand, val, ins.line);
        break;
      }
      // Arithmetic
      case "ADD" /* ADD */: {
        const r = this.pop();
        const l = this.pop();
        if (typeof l === "number" && typeof r === "number") {
          this.push(l + r);
          break;
        }
        if (typeof l === "string" || typeof r === "string") {
          this.push(stringify(l) + stringify(r));
          break;
        }
        if (Array.isArray(l) && Array.isArray(r)) {
          this.push([...l, ...r]);
          break;
        }
        throw new SdevError("Cannot use '+' with these types", ins.line);
      }
      case "SUB" /* SUB */: {
        const r = this.pop();
        const l = this.pop();
        this.push(l - r);
        break;
      }
      case "MUL" /* MUL */: {
        const r = this.pop();
        const l = this.pop();
        if (typeof l === "number" && typeof r === "number") {
          this.push(l * r);
          break;
        }
        if (typeof l === "string" && typeof r === "number") {
          this.push(l.repeat(r));
          break;
        }
        throw new SdevError("Cannot use '*' with these types", ins.line);
      }
      case "DIV" /* DIV */: {
        const r = this.pop();
        const l = this.pop();
        if (r === 0) throw new SdevError("Division by zero", ins.line);
        this.push(l / r);
        break;
      }
      case "MOD" /* MOD */: {
        const r = this.pop();
        const l = this.pop();
        this.push(l % r);
        break;
      }
      case "POW" /* POW */: {
        const r = this.pop();
        const l = this.pop();
        this.push(Math.pow(l, r));
        break;
      }
      case "NEG" /* NEG */: {
        this.push(-this.pop());
        break;
      }
      // Bitwise
      case "BIT_AND" /* BIT_AND */: {
        const r = this.pop();
        const l = this.pop();
        this.push(l & r);
        break;
      }
      case "BIT_OR" /* BIT_OR */: {
        const r = this.pop();
        const l = this.pop();
        this.push(l | r);
        break;
      }
      case "BIT_XOR" /* BIT_XOR */: {
        const r = this.pop();
        const l = this.pop();
        this.push(l ^ r);
        break;
      }
      case "BIT_NOT" /* BIT_NOT */: {
        this.push(~this.pop());
        break;
      }
      case "BIT_SHL" /* BIT_SHL */: {
        const r = this.pop();
        const l = this.pop();
        this.push(l << r);
        break;
      }
      case "BIT_SHR" /* BIT_SHR */: {
        const r = this.pop();
        const l = this.pop();
        this.push(l >> r);
        break;
      }
      // Comparison
      case "EQ" /* EQ */: {
        const r = this.pop();
        const l = this.pop();
        this.push(this.isEqual(l, r));
        break;
      }
      case "NEQ" /* NEQ */: {
        const r = this.pop();
        const l = this.pop();
        this.push(!this.isEqual(l, r));
        break;
      }
      case "LT" /* LT */: {
        const r = this.pop();
        const l = this.pop();
        this.push(l < r);
        break;
      }
      case "GT" /* GT */: {
        const r = this.pop();
        const l = this.pop();
        this.push(l > r);
        break;
      }
      case "LTE" /* LTE */: {
        const r = this.pop();
        const l = this.pop();
        this.push(l <= r);
        break;
      }
      case "GTE" /* GTE */: {
        const r = this.pop();
        const l = this.pop();
        this.push(l >= r);
        break;
      }
      // Logical
      case "NOT" /* NOT */: {
        this.push(!isTruthy(this.pop()));
        break;
      }
      case "AND" /* AND */: {
        const r = this.pop();
        const l = this.pop();
        this.push(isTruthy(l) ? r : l);
        break;
      }
      case "OR" /* OR */: {
        const r = this.pop();
        const l = this.pop();
        this.push(isTruthy(l) ? l : r);
        break;
      }
      // Control flow
      case "JUMP" /* JUMP */:
        frame.ip = ins.operand;
        break;
      case "JUMP_IF_FALSE" /* JUMP_IF_FALSE */: {
        const cond = this.pop();
        if (!isTruthy(cond)) frame.ip = ins.operand;
        break;
      }
      case "JUMP_IF_TRUE" /* JUMP_IF_TRUE */: {
        const cond = this.pop();
        if (isTruthy(cond)) frame.ip = ins.operand;
        break;
      }
      // Collections
      case "MAKE_LIST" /* MAKE_LIST */: {
        const count = ins.operand;
        const items = this.stack.splice(this.stack.length - count, count);
        this.push(items);
        break;
      }
      case "MAKE_DICT" /* MAKE_DICT */: {
        const count = ins.operand;
        const pairs = this.stack.splice(this.stack.length - count * 2, count * 2);
        const dict = {};
        for (let i = 0; i < pairs.length; i += 2) {
          dict[stringify(pairs[i])] = pairs[i + 1];
        }
        this.push(dict);
        break;
      }
      case "INDEX_GET" /* INDEX_GET */: {
        const idx = this.pop();
        const obj = this.pop();
        if (Array.isArray(obj)) {
          const i = idx;
          const ri = i < 0 ? obj.length + i : i;
          this.push(obj[ri]);
        } else if (typeof obj === "string") {
          this.push(obj[idx]);
        } else if (obj && typeof obj === "object") {
          this.push(obj[stringify(idx)]);
        } else {
          throw new SdevError("Cannot index this type", ins.line);
        }
        break;
      }
      case "INDEX_SET" /* INDEX_SET */: {
        const val = this.pop();
        const idx = this.pop();
        const obj = this.pop();
        if (Array.isArray(obj)) {
          obj[idx] = val;
        } else if (obj && typeof obj === "object") {
          obj[stringify(idx)] = val;
        } else {
          throw new SdevError("Cannot set index on this type", ins.line);
        }
        break;
      }
      case "MEMBER_GET" /* MEMBER_GET */: {
        const obj = this.pop();
        const prop = ins.operand;
        if (obj && typeof obj === "object") {
          this.push(obj[prop]);
        } else {
          throw new SdevError(`Cannot access property '${prop}'`, ins.line);
        }
        break;
      }
      case "MEMBER_SET" /* MEMBER_SET */: {
        const val = this.pop();
        const obj = this.pop();
        const prop = ins.operand;
        if (obj && typeof obj === "object") {
          obj[prop] = val;
        } else {
          throw new SdevError(`Cannot set property '${prop}'`, ins.line);
        }
        break;
      }
      // Functions
      case "MAKE_FUNC" /* MAKE_FUNC */: {
        const def = frame.def.functions[ins.operand];
        const capturedEnv = frame.env;
        const fn = {
          type: "user",
          call: (args2, callLine) => {
            if (args2.length !== def.params.length) {
              throw new SdevError(
                `Function '${def.name}' expects ${def.params.length} args, got ${args2.length}`,
                callLine
              );
            }
            return this.callFunction(def, args2, capturedEnv, callLine);
          }
        };
        this.push(fn);
        break;
      }
      case "CALL" /* CALL */: {
        const argCount = ins.operand;
        const args2 = this.stack.splice(this.stack.length - argCount, argCount);
        const callee = this.pop();
        if (!callee || typeof callee !== "object" || !("type" in callee)) {
          throw new SdevError("Cannot call non-function", ins.line);
        }
        const fn = callee;
        const result = fn.call(args2, ins.line);
        this.push(result ?? null);
        break;
      }
      case "RETURN" /* RETURN */: {
        const retVal = this.pop();
        this.frames.pop();
        this.push(retVal);
        break;
      }
      // OS opcodes
      case "SYSCALL" /* SYSCALL */: {
        const name = ins.operand;
        const argCount = this.pop();
        const args2 = this.stack.splice(this.stack.length - argCount, argCount);
        const result = this.kernel.syscalls.call(name, args2, ins.line, this.kernel.getPrivilege());
        this.push(result ?? null);
        break;
      }
      case "ALLOC" /* ALLOC */: {
        const size = this.pop();
        const addr = this.kernel.heap.alloc(size, ins.line);
        this.push(addr);
        break;
      }
      case "FREE" /* FREE */: {
        const addr = this.pop();
        this.kernel.heap.free(addr, ins.line);
        break;
      }
      case "HEAP_LOAD" /* HEAP_LOAD */: {
        const addr = this.pop();
        this.push(this.kernel.heap.load(addr, ins.line));
        break;
      }
      case "HEAP_STORE" /* HEAP_STORE */: {
        const val = this.pop();
        const addr = this.pop();
        this.kernel.heap.store(addr, val, ins.line);
        break;
      }
      case "INTERRUPT" /* INTERRUPT */: {
        const num = ins.operand;
        this.kernel.hal.triggerInterrupt(num);
        this.kernel.hal.processPendingInterrupts(ins.line);
        break;
      }
      case "TASK_CREATE" /* TASK_CREATE */: {
        const fn = this.pop();
        const id = this.kernel.scheduler.createTask(fn);
        this.push(id);
        break;
      }
      case "TASK_YIELD" /* TASK_YIELD */: {
        this.kernel.scheduler.yieldCurrent();
        break;
      }
      case "TASK_KILL" /* TASK_KILL */: {
        const id = this.pop();
        this.push(this.kernel.scheduler.killTask(id));
        break;
      }
      case "NOP" /* NOP */:
        break;
      case "DEBUG_BREAK" /* DEBUG_BREAK */:
        this.output(`[DEBUG] IP=${frame.ip} Stack=[${this.stack.map((v) => stringify(v)).join(", ")}]`);
        break;
      case "HALT" /* HALT */:
        this.frames.length = 0;
        break;
      default:
        throw new SdevError(`VM: unknown opcode ${ins.op}`, ins.line);
    }
  }
  callFunction(def, args2, closureEnv, callLine) {
    const savedStack = [...this.stack];
    const savedFrames = [...this.frames];
    this.stack = [];
    this.frames = [];
    const funcEnv = new Environment(closureEnv);
    for (let i = 0; i < def.params.length; i++) {
      funcEnv.define(def.params[i], args2[i]);
    }
    this.pushFrame(def, funcEnv);
    try {
      this.executeLoop();
    } catch (e) {
      if (e instanceof ReturnException) {
        this.stack = savedStack;
        this.frames = savedFrames;
        return e.value;
      }
      throw e;
    }
    const retVal = this.stack.length > 0 ? this.stack.pop() : null;
    this.stack = savedStack;
    this.frames = savedFrames;
    return retVal;
  }
  push(val) {
    this.stack.push(val);
  }
  pop() {
    if (this.stack.length === 0) throw new SdevError("VM: stack underflow", 0);
    return this.stack.pop();
  }
  peek() {
    return this.stack[this.stack.length - 1];
  }
  isEqual(a, b) {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => this.isEqual(v, b[i]));
    }
    return a === b;
  }
  // Debug: inspect VM state
  inspectStack() {
    return this.stack.map((v) => stringify(v));
  }
  inspectFrames() {
    return this.frames.map((f) => `${f.def.name || "<main>"} @${f.ip}`);
  }
};

// src/lang/advanced.ts
function createAdvancedBuiltins(output) {
  const builtins = /* @__PURE__ */ new Map();
  builtins.set("etch", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("etch() takes 1 argument", line);
      return JSON.stringify(args2[0]);
    }
  });
  builtins.set("unetch", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("unetch() takes 1 argument", line);
      try {
        return JSON.parse(args2[0]);
      } catch {
        throw new SdevError("Invalid JSON", line);
      }
    }
  });
  const virtualFS = /* @__PURE__ */ new Map();
  builtins.set("inscribe", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("inscribe() takes 2 arguments (path, content)", line);
      const path = args2[0];
      const content = stringify(args2[1]);
      virtualFS.set(path, content);
      output(`\u{1F4DD} Written to ${path}`);
      return true;
    }
  });
  builtins.set("decipher", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("decipher() takes 1 argument (path)", line);
      const path = args2[0];
      const content = virtualFS.get(path);
      if (content === void 0) {
        throw new SdevError(`File not found: ${path}`, line);
      }
      return content;
    }
  });
  builtins.set("erase", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length === 2) {
        if (args2[0] && typeof args2[0] === "object" && !Array.isArray(args2[0])) {
          const key = String(args2[1]);
          const obj = args2[0];
          const existed = key in obj;
          delete obj[key];
          return existed;
        }
      }
      if (args2.length === 1 && typeof args2[0] === "string") {
        const existed = virtualFS.delete(args2[0]);
        return existed;
      }
      throw new SdevError("erase() takes 1 argument (path) or 2 arguments (tome, key)", line);
    }
  });
  builtins.set("scroll", {
    type: "builtin",
    call: () => {
      return Array.from(virtualFS.keys());
    }
  });
  builtins.set("invoke", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 1) throw new SdevError("invoke() takes at least 1 argument (url)", line);
      const url = args2[0];
      const options = args2[1] ?? {};
      return {
        type: "promise",
        url,
        options,
        resolve: async () => {
          try {
            const response = await fetch(url, {
              method: options.method ?? "GET",
              headers: options.headers,
              body: options.body ? JSON.stringify(options.body) : void 0
            });
            const text = await response.text();
            try {
              return JSON.parse(text);
            } catch {
              return text;
            }
          } catch (e) {
            throw new SdevError(`Network error: ${e}`, line);
          }
        }
      };
    }
  });
  builtins.set("now", {
    type: "builtin",
    call: () => Date.now()
  });
  builtins.set("timestamp", {
    type: "builtin",
    call: () => (/* @__PURE__ */ new Date()).toISOString()
  });
  builtins.set("pause", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("pause() takes 1 argument (ms)", line);
      const ms = args2[0];
      return { type: "delay", ms };
    }
  });
  builtins.set("sin", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("sin() takes 1 argument", line);
      return Math.sin(args2[0]);
    }
  });
  builtins.set("cos", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("cos() takes 1 argument", line);
      return Math.cos(args2[0]);
    }
  });
  builtins.set("tan", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("tan() takes 1 argument", line);
      return Math.tan(args2[0]);
    }
  });
  builtins.set("asin", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("asin() takes 1 argument", line);
      return Math.asin(args2[0]);
    }
  });
  builtins.set("acos", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("acos() takes 1 argument", line);
      return Math.acos(args2[0]);
    }
  });
  builtins.set("atan", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("atan() takes 1 argument", line);
      return Math.atan(args2[0]);
    }
  });
  builtins.set("atan2", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("atan2() takes 2 arguments (y, x)", line);
      return Math.atan2(args2[0], args2[1]);
    }
  });
  builtins.set("log", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("log() takes 1 argument", line);
      return Math.log(args2[0]);
    }
  });
  builtins.set("log10", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("log10() takes 1 argument", line);
      return Math.log10(args2[0]);
    }
  });
  builtins.set("exp", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("exp() takes 1 argument", line);
      return Math.exp(args2[0]);
    }
  });
  builtins.set("PI", {
    type: "builtin",
    call: () => Math.PI
  });
  builtins.set("E", {
    type: "builtin",
    call: () => Math.E
  });
  builtins.set("TAU", {
    type: "builtin",
    call: () => Math.PI * 2
  });
  builtins.set("sort", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 1) throw new SdevError("sort() takes at least 1 argument", line);
      const arr = args2[0];
      if (!Array.isArray(arr)) throw new SdevError("First argument must be a list", line);
      const sorted = [...arr];
      if (args2.length === 2 && typeof args2[1] === "object" && args2[1] !== null) {
        const fn = args2[1];
        sorted.sort((a, b) => {
          const result = fn.call([a, b], line);
          return result;
        });
      } else {
        sorted.sort((a, b) => {
          if (typeof a === "number" && typeof b === "number") return a - b;
          return String(a).localeCompare(String(b));
        });
      }
      return sorted;
    }
  });
  builtins.set("find", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("find() takes 2 arguments (list, predicate)", line);
      const arr = args2[0];
      const fn = args2[1];
      if (!Array.isArray(arr)) throw new SdevError("First argument must be a list", line);
      for (const item of arr) {
        if (fn.call([item], line)) return item;
      }
      return null;
    }
  });
  builtins.set("position", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("position() takes 2 arguments", line);
      const arr = args2[0];
      const needle = args2[1];
      if (!Array.isArray(arr)) throw new SdevError("First argument must be a list", line);
      return arr.indexOf(needle);
    }
  });
  builtins.set("unique", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("unique() takes 1 argument", line);
      const arr = args2[0];
      if (!Array.isArray(arr)) throw new SdevError("Argument must be a list", line);
      return [...new Set(arr.map((x) => JSON.stringify(x)))].map((x) => JSON.parse(x));
    }
  });
  builtins.set("union", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("union() takes 2 arguments", line);
      const a = args2[0];
      const b = args2[1];
      if (!Array.isArray(a) || !Array.isArray(b)) throw new SdevError("Arguments must be lists", line);
      const set = /* @__PURE__ */ new Set([...a.map((x) => JSON.stringify(x)), ...b.map((x) => JSON.stringify(x))]);
      return [...set].map((x) => JSON.parse(x));
    }
  });
  builtins.set("intersect", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("intersect() takes 2 arguments", line);
      const a = args2[0];
      const b = args2[1];
      if (!Array.isArray(a) || !Array.isArray(b)) throw new SdevError("Arguments must be lists", line);
      const setB = new Set(b.map((x) => JSON.stringify(x)));
      return a.filter((x) => setB.has(JSON.stringify(x)));
    }
  });
  builtins.set("randint", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("randint() takes 2 arguments (min, max)", line);
      const min = Math.ceil(args2[0]);
      const max = Math.floor(args2[1]);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  });
  builtins.set("pick", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("pick() takes 1 argument", line);
      const arr = args2[0];
      if (!Array.isArray(arr)) throw new SdevError("Argument must be a list", line);
      if (arr.length === 0) return null;
      return arr[Math.floor(Math.random() * arr.length)];
    }
  });
  builtins.set("shuffle", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("shuffle() takes 1 argument", line);
      const arr = args2[0];
      if (!Array.isArray(arr)) throw new SdevError("Argument must be a list", line);
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
  });
  builtins.set("assert", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 1) throw new SdevError("assert() takes at least 1 argument", line);
      const condition = args2[0];
      const message = args2[1] ?? "Assertion failed";
      if (!condition) {
        throw new SdevError(message, line);
      }
      return true;
    }
  });
  builtins.set("asserteq", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("asserteq() takes 2 arguments", line);
      const a = JSON.stringify(args2[0]);
      const b = JSON.stringify(args2[1]);
      if (a !== b) {
        throw new SdevError(`Assertion failed: ${a} differs ${b}`, line);
      }
      return true;
    }
  });
  return builtins;
}

// src/lang/matrix.ts
function createMatrixBuiltins() {
  const builtins = /* @__PURE__ */ new Map();
  builtins.set("matrix", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length < 2) throw new SdevError("matrix() takes at least 2 arguments (rows, cols, fill?)", line);
      const rows = args2[0];
      const cols = args2[1];
      const fill = args2[2] ?? 0;
      const result = [];
      for (let i = 0; i < rows; i++) {
        result.push(new Array(cols).fill(fill));
      }
      return result;
    }
  });
  builtins.set("identity", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("identity() takes 1 argument (size)", line);
      const n = args2[0];
      const result = [];
      for (let i = 0; i < n; i++) {
        const row = new Array(n).fill(0);
        row[i] = 1;
        result.push(row);
      }
      return result;
    }
  });
  builtins.set("transpose", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("transpose() takes 1 argument", line);
      const m = args2[0];
      if (!Array.isArray(m)) throw new SdevError("Argument must be a 2D list", line);
      if (m.length === 0) return [];
      const rows = m.length;
      const cols = m[0].length;
      const result = [];
      for (let j = 0; j < cols; j++) {
        const row = [];
        for (let i = 0; i < rows; i++) {
          row.push(m[i][j]);
        }
        result.push(row);
      }
      return result;
    }
  });
  builtins.set("dot", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("dot() takes 2 arguments", line);
      const a = args2[0];
      const b = args2[1];
      if (!Array.isArray(a) || !Array.isArray(b)) {
        throw new SdevError("Arguments must be lists", line);
      }
      if (a.length !== b.length) throw new SdevError("Vectors must have same length", line);
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
      }
      return sum;
    }
  });
  builtins.set("matmul", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("matmul() takes 2 arguments", line);
      const a = args2[0];
      const b = args2[1];
      if (!Array.isArray(a) || !Array.isArray(b)) {
        throw new SdevError("Arguments must be 2D lists", line);
      }
      const rowsA = a.length;
      const colsA = a[0].length;
      const rowsB = b.length;
      const colsB = b[0].length;
      if (colsA !== rowsB) throw new SdevError("Matrix dimensions incompatible for multiplication", line);
      const result = [];
      for (let i = 0; i < rowsA; i++) {
        const row = [];
        for (let j = 0; j < colsB; j++) {
          let sum = 0;
          for (let k = 0; k < colsA; k++) {
            sum += a[i][k] * b[k][j];
          }
          row.push(sum);
        }
        result.push(row);
      }
      return result;
    }
  });
  builtins.set("matadd", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("matadd() takes 2 arguments", line);
      return matrixOp(args2[0], args2[1], (a, b) => a + b, line);
    }
  });
  builtins.set("matsub", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("matsub() takes 2 arguments", line);
      return matrixOp(args2[0], args2[1], (a, b) => a - b, line);
    }
  });
  builtins.set("matscale", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 2) throw new SdevError("matscale() takes 2 arguments (matrix, scalar)", line);
      const m = args2[0];
      const s = args2[1];
      return m.map((row) => row.map((v) => v * s));
    }
  });
  builtins.set("shape", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("shape() takes 1 argument", line);
      const m = args2[0];
      if (!Array.isArray(m)) return [0];
      if (m.length === 0) return [0];
      if (!Array.isArray(m[0])) return [m.length];
      return [m.length, m[0].length];
    }
  });
  builtins.set("flatten", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("flatten() takes 1 argument", line);
      const m = args2[0];
      if (!Array.isArray(m)) return [m];
      const flat = (arr) => {
        const result = [];
        for (const item of arr) {
          if (Array.isArray(item)) {
            result.push(...flat(item));
          } else {
            result.push(item);
          }
        }
        return result;
      };
      return flat(m);
    }
  });
  builtins.set("reshape", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 3) throw new SdevError("reshape() takes 3 arguments (list, rows, cols)", line);
      const arr = args2[0];
      const rows = args2[1];
      const cols = args2[2];
      if (!Array.isArray(arr)) throw new SdevError("First argument must be a list", line);
      const flat = arr.flat(Infinity);
      if (flat.length !== rows * cols) {
        throw new SdevError("Cannot reshape: size mismatch", line);
      }
      const result = [];
      for (let i = 0; i < rows; i++) {
        result.push(flat.slice(i * cols, (i + 1) * cols));
      }
      return result;
    }
  });
  builtins.set("matsum", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("matsum() takes 1 argument", line);
      const m = args2[0];
      if (!Array.isArray(m)) return m;
      const flat = m.flat(Infinity);
      return flat.reduce((a, b) => a + b, 0);
    }
  });
  builtins.set("matmean", {
    type: "builtin",
    call: (args2, line) => {
      if (args2.length !== 1) throw new SdevError("matmean() takes 1 argument", line);
      const m = args2[0];
      if (!Array.isArray(m)) return m;
      const flat = m.flat(Infinity);
      if (flat.length === 0) return 0;
      return flat.reduce((a, b) => a + b, 0) / flat.length;
    }
  });
  return builtins;
}
function matrixOp(a, b, op, line) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    throw new SdevError("Arguments must be 2D lists", line);
  }
  if (a.length !== b.length || a[0].length !== b[0].length) {
    throw new SdevError("Matrices must have same dimensions", line);
  }
  return a.map(
    (row, i) => row.map((v, j) => op(v, b[i][j]))
  );
}

// src/lang/interpreter.ts
var BreakSignal = class {
  constructor() {
  }
};
var ContinueSignal = class {
  constructor() {
  }
};
var Interpreter = class {
  globalEnv;
  output;
  constructor(output) {
    this.output = output;
    this.globalEnv = new Environment();
    const builtins = createBuiltins(output);
    builtins.forEach((fn, name) => this.globalEnv.define(name, fn));
    const advanced = createAdvancedBuiltins(output);
    advanced.forEach((fn, name) => this.globalEnv.define(name, fn));
    const matrix = createMatrixBuiltins();
    matrix.forEach((fn, name) => this.globalEnv.define(name, fn));
    this.globalEnv.define("PI", Math.PI);
    this.globalEnv.define("TAU", Math.PI * 2);
    this.globalEnv.define("E", Math.E);
    this.globalEnv.define("INFINITY", Infinity);
  }
  interpret(program) {
    let result = null;
    for (const stmt of program.statements) {
      result = this.execute(stmt, this.globalEnv);
    }
    return result;
  }
  execute(node, env) {
    switch (node.type) {
      case "Program":
        return this.executeProgram(node, env);
      case "NumberLiteral":
        return node.value;
      case "StringLiteral":
        return node.value;
      case "BooleanLiteral":
        return node.value;
      case "NullLiteral":
        return null;
      case "Identifier":
        return this.executeIdentifier(node, env);
      case "BinaryExpr":
        return this.executeBinary(node, env);
      case "UnaryExpr":
        return this.executeUnary(node, env);
      case "TernaryExpr":
        return this.executeTernary(node, env);
      case "AwaitExpr":
        return this.execute(node.operand, env);
      case "CallExpr":
        return this.executeCall(node, env);
      case "NewExpr":
        return this.executeNew(node, env);
      case "IndexExpr":
        return this.executeIndex(node, env);
      case "MemberExpr":
        return this.executeMember(node, env);
      case "ArrayLiteral":
        return node.elements.map((el) => this.execute(el, env));
      case "DictLiteral":
        return this.executeDict(node, env);
      case "LambdaExpr":
        return this.executeLambda(node, env);
      case "LetStatement":
        return this.executeLet(node, env);
      case "AssignStatement":
        return this.executeAssign(node, env);
      case "IndexAssignStatement":
        return this.executeIndexAssign(node, env);
      case "MemberAssignStatement":
        return this.executeMemberAssign(node, env);
      case "IfStatement":
        return this.executeIf(node, env);
      case "WhileStatement":
        return this.executeWhile(node, env);
      case "ForEachStatement":
        return this.executeForEach(node, env);
      case "ForInStatement":
        return this.executeForIn(node, env);
      case "FuncDeclaration":
        return this.executeFuncDecl(node, env);
      case "ClassDeclaration":
        return this.executeClassDecl(node, env);
      case "ReturnStatement":
        return this.executeReturn(node, env);
      case "BreakStatement":
        throw new BreakSignal();
      case "ContinueStatement":
        throw new ContinueSignal();
      case "TryStatement":
        return this.executeTry(node, env);
      case "BlockStatement":
        return this.executeBlock(node, env);
      case "ExpressionStatement":
        return this.execute(node.expression, env);
      default:
        throw new SdevError(`Unknown node type: ${node.type}`, 0);
    }
  }
  executeProgram(node, env) {
    let result = null;
    for (const stmt of node.statements) {
      result = this.execute(stmt, env);
    }
    return result;
  }
  executeIdentifier(node, env) {
    if (node.name === "PI") return Math.PI;
    if (node.name === "TAU") return Math.PI * 2;
    if (node.name === "E") return Math.E;
    if (node.name === "INFINITY") return Infinity;
    const val = env.get(node.name, node.line);
    if (val && typeof val === "object" && "type" in val) {
      const fn = val;
      if (fn.type === "builtin") {
      }
    }
    return val;
  }
  executeBinary(node, env) {
    if (node.operator === "also") {
      const left2 = this.execute(node.left, env);
      if (!isTruthy(left2)) return false;
      return isTruthy(this.execute(node.right, env));
    }
    if (node.operator === "either") {
      const left2 = this.execute(node.left, env);
      if (isTruthy(left2)) return left2;
      return this.execute(node.right, env);
    }
    const left = this.execute(node.left, env);
    const right = this.execute(node.right, env);
    switch (node.operator) {
      case "+":
        if (typeof left === "number" && typeof right === "number") return left + right;
        if (typeof left === "string" || typeof right === "string") return stringify(left) + stringify(right);
        if (Array.isArray(left) && Array.isArray(right)) return [...left, ...right];
        throw new SdevError("Cannot use '+' with these types", node.line);
      case "-":
        return this.requireNumbers(left, right, "-", node.line, (a, b) => a - b);
      case "*":
        if (typeof left === "number" && typeof right === "number") return left * right;
        if (typeof left === "string" && typeof right === "number") return left.repeat(Math.max(0, Math.floor(right)));
        if (typeof left === "number" && typeof right === "string") return right.repeat(Math.max(0, Math.floor(left)));
        if (Array.isArray(left) && typeof right === "number") {
          const result = [];
          for (let i = 0; i < Math.max(0, Math.floor(right)); i++) result.push(...left);
          return result;
        }
        if (typeof left === "number" && Array.isArray(right)) {
          const result = [];
          for (let i = 0; i < Math.max(0, Math.floor(left)); i++) result.push(...right);
          return result;
        }
        throw new SdevError("Cannot use '*' with these types", node.line);
      case "/":
        return this.requireNumbers(left, right, "/", node.line, (a, b) => {
          if (b === 0) throw new SdevError("Division by zero", node.line);
          return a / b;
        });
      case "%":
        return this.requireNumbers(left, right, "%", node.line, (a, b) => a % b);
      case "^":
        return this.requireNumbers(left, right, "^", node.line, (a, b) => Math.pow(a, b));
      case "<":
        if (typeof left === "number" && typeof right === "number") return left < right;
        if (typeof left === "string" && typeof right === "string") return left < right;
        return this.requireNumbers(left, right, "<", node.line, (a, b) => a < b);
      case ">":
        if (typeof left === "number" && typeof right === "number") return left > right;
        if (typeof left === "string" && typeof right === "string") return left > right;
        return this.requireNumbers(left, right, ">", node.line, (a, b) => a > b);
      case "<=":
        if (typeof left === "number" && typeof right === "number") return left <= right;
        if (typeof left === "string" && typeof right === "string") return left <= right;
        return this.requireNumbers(left, right, "<=", node.line, (a, b) => a <= b);
      case ">=":
        if (typeof left === "number" && typeof right === "number") return left >= right;
        if (typeof left === "string" && typeof right === "string") return left >= right;
        return this.requireNumbers(left, right, ">=", node.line, (a, b) => a >= b);
      case "equals":
        return this.isEqual(left, right);
      case "differs":
      case "<>":
        return !this.isEqual(left, right);
      default:
        throw new SdevError(`Unknown operator: ${node.operator}`, node.line);
    }
  }
  executeUnary(node, env) {
    const operand = this.execute(node.operand, env);
    switch (node.operator) {
      case "-":
        if (typeof operand !== "number") {
          throw new SdevError("Cannot use '-' with non-number", node.line);
        }
        return -operand;
      case "isnt":
        return !isTruthy(operand);
      default:
        throw new SdevError(`Unknown unary operator: ${node.operator}`, node.line);
    }
  }
  executeTernary(node, env) {
    const condition = this.execute(node.condition, env);
    if (isTruthy(condition)) {
      return this.execute(node.thenExpr, env);
    } else {
      return this.execute(node.elseExpr, env);
    }
  }
  executeCall(node, env) {
    const callee = this.execute(node.callee, env);
    const args2 = node.args.map((arg) => this.execute(arg, env));
    if (!callee || typeof callee !== "object") {
      throw new SdevError(`Cannot call non-function: ${stringify(callee)}`, node.line);
    }
    const fn = callee;
    if (fn.type !== "builtin" && fn.type !== "user" && fn.type !== "lambda") {
      throw new SdevError("Cannot call non-function", node.line);
    }
    return fn.call(args2, node.line);
  }
  executeNew(node, env) {
    let className;
    if (node.className.type === "Identifier") {
      className = node.className.name;
    } else {
      throw new SdevError("Expected class name", node.line);
    }
    const klass = env.get(className, node.line);
    if (!klass || klass.type !== "class") {
      throw new SdevError(`'${className}' is not a class`, node.line);
    }
    const instance = {
      type: "instance",
      klass,
      fields: {}
    };
    const instanceProxy = this.createInstanceProxy(instance, env);
    const initMethod = this.findMethod(klass, "init");
    if (initMethod) {
      const args2 = node.args.map((arg) => this.execute(arg, env));
      initMethod.call([instanceProxy, ...args2], node.line);
    }
    return instanceProxy;
  }
  createInstanceProxy(instance, env) {
    const proxy = instance.fields;
    const bindMethod = (methodName, method) => {
      return {
        type: "user",
        call: (args2, line) => {
          return method.call([proxy, ...args2], line);
        }
      };
    };
    let klass = instance.klass;
    while (klass) {
      klass.methods.forEach((method, name) => {
        if (!(name in proxy)) {
          Object.defineProperty(proxy, name, {
            get: () => bindMethod(name, method),
            enumerable: true,
            configurable: true
          });
        }
      });
      klass = klass.superClass;
    }
    return proxy;
  }
  findMethod(klass, name) {
    let current = klass;
    while (current) {
      if (current.methods.has(name)) return current.methods.get(name);
      current = current.superClass;
    }
    return void 0;
  }
  executeIndex(node, env) {
    const obj = this.execute(node.object, env);
    const index = this.execute(node.index, env);
    if (Array.isArray(obj)) {
      if (typeof index !== "number") {
        throw new SdevError("List index must be a number", node.line);
      }
      const idx = index < 0 ? obj.length + index : index;
      if (idx < 0 || idx >= obj.length) {
        throw new SdevError(`List index out of bounds: ${index}`, node.line);
      }
      return obj[idx];
    }
    if (typeof obj === "string") {
      if (typeof index !== "number") {
        throw new SdevError("String index must be a number", node.line);
      }
      const idx = index < 0 ? obj.length + index : index;
      if (idx < 0 || idx >= obj.length) {
        throw new SdevError("String index out of bounds", node.line);
      }
      return obj[idx];
    }
    if (obj && typeof obj === "object") {
      const key = stringify(index);
      return obj[key];
    }
    throw new SdevError("Cannot index this type", node.line);
  }
  executeMember(node, env) {
    const obj = this.execute(node.object, env);
    if (obj && typeof obj === "object") {
      const val = obj[node.property];
      return val !== void 0 ? val : null;
    }
    if (typeof obj === "string") {
      if (node.property === "length") return obj.length;
    }
    throw new SdevError(`Cannot access property '${node.property}' on this type`, node.line);
  }
  executeDict(node, env) {
    const result = {};
    for (const entry of node.entries) {
      const key = stringify(this.execute(entry.key, env));
      const value = this.execute(entry.value, env);
      result[key] = value;
    }
    return result;
  }
  executeLambda(node, env) {
    return {
      type: "lambda",
      call: (args2, callLine) => {
        const lambdaEnv = new Environment(env);
        for (let i = 0; i < node.params.length; i++) {
          lambdaEnv.define(node.params[i], args2[i] !== void 0 ? args2[i] : null);
        }
        try {
          const result = this.execute(node.body, lambdaEnv);
          return result;
        } catch (e) {
          if (e instanceof ReturnException) return e.value;
          throw e;
        }
      }
    };
  }
  executeLet(node, env) {
    const value = this.execute(node.value, env);
    env.define(node.name, value);
  }
  executeAssign(node, env) {
    const value = this.execute(node.value, env);
    env.set(node.name, value, node.line);
    return value;
  }
  executeIndexAssign(node, env) {
    const obj = this.execute(node.object, env);
    const index = this.execute(node.index, env);
    const value = this.execute(node.value, env);
    if (Array.isArray(obj)) {
      if (typeof index !== "number") {
        throw new SdevError("List index must be a number", node.line);
      }
      const idx = index < 0 ? obj.length + index : index;
      if (idx < 0 || idx >= obj.length) {
        throw new SdevError("List index out of bounds", node.line);
      }
      obj[idx] = value;
      return value;
    }
    if (obj && typeof obj === "object") {
      const key = stringify(index);
      obj[key] = value;
      return value;
    }
    throw new SdevError("Cannot assign to index of this type", node.line);
  }
  executeMemberAssign(node, env) {
    const obj = this.execute(node.object, env);
    const value = this.execute(node.value, env);
    if (!obj || typeof obj !== "object") {
      throw new SdevError(`Cannot assign property on non-object`, node.line);
    }
    obj[node.property] = value;
    return value;
  }
  executeIf(node, env) {
    const condition = this.execute(node.condition, env);
    if (isTruthy(condition)) {
      return this.execute(node.thenBranch, env);
    } else if (node.elseBranch) {
      return this.execute(node.elseBranch, env);
    }
    return null;
  }
  executeWhile(node, env) {
    let result = null;
    let iterations = 0;
    const maxIterations = 1e5;
    while (isTruthy(this.execute(node.condition, env))) {
      try {
        result = this.execute(node.body, env);
      } catch (e) {
        if (e instanceof BreakSignal) break;
        if (e instanceof ContinueSignal) {
          iterations++;
          if (iterations > maxIterations) {
            throw new SdevError("Maximum loop iterations exceeded (possible infinite loop)", node.line);
          }
          continue;
        }
        throw e;
      }
      iterations++;
      if (iterations > maxIterations) {
        throw new SdevError("Maximum loop iterations exceeded (possible infinite loop)", node.line);
      }
    }
    return result;
  }
  executeForEach(node, env) {
    const iterable = this.execute(node.iterable, env);
    if (!Array.isArray(iterable) && typeof iterable !== "string") {
      throw new SdevError("Can only iterate through lists or strings", node.line);
    }
    let result = null;
    const items = Array.isArray(iterable) ? iterable : iterable.split("");
    let iterations = 0;
    const maxIterations = 1e5;
    for (const item of items) {
      const loopEnv = new Environment(env);
      loopEnv.define(node.variable, item);
      try {
        result = this.execute(node.body, loopEnv);
      } catch (e) {
        if (e instanceof BreakSignal) break;
        if (e instanceof ContinueSignal) {
          iterations++;
          if (iterations > maxIterations) throw new SdevError("Maximum loop iterations exceeded", node.line);
          continue;
        }
        throw e;
      }
      iterations++;
      if (iterations > maxIterations) {
        throw new SdevError("Maximum loop iterations exceeded", node.line);
      }
    }
    return result;
  }
  executeForIn(node, env) {
    const iterable = this.execute(node.iterable, env);
    if (!Array.isArray(iterable) && typeof iterable !== "string") {
      throw new SdevError("Can only iterate through lists or strings with within", node.line);
    }
    let result = null;
    const items = Array.isArray(iterable) ? iterable : iterable.split("");
    let iterations = 0;
    const maxIterations = 1e5;
    for (const item of items) {
      const loopEnv = new Environment(env);
      loopEnv.define(node.variable, item);
      try {
        result = this.execute(node.body, loopEnv);
      } catch (e) {
        if (e instanceof BreakSignal) break;
        if (e instanceof ContinueSignal) {
          iterations++;
          if (iterations > maxIterations) throw new SdevError("Maximum loop iterations exceeded", node.line);
          continue;
        }
        throw e;
      }
      iterations++;
      if (iterations > maxIterations) {
        throw new SdevError("Maximum loop iterations exceeded", node.line);
      }
    }
    return result;
  }
  executeFuncDecl(node, env) {
    const func = {
      type: "user",
      call: (args2, callLine) => {
        const funcEnv = new Environment(env);
        for (let i = 0; i < node.params.length; i++) {
          funcEnv.define(node.params[i], args2[i] !== void 0 ? args2[i] : null);
        }
        try {
          this.execute(node.body, funcEnv);
          return null;
        } catch (e) {
          if (e instanceof ReturnException) {
            return e.value;
          }
          throw e;
        }
      }
    };
    env.define(node.name, func);
  }
  executeClassDecl(node, env) {
    let superClass;
    if (node.superClass) {
      const sc = env.get(node.superClass, node.line);
      if (!sc || sc.type !== "class") {
        throw new SdevError(`'${node.superClass}' is not a class`, node.line);
      }
      superClass = sc;
    }
    const methods = /* @__PURE__ */ new Map();
    for (const method of node.methods) {
      const func = {
        type: "user",
        call: (args2, callLine) => {
          const methodEnv = new Environment(env);
          for (let i = 0; i < method.params.length; i++) {
            methodEnv.define(method.params[i], args2[i] !== void 0 ? args2[i] : null);
          }
          if (superClass) {
            const superProxy = {};
            superClass.methods.forEach((superMethod, name) => {
              superProxy[name] = {
                type: "user",
                call: (superArgs, line) => {
                  return superMethod.call([args2[0], ...superArgs], line);
                }
              };
            });
            methodEnv.define("super", superProxy);
          }
          try {
            this.execute(method.body, methodEnv);
            return null;
          } catch (e) {
            if (e instanceof ReturnException) return e.value;
            throw e;
          }
        }
      };
      methods.set(method.name, func);
    }
    const klass = {
      type: "class",
      name: node.name,
      superClass,
      methods
    };
    env.define(node.name, klass);
  }
  executeReturn(node, env) {
    const value = node.value ? this.execute(node.value, env) : null;
    throw new ReturnException(value);
  }
  executeTry(node, env) {
    try {
      return this.execute(node.tryBlock, env);
    } catch (e) {
      if (e instanceof ReturnException || e instanceof BreakSignal || e instanceof ContinueSignal) {
        throw e;
      }
      const catchEnv = new Environment(env);
      let errorMsg;
      if (e instanceof SdevError) {
        errorMsg = e.message;
      } else if (e instanceof Error) {
        errorMsg = e.message;
      } else {
        errorMsg = String(e);
      }
      catchEnv.define(node.errorVar, errorMsg);
      return this.execute(node.catchBlock, catchEnv);
    }
  }
  executeBlock(node, env) {
    const blockEnv = new Environment(env);
    let result = null;
    for (const stmt of node.statements) {
      result = this.execute(stmt, blockEnv);
    }
    return result;
  }
  requireNumbers(left, right, op, line, fn) {
    if (typeof left !== "number" || typeof right !== "number") {
      throw new SdevError(`Cannot use '${op}' with non-numbers (got ${typeof left} and ${typeof right})`, line);
    }
    return fn(left, right);
  }
  isEqual(a, b) {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => this.isEqual(v, b[i]));
    }
    return a === b;
  }
};

// scripts/_compiler-entry.ts
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, extname } from "path";
import { createInterface } from "readline";
var VERSION = "4.0.0";
var SDEVC_MAGIC = "SDEVC4";
var args = process.argv.slice(2);
function help() {
  console.log(`sdev compiler & runtime v${VERSION}
  (Interpreter-first \u2014 full feature parity with the web IDE)

USAGE:
  sdev <command> [options] <file>

COMMANDS:
  run <file>                  Run any .sdev or .sdevc file (auto-detect)
  exec <file.sdev>            Alias for 'run' (kept for back-compat)
  compile <file.sdev> [-o]    Compile to .sdevc container (AST + source)
  run-bc <file.sdevc>         Execute a compiled .sdevc file (full features)
  disasm <file.sdev|.sdevc>   Best-effort bytecode disassembly (.sdevir)
  translate <file> --to <L>   Translate source to another language
  check <file.sdev>           Parse only \u2014 report syntax errors
  ast <file.sdev>             Print AST as JSON
  repl                        Interactive REPL (full interpreter)
  languages                   List supported source languages
  version                     Print version

OPTIONS:
  --lang <Name>               Source language (default: auto-detect)
  --vm                        Use stack-based VM instead of the interpreter
                              (faster, but limited feature subset)
  -o, --out <file>            Output file path
  -h, --help                  Show this help

EXAMPLES:
  sdev run hello.sdev                    # full interpreter
  sdev compile hello.sdev -o hello.sdevc # produce container
  sdev run hello.sdevc                   # runs through interpreter
  sdev run hello.sdev --vm               # opt into bytecode VM
  sdev translate hello.sdev --to Bulgarian -o hello.bg.sdev
  sdev repl
`);
}
function readFlag(name, short) {
  const i = args.findIndex((a) => a === name || short && a === short);
  if (i >= 0 && i + 1 < args.length) return args[i + 1];
  return void 0;
}
function hasFlag(name, short) {
  return args.some((a) => a === name || short && a === short);
}
if (args.length === 0 || hasFlag("--help", "-h")) {
  help();
  process.exit(0);
}
if (args[0] === "version" || hasFlag("--version", "-v")) {
  console.log(`sdev v${VERSION}`);
  process.exit(0);
}
if (args[0] === "languages") {
  console.log("Supported source languages:");
  for (const l of SUPPORTED_LANGUAGES) console.log("  -", l);
  process.exit(0);
}
var cmd = args[0];
var FLAG_NAMES = /* @__PURE__ */ new Set(["--lang", "-o", "--out", "--to"]);
var fileArg = args.find((a, i) => i > 0 && !a.startsWith("-") && !FLAG_NAMES.has(args[i - 1]));
var sourceLang = readFlag("--lang") ?? "auto";
var outPath = readFlag("-o") ?? readFlag("--out");
var useVm = hasFlag("--vm");
function abs(file) {
  const p = resolve(process.cwd(), file);
  if (!existsSync(p)) {
    console.error(`File not found: ${p}`);
    process.exit(1);
  }
  return p;
}
function loadSource(file) {
  return readFileSync(abs(file), "utf-8");
}
function parseSource(src) {
  const lex = new Lexer(src, { sourceLanguage: sourceLang });
  const tokens = lex.tokenize();
  const ast = new Parser(tokens).parse();
  return { ast, detected: lex.detectedLanguage ?? "English" };
}
function loadContainer(file) {
  const raw = readFileSync(abs(file), "utf-8");
  let c;
  try {
    c = JSON.parse(raw);
  } catch {
    console.error("Invalid .sdevc container (not JSON)");
    process.exit(1);
  }
  if (!c || c.magic !== SDEVC_MAGIC) {
    console.error(`Invalid .sdevc container (magic mismatch, got ${c?.magic ?? "?"}, expected ${SDEVC_MAGIC})`);
    process.exit(1);
  }
  return c;
}
function runWithInterpreter(ast) {
  new Interpreter((m) => console.log(m)).interpret(ast);
}
function runWithVm(ast) {
  try {
    const chunk = new Compiler().compile(ast);
    new VM((m) => console.log(m)).run(chunk);
  } catch (e) {
    console.error("[--vm] feature unsupported by bytecode VM, falling back to interpreter:");
    console.error("   ", e instanceof Error ? e.message : String(e));
    runWithInterpreter(ast);
  }
}
function execAst(ast) {
  if (useVm) runWithVm(ast);
  else runWithInterpreter(ast);
}
function reportError(e) {
  if (e instanceof SdevError) console.error("error:", e.message);
  else if (e instanceof Error) console.error("error:", e.message);
  else console.error("error:", String(e));
  process.exit(1);
}
function runFile(file) {
  if (extname(file) === ".sdevc") {
    const c = loadContainer(file);
    const { ast } = parseSource(c.source);
    execAst(ast);
  } else {
    const { ast } = parseSource(loadSource(file));
    execAst(ast);
  }
}
try {
  switch (cmd) {
    case "run":
    case "exec": {
      if (!fileArg) {
        console.error("Missing file");
        process.exit(1);
      }
      runFile(fileArg);
      break;
    }
    case "compile": {
      if (!fileArg) {
        console.error("Missing file");
        process.exit(1);
      }
      const src = loadSource(fileArg);
      const { ast, detected } = parseSource(src);
      const container = {
        magic: SDEVC_MAGIC,
        version: VERSION,
        language: detected,
        source: src,
        ast,
        compiledAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const out = outPath ?? fileArg.replace(/\.sdev$/, "") + ".sdevc";
      const json = JSON.stringify(container);
      writeFileSync(out, json);
      console.log(`compiled -> ${out} (${(json.length / 1024).toFixed(2)} KB, magic=${SDEVC_MAGIC}, lang=${detected})`);
      break;
    }
    case "run-bc": {
      if (!fileArg) {
        console.error("Missing file");
        process.exit(1);
      }
      const c = loadContainer(fileArg);
      const { ast } = parseSource(c.source);
      execAst(ast);
      break;
    }
    case "disasm": {
      if (!fileArg) {
        console.error("Missing file");
        process.exit(1);
      }
      let ast;
      if (extname(fileArg) === ".sdevc") ast = parseSource(loadContainer(fileArg).source).ast;
      else ast = parseSource(loadSource(fileArg)).ast;
      let out;
      try {
        const chunk = new Compiler().compile(ast);
        out = disassemble(chunk.entry);
      } catch (e) {
        out = `; disassembly unavailable for this program
; ${e instanceof Error ? e.message : String(e)}
`;
      }
      if (outPath) {
        writeFileSync(outPath, out);
        console.log("wrote", outPath);
      } else console.log(out);
      break;
    }
    case "translate": {
      if (!fileArg) {
        console.error("Missing file");
        process.exit(1);
      }
      const to = readFlag("--to");
      if (!to) {
        console.error("Missing --to <language>");
        process.exit(1);
      }
      const src = loadSource(fileArg);
      const from = sourceLang === "auto" ? detectLanguage(src) ?? "English" : sourceLang;
      const { translated } = translateSource(src, from, to);
      if (outPath) {
        writeFileSync(outPath, translated);
        console.log("wrote", outPath);
      } else process.stdout.write(translated);
      break;
    }
    case "check": {
      if (!fileArg) {
        console.error("Missing file");
        process.exit(1);
      }
      parseSource(loadSource(fileArg));
      console.log("OK \u2014 no syntax errors");
      break;
    }
    case "ast": {
      if (!fileArg) {
        console.error("Missing file");
        process.exit(1);
      }
      const { ast } = parseSource(loadSource(fileArg));
      const json = JSON.stringify(ast, null, 2);
      if (outPath) {
        writeFileSync(outPath, json);
        console.log("wrote", outPath);
      } else console.log(json);
      break;
    }
    case "repl": {
      console.log(`sdev REPL v${VERSION} \u2014 :q quit  :vm toggle vm  :clear reset buffer`);
      const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "sdev> " });
      let vmMode = useVm;
      let buffer = "";
      const interp = new Interpreter((m) => console.log(m));
      rl.prompt();
      rl.on("line", (line) => {
        const t = line.trim();
        if (t === ":q" || t === ":quit") {
          rl.close();
          return;
        }
        if (t === ":vm") {
          vmMode = !vmMode;
          console.log("vm mode:", vmMode);
          rl.prompt();
          return;
        }
        if (t === ":clear") {
          buffer = "";
          console.log("cleared");
          rl.prompt();
          return;
        }
        buffer += line + "\n";
        try {
          const lex = new Lexer(buffer, { sourceLanguage: sourceLang });
          const ast = new Parser(lex.tokenize()).parse();
          if (vmMode) {
            try {
              new VM((m) => console.log(m)).run(new Compiler().compile(ast));
            } catch {
              interp.interpret(ast);
            }
          } else {
            interp.interpret(ast);
          }
          buffer = "";
        } catch (e) {
          if (e instanceof SdevError) {
            console.error("error:", e.message);
            buffer = "";
          } else {
          }
        }
        rl.prompt();
      });
      rl.on("close", () => {
        console.log("bye");
        process.exit(0);
      });
      break;
    }
    default: {
      if (existsSync(resolve(process.cwd(), cmd))) {
        runFile(cmd);
      } else {
        console.error(`Unknown command: ${cmd}`);
        help();
        process.exit(1);
      }
    }
  }
} catch (e) {
  reportError(e);
}
