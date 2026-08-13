/**
 * SDEV JavaScript Interpreter
 * A complete standalone interpreter for the sdev programming language
 * Can run in Node.js or browser environments
 * 
 * Usage (Node.js): 
 *   node sdev-interpreter.js script.sdev
 * 
 * Usage (Browser):
 *   const interpreter = new SdevInterpreter();
 *   const result = interpreter.run(code);
 */

// ============= TOKENS =============
const TokenType = {
  // Literals
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  IDENTIFIER: 'IDENTIFIER',
  
  // Keywords
  FORGE: 'FORGE',
  CONJURE: 'CONJURE',
  PONDER: 'PONDER',
  OTHERWISE: 'OTHERWISE',
  CYCLE: 'CYCLE',
  YIELD: 'YIELD',
  YEET: 'YEET',
  SKIP: 'SKIP',
  YEP: 'YEP',
  NOPE: 'NOPE',
  VOID: 'VOID',
  WITHIN: 'WITHIN',
  BE: 'BE',
  SUMMON: 'SUMMON',
  ALSO: 'ALSO',
  EITHER: 'EITHER',
  ISNT: 'ISNT',
  EQUALS: 'EQUALS',
  DIFFERS: 'DIFFERS',
  ESSENCE: 'ESSENCE',
  EXTEND: 'EXTEND',
  SELF: 'SELF',
  SUPER: 'SUPER',
  NEW: 'NEW',
  ASYNC: 'ASYNC',
  AWAIT: 'AWAIT',
  SPAWN: 'SPAWN',
  ATTEMPT: 'ATTEMPT',
  RESCUE: 'RESCUE',
  JS: 'JS',
  
  // JS raw code (special token for js keyword)
  JS_CODE: 'JS_CODE',
  
  // Operators
  PLUS: 'PLUS',
  MINUS: 'MINUS',
  STAR: 'STAR',
  SLASH: 'SLASH',
  PERCENT: 'PERCENT',
  CARET: 'CARET',
  
  // Comparison
  LESS: 'LESS',
  MORE: 'MORE',
  ATMOST: 'ATMOST',
  ATLEAST: 'ATLEAST',
  
  // Delimiters
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACKET: 'LBRACKET',
  RBRACKET: 'RBRACKET',
  COMMA: 'COMMA',
  DOT: 'DOT',
  COLON: 'COLON',
  DOUBLE_COLON: 'DOUBLE_COLON',
  DOUBLE_SEMI: 'DOUBLE_SEMI',
  ARROW: 'ARROW',
  PIPE: 'PIPE',
  TILDE: 'TILDE',
  
  EOF: 'EOF'
};

const KEYWORDS = {
  'forge': TokenType.FORGE,
  'conjure': TokenType.CONJURE,
  'ponder': TokenType.PONDER,
  'otherwise': TokenType.OTHERWISE,
  'cycle': TokenType.CYCLE,
  'yield': TokenType.YIELD,
  'yeet': TokenType.YEET,
  'skip': TokenType.SKIP,
  'yep': TokenType.YEP,
  'nope': TokenType.NOPE,
  'void': TokenType.VOID,
  'within': TokenType.WITHIN,
  'be': TokenType.BE,
  'summon': TokenType.SUMMON,
  'also': TokenType.ALSO,
  'either': TokenType.EITHER,
  'isnt': TokenType.ISNT,
  'equals': TokenType.EQUALS,
  'differs': TokenType.DIFFERS,
  'essence': TokenType.ESSENCE,
  'extend': TokenType.EXTEND,
  'self': TokenType.SELF,
  'super': TokenType.SUPER,
  'new': TokenType.NEW,
  'async': TokenType.ASYNC,
  'await': TokenType.AWAIT,
  'spawn': TokenType.SPAWN,
  'attempt': TokenType.ATTEMPT,
  'rescue': TokenType.RESCUE,
  'js': TokenType.JS
};

// ============= ERRORS =============
class SdevError extends Error {
  constructor(message, line, column) {
    const location = column !== undefined 
      ? `[line ${line}, col ${column}]` 
      : `[line ${line}]`;
    super(`${location} ${message}`);
    this.name = 'SdevError';
    this.line = line;
    this.column = column;
  }
}

class ReturnException {
  constructor(value) {
    this.value = value;
  }
}

class BreakException {}
class ContinueException {}




// ─── sdev built-in translator (data extracted from translator.ts) ───
const __sdevTranslator = (function () {
  const KEYWORD_TABLES = {
  Spanish: {
    "forjar": "forge", "ser": "be", "conjurar": "conjure", "rendir": "yield",
    "ponderar": "ponder", "sino": "otherwise", "ciclo": "cycle", "iterar": "iterate",
    "través": "through", "por": "through", "dentro": "within", "lanzar": "yeet",
    "saltar": "skip", "hablar": "speak", "mostrar": "speak", "decir": "speak",
    "esencia": "essence", "extender": "extend", "propio": "self", "padre": "super",
    "nuevo": "new", "intento": "attempt", "intentar": "attempt", "rescatar": "rescue",
    "también": "also", "cualquiera": "either", "o": "either",
    "no_es": "isnt", "igual": "equals", "difiere": "differs", "sí": "yep",
    "no": "nope", "vacío": "void", "invocar": "summon", "asíncrono": "async",
    "esperar": "await", "generar": "spawn", "verdadero": "yep", "falso": "nope",
    "nulo": "void", "clase": "essence", "retornar": "yield", "devolver": "yield",
    "mientras": "cycle", "para": "iterate", "si": "ponder",
    "romper": "yeet", "continuar": "skip", "y": "also", "importar": "summon",
    "función": "conjure", "crear": "new",
  },
  French: {
    "forger": "forge", "être": "be", "est": "be", "évoquer": "conjure",
    "rendre": "yield", "retourner": "yield", "réfléchir": "ponder", "si": "ponder",
    "sinon": "otherwise", "boucle": "cycle", "tantque": "cycle", "itérer": "iterate",
    "pour": "iterate", "à_travers": "through", "dans": "within", "jeter": "yeet",
    "sauter": "skip", "parler": "speak", "dire": "speak", "afficher": "speak",
    "classe": "essence", "étendre": "extend", "soi": "self",
    "parent": "super", "nouveau": "new", "essayer": "attempt", "tenter": "attempt",
    "secourir": "rescue", "attraper": "rescue", "aussi": "also", "et": "also",
    "soit": "either", "ou": "either", "nest_pas": "isnt", "pas": "isnt",
    "égal": "equals", "diffère": "differs", "oui": "yep", "vrai": "yep",
    "non": "nope", "faux": "nope", "vide": "void", "nul": "void",
    "invoquer": "summon", "importer": "summon", "asynchrone": "async",
    "attendre": "await", "engendrer": "spawn", "fonction": "conjure", "créer": "new",
  },
  German: {
    "schmieden": "forge", "erstellen": "forge", "sein": "be", "ist": "be",
    "beschwören": "conjure", "funktion": "conjure", "ergeben": "yield",
    "zurückgeben": "yield", "überlegen": "ponder", "wenn": "ponder",
    "sonst": "otherwise", "ansonsten": "otherwise", "schleife": "cycle",
    "solange": "cycle", "iterieren": "iterate", "für": "iterate",
    "durch": "through", "innerhalb": "within",
    "werfen": "yeet", "überspringen": "skip", "sprechen": "speak",
    "sagen": "speak", "ausgeben": "speak", "zeigen": "speak",
    "wesen": "essence", "klasse": "essence", "erweitern": "extend",
    "selbst": "self", "eltern": "super", "neu": "new",
    "versuch": "attempt", "versuchen": "attempt", "retten": "rescue",
    "fangen": "rescue", "auch": "also", "und": "also", "oder": "either",
    "nicht": "isnt", "gleich": "equals", "unterscheidet": "differs",
    "ja": "yep", "wahr": "yep", "nein": "nope", "falsch": "nope",
    "leer": "void", "null": "void", "herbeirufen": "summon",
    "importieren": "summon", "asynchron": "async", "warten": "await",
    "erzeugen": "spawn",
  },
  Portuguese: {
    "forjar": "forge", "criar": "forge", "ser": "be", "é": "be",
    "conjurar": "conjure", "função": "conjure", "render": "yield",
    "retornar": "yield", "devolver": "yield", "ponderar": "ponder",
    "se": "ponder", "senão": "otherwise", "ciclo": "cycle",
    "enquanto": "cycle", "iterar": "iterate", "para": "iterate",
    "através": "through", "dentro": "within", "em": "within",
    "lançar": "yeet", "pular": "skip", "falar": "speak",
    "mostrar": "speak", "exibir": "speak", "dizer": "speak",
    "essência": "essence", "classe": "essence", "estender": "extend",
    "próprio": "self", "pai": "super", "novo": "new",
    "tentar": "attempt", "resgatar": "rescue", "capturar": "rescue",
    "também": "also", "e": "also", "ou": "either", "não_é": "isnt",
    "igual": "equals", "difere": "differs", "sim": "yep",
    "verdadeiro": "yep", "não": "nope", "falso": "nope",
    "vazio": "void", "nulo": "void", "invocar": "summon",
    "importar": "summon", "assíncrono": "async", "aguardar": "await",
    "gerar": "spawn",
  },
  Italian: {
    "forgiare": "forge", "creare": "forge", "essere": "be", "è": "be",
    "evocare": "conjure", "funzione": "conjure", "cedere": "yield",
    "restituire": "yield", "ritornare": "yield", "ponderare": "ponder",
    "se": "ponder", "altrimenti": "otherwise", "ciclo": "cycle",
    "mentre": "cycle", "iterare": "iterate", "per": "iterate",
    "attraverso": "through", "dentro": "within", "in": "within",
    "lanciare": "yeet", "saltare": "skip", "parlare": "speak",
    "mostrare": "speak", "dire": "speak", "stampare": "speak",
    "essenza": "essence", "classe": "essence", "estendere": "extend",
    "sé": "self", "genitore": "super", "nuovo": "new",
    "tentare": "attempt", "provare": "attempt", "salvare": "rescue",
    "catturare": "rescue", "anche": "also", "e": "also",
    "oppure": "either", "o": "either", "non_è": "isnt",
    "uguale": "equals", "diverso": "differs", "sì": "yep",
    "vero": "yep", "no": "nope", "falso": "nope", "vuoto": "void",
    "nullo": "void", "invocare": "summon", "importare": "summon",
    "asincrono": "async", "attendere": "await", "generare": "spawn",
  },
  Dutch: {
    "smeden": "forge", "maken": "forge", "zijn": "be", "is": "be",
    "oproepen": "conjure", "functie": "conjure", "opleveren": "yield",
    "teruggeven": "yield", "overdenken": "ponder", "als": "ponder",
    "anders": "otherwise", "lus": "cycle", "zolang": "cycle",
    "itereren": "iterate", "voor": "iterate", "door": "through",
    "binnen": "within", "in": "within", "gooien": "yeet",
    "overslaan": "skip", "spreken": "speak", "zeggen": "speak",
    "tonen": "speak", "wezen": "essence", "klasse": "essence",
    "uitbreiden": "extend", "zelf": "self", "ouder": "super",
    "nieuw": "new", "proberen": "attempt", "redden": "rescue",
    "vangen": "rescue", "ook": "also", "en": "also", "of": "either",
    "niet": "isnt", "gelijk": "equals", "verschilt": "differs",
    "ja": "yep", "waar": "yep", "nee": "nope", "onwaar": "nope",
    "leeg": "void", "nul": "void", "aanroepen": "summon",
    "importeren": "summon", "asynchroon": "async", "wachten": "await",
    "voortbrengen": "spawn",
  },
  Russian: {
    "ковать": "forge", "создать": "forge", "быть": "be", "есть": "be",
    "вызвать": "conjure", "функция": "conjure", "вернуть": "yield",
    "обдумать": "ponder", "если": "ponder", "иначе": "otherwise",
    "цикл": "cycle", "пока": "cycle", "перебрать": "iterate",
    "для": "iterate", "через": "through", "внутри": "within",
    "в": "within", "бросить": "yeet", "пропустить": "skip",
    "сказать": "speak", "говорить": "speak", "показать": "speak",
    "вывести": "speak", "печать": "speak",
    "сущность": "essence", "класс": "essence", "расширить": "extend",
    "себя": "self", "предок": "super", "родитель": "super",
    "новый": "new", "попытка": "attempt", "попробовать": "attempt",
    "спасти": "rescue", "поймать": "rescue", "также": "also",
    "и": "also", "или": "either", "не": "isnt",
    "равно": "equals", "отличается": "differs", "да": "yep",
    "истина": "yep", "нет": "nope", "ложь": "nope",
    "пусто": "void", "ничто": "void", "призвать": "summon",
    "импорт": "summon", "асинхронный": "async", "ждать": "await",
    "породить": "spawn",
  },
  Chinese: {
    "铸造": "forge", "创建": "forge", "是": "be", "赋值": "be",
    "召唤": "conjure", "函数": "conjure", "产出": "yield",
    "返回": "yield", "思考": "ponder", "如果": "ponder",
    "否则": "otherwise", "循环": "cycle", "当": "cycle",
    "遍历": "iterate", "为": "iterate", "通过": "through",
    "在内": "within", "在": "within", "抛出": "yeet",
    "跳过": "skip", "说": "speak", "输出": "speak",
    "打印": "speak", "显示": "speak",
    "本质": "essence", "类": "essence", "扩展": "extend",
    "自己": "self", "父类": "super", "新": "new",
    "尝试": "attempt", "拯救": "rescue", "捕获": "rescue",
    "并且": "also", "和": "also", "或者": "either", "或": "either",
    "不是": "isnt", "等于": "equals", "不同": "differs",
    "是的": "yep", "真": "yep", "不": "nope", "假": "nope",
    "空": "void", "无": "void", "导入": "summon",
    "异步": "async", "等待": "await", "生成": "spawn",
  },
  Japanese: {
    "鍛造": "forge", "作成": "forge", "である": "be", "は": "be",
    "召喚": "conjure", "関数": "conjure", "返す": "yield",
    "考える": "ponder", "もし": "ponder", "それ以外": "otherwise",
    "ループ": "cycle", "間": "cycle", "反復": "iterate",
    "繰り返す": "iterate", "通して": "through", "の中で": "within",
    "投げる": "yeet", "スキップ": "skip", "言う": "speak",
    "表示": "speak", "出力": "speak", "印刷": "speak",
    "本質": "essence", "クラス": "essence", "拡張": "extend",
    "自分": "self", "親": "super", "新しい": "new",
    "試す": "attempt", "救出": "rescue", "また": "also",
    "かつ": "also", "または": "either", "ではない": "isnt",
    "等しい": "equals", "異なる": "differs", "はい": "yep",
    "真": "yep", "いいえ": "nope", "偽": "nope",
    "空": "void", "インポート": "summon", "非同期": "async",
    "待つ": "await", "生成": "spawn",
  },
  Korean: {
    "단조": "forge", "만들다": "forge", "이다": "be",
    "소환": "conjure", "함수": "conjure", "반환": "yield",
    "돌려주다": "yield", "생각": "ponder", "만약": "ponder",
    "아니면": "otherwise", "순환": "cycle", "동안": "cycle",
    "반복": "iterate", "위해": "iterate", "통해": "through",
    "안에서": "within", "던지다": "yeet", "건너뛰기": "skip",
    "말하다": "speak", "출력": "speak", "보여주다": "speak",
    "본질": "essence", "클래스": "essence", "확장": "extend",
    "자신": "self", "부모": "super", "새": "new", "새로운": "new",
    "시도": "attempt", "구출": "rescue", "그리고": "also",
    "또는": "either", "아니다": "isnt", "같다": "equals",
    "다르다": "differs", "예": "yep", "참": "yep",
    "아니오": "nope", "거짓": "nope", "비어있다": "void",
    "가져오기": "summon", "비동기": "async", "기다리다": "await",
    "생성": "spawn",
  },
  Arabic: {
    "صنع": "forge", "إنشاء": "forge", "يكون": "be", "هو": "be",
    "استدعاء": "conjure", "دالة": "conjure", "إرجاع": "yield",
    "رد": "yield", "تأمل": "ponder", "إذا": "ponder",
    "وإلا": "otherwise", "خلاف": "otherwise", "حلقة": "cycle",
    "طالما": "cycle", "تكرار": "iterate", "لكل": "iterate",
    "عبر": "through", "خلال": "through", "داخل": "within",
    "في": "within", "رمي": "yeet", "تخطي": "skip",
    "قل": "speak", "تحدث": "speak", "اطبع": "speak", "اعرض": "speak",
    "جوهر": "essence", "فئة": "essence", "صنف": "essence",
    "توسيع": "extend", "ذات": "self", "نفس": "self",
    "أب": "super", "جديد": "new", "محاولة": "attempt",
    "حاول": "attempt", "إنقاذ": "rescue", "التقاط": "rescue",
    "أيضا": "also", "و": "also", "أو": "either",
    "ليس": "isnt", "يساوي": "equals", "يختلف": "differs",
    "نعم": "yep", "صحيح": "yep", "لا": "nope", "خطأ": "nope",
    "فارغ": "void", "عدم": "void", "استيراد": "summon",
    "غير_متزامن": "async", "انتظار": "await", "توليد": "spawn",
  },
  Hindi: {
    "गढ़ना": "forge", "बनाना": "forge", "होना": "be", "है": "be",
    "बुलाना": "conjure", "फलन": "conjure", "कार्य": "conjure",
    "लौटाना": "yield", "वापसी": "yield", "सोचना": "ponder",
    "अगर": "ponder", "यदि": "ponder", "वरना": "otherwise",
    "अन्यथा": "otherwise", "चक्र": "cycle", "जबतक": "cycle",
    "दोहराना": "iterate", "हेतु": "iterate", "द्वारा": "through",
    "अंदर": "within", "में": "within", "फेंकना": "yeet",
    "छोड़ना": "skip", "बोलना": "speak", "दिखाना": "speak",
    "छापना": "speak", "सार": "essence", "वर्ग": "essence",
    "विस्तार": "extend", "स्वयं": "self", "अभिभावक": "super",
    "नया": "new", "प्रयास": "attempt", "कोशिश": "attempt",
    "बचाना": "rescue", "पकड़ना": "rescue", "भी": "also",
    "और": "also", "या": "either", "नहीं": "isnt",
    "बराबर": "equals", "भिन्न": "differs", "हां": "yep",
    "सत्य": "yep", "असत्य": "nope",
    "रिक्त": "void", "शून्य": "void", "आयात": "summon",
    "असमकालिक": "async", "प्रतीक्षा": "await", "उत्पन्न": "spawn",
  },
  Turkish: {
    "dövmek": "forge", "oluştur": "forge", "olmak": "be", "olsun": "be",
    "çağır": "conjure", "fonksiyon": "conjure", "işlev": "conjure",
    "döndür": "yield", "ver": "yield", "düşün": "ponder",
    "eğer": "ponder", "yoksa": "otherwise", "değilse": "otherwise",
    "döngü": "cycle", "iken": "cycle", "tekrarla": "iterate",
    "için": "iterate", "boyunca": "through", "içinde": "within",
    "at": "yeet", "atla": "skip", "söyle": "speak", "göster": "speak",
    "yazdır": "speak", "öz": "essence", "sınıf": "essence",
    "genişlet": "extend", "kendi": "self", "üst": "super",
    "yeni": "new", "dene": "attempt", "kurtar": "rescue",
    "yakala": "rescue", "da": "also", "ve": "also", "veya": "either",
    "değil": "isnt", "eşit": "equals", "farklı": "differs",
    "evet": "yep", "doğru": "yep", "hayır": "nope", "yanlış": "nope",
    "boş": "void", "çağırmak": "summon", "içeaktar": "summon",
    "eşzamansız": "async", "bekle": "await", "üret": "spawn",
  },
  Polish: {
    "kuć": "forge", "utwórz": "forge", "być": "be", "jest": "be",
    "przywołaj": "summon", "funkcja": "conjure", "zwróć": "yield",
    "oddaj": "yield", "rozważ": "ponder", "jeśli": "ponder",
    "jeżeli": "ponder", "inaczej": "otherwise", "pętla": "cycle",
    "dopóki": "cycle", "iteruj": "iterate", "dla": "iterate",
    "przez": "through", "wewnątrz": "within", "w": "within",
    "rzuć": "yeet", "pomiń": "skip", "mów": "speak",
    "powiedz": "speak", "pokaż": "speak", "wypisz": "speak",
    "istota": "essence", "klasa": "essence", "rozszerz": "extend",
    "sam": "self", "rodzic": "super", "nowy": "new", "nowe": "new",
    "próbuj": "attempt", "spróbuj": "attempt", "ratuj": "rescue",
    "złap": "rescue", "też": "also", "i": "also", "lub": "either",
    "albo": "either", "nie": "isnt", "równe": "equals",
    "różni": "differs", "tak": "yep", "prawda": "yep",
    "fałsz": "nope", "pusty": "void",
    "importuj": "summon", "asynchroniczny": "async",
    "czekaj": "await", "stwórz": "spawn",
  },
  Swedish: {
    "smida": "forge", "skapa": "forge", "vara": "be", "är": "be",
    "framkalla": "conjure", "funktion": "conjure", "ge": "yield",
    "returnera": "yield", "fundera": "ponder", "om": "ponder",
    "annars": "otherwise", "slinga": "cycle", "medan": "cycle",
    "iterera": "iterate", "för": "iterate", "genom": "through",
    "inom": "within", "i": "within", "kasta": "yeet",
    "hoppa": "skip", "tala": "speak", "visa": "speak",
    "skriv": "speak", "väsen": "essence", "klass": "essence",
    "utöka": "extend", "själv": "self", "förälder": "super",
    "ny": "new", "försök": "attempt", "rädda": "rescue",
    "fånga": "rescue", "också": "also", "och": "also",
    "eller": "either", "inte": "isnt", "lika": "equals",
    "skiljer": "differs", "ja": "yep", "sant": "yep",
    "nej": "nope", "falskt": "nope", "tom": "void",
    "åkalla": "summon", "importera": "summon", "asynkron": "async",
    "vänta": "await", "skapa_process": "spawn",
  },
  Norwegian: {
    "smi": "forge", "lage": "forge", "være": "be", "er": "be",
    "fremkalle": "conjure", "funksjon": "conjure", "gi": "yield",
    "returnere": "yield", "tenke": "ponder", "hvis": "ponder",
    "ellers": "otherwise", "sløyfe": "cycle", "mens": "cycle",
    "iterere": "iterate", "for": "iterate", "gjennom": "through",
    "innen": "within", "i": "within", "kaste": "yeet",
    "hoppe": "skip", "snakke": "speak", "vise": "speak",
    "skriv": "speak", "vesen": "essence", "klasse": "essence",
    "utvide": "extend", "selv": "self", "forelder": "super",
    "ny": "new", "forsøk": "attempt", "redde": "rescue",
    "fange": "rescue", "også": "also", "og": "also",
    "eller": "either", "ikke": "isnt", "lik": "equals",
    "forskjellig": "differs", "ja": "yep", "sant": "yep",
    "nei": "nope", "usant": "nope", "tom": "void",
    "påkalle": "summon", "importere": "summon", "asynkron": "async",
    "vente": "await", "starte": "spawn",
  },
  Danish: {
    "smede": "forge", "skabe": "forge", "være": "be", "er": "be",
    "fremkalde": "conjure", "funktion": "conjure", "give": "yield",
    "returnere": "yield", "overveje": "ponder", "hvis": "ponder",
    "ellers": "otherwise", "sløjfe": "cycle", "mens": "cycle",
    "iterere": "iterate", "for": "iterate", "igennem": "through",
    "inden": "within", "i": "within", "kaste": "yeet",
    "springe": "skip", "tale": "speak", "vise": "speak",
    "skriv": "speak", "væsen": "essence", "klasse": "essence",
    "udvide": "extend", "selv": "self", "forælder": "super",
    "ny": "new", "forsøg": "attempt", "redde": "rescue",
    "fange": "rescue", "også": "also", "og": "also",
    "eller": "either", "ikke": "isnt", "lig": "equals",
    "anderledes": "differs", "ja": "yep", "sand": "yep",
    "nej": "nope", "falsk": "nope", "tom": "void",
    "påkalde": "summon", "importere": "summon", "asynkron": "async",
    "vente": "await", "starte": "spawn",
  },
  Finnish: {
    "takoa": "forge", "luoda": "forge", "olla": "be", "on": "be",
    "loitsia": "conjure", "funktio": "conjure", "tuottaa": "yield",
    "palauttaa": "yield", "pohtia": "ponder", "jos": "ponder",
    "muuten": "otherwise", "silmukka": "cycle", "kun": "cycle",
    "iteroida": "iterate", "jokaiselle": "iterate", "läpi": "through",
    "sisällä": "within", "kohdassa": "within", "heittää": "yeet",
    "ohittaa": "skip", "puhua": "speak", "näyttää": "speak",
    "tulostaa": "speak", "olemus": "essence", "luokka": "essence",
    "laajentaa": "extend", "itse": "self", "ylempi": "super",
    "uusi": "new", "yritä": "attempt", "pelasta": "rescue",
    "kiinni": "rescue", "myös": "also", "ja": "also",
    "tai": "either", "ei": "isnt", "yhtäsuuri": "equals",
    "eroaa": "differs", "kyllä": "yep", "tosi": "yep",
    "epätosi": "nope", "tyhjä": "void",
    "kutsu": "summon", "tuo": "summon", "asynkroninen": "async",
    "odota": "await", "synnytä": "spawn",
  },
  Greek: {
    "σφυρηλατώ": "forge", "δημιουργώ": "forge", "είναι": "be",
    "καλώ": "conjure", "συνάρτηση": "conjure", "επιστρέφω": "yield",
    "σκέφτομαι": "ponder", "αν": "ponder", "αλλιώς": "otherwise",
    "βρόχος": "cycle", "όσο": "cycle", "επαναλαμβάνω": "iterate",
    "για": "iterate", "μέσω": "through", "μέσα": "within",
    "σε": "within", "πετάω": "yeet", "παρακάμπτω": "skip",
    "μιλάω": "speak", "εμφάνισε": "speak", "τύπωσε": "speak",
    "ουσία": "essence", "κλάση": "essence", "επεκτείνω": "extend",
    "εαυτός": "self", "γονέας": "super", "νέο": "new",
    "δοκιμή": "attempt", "σώζω": "rescue", "πιάνω": "rescue",
    "επίσης": "also", "και": "also", "ή": "either",
    "δεν": "isnt", "ίσο": "equals", "διαφέρει": "differs",
    "ναι": "yep", "αληθές": "yep", "όχι": "nope",
    "ψευδές": "nope", "κενό": "void", "εισαγωγή": "summon",
    "ασύγχρονο": "async", "περιμένω": "await", "παράγω": "spawn",
  },
  Hebrew: {
    "לחשל": "forge", "ליצור": "forge", "להיות": "be", "הוא": "be",
    "לזמן": "conjure", "פונקציה": "conjure", "להחזיר": "yield",
    "לחשוב": "ponder", "אם": "ponder", "אחרת": "otherwise",
    "לולאה": "cycle", "כלעוד": "cycle", "לחזור": "iterate",
    "לכל": "iterate", "דרך": "through", "בתוך": "within",
    "לזרוק": "yeet", "לדלג": "skip", "לדבר": "speak",
    "להציג": "speak", "להדפיס": "speak", "מהות": "essence",
    "מחלקה": "essence", "להרחיב": "extend", "עצמי": "self",
    "הורה": "super", "חדש": "new", "לנסות": "attempt",
    "להציל": "rescue", "לתפוס": "rescue", "גם": "also",
    "ו": "also", "או": "either", "לא": "isnt",
    "שווה": "equals", "שונה": "differs", "כן": "yep",
    "אמת": "yep", "שקר": "nope",
    "ריק": "void", "לייבא": "summon", "אסינכרוני": "async",
    "לחכות": "await", "להוליד": "spawn",
  },
  Ukrainian: {
    "кувати": "forge", "створити": "forge", "бути": "be", "є": "be",
    "викликати": "conjure", "функція": "conjure", "повернути": "yield",
    "обміркувати": "ponder", "якщо": "ponder", "інакше": "otherwise",
    "цикл": "cycle", "поки": "cycle", "перебрати": "iterate",
    "для": "iterate", "через": "through", "всередині": "within",
    "в": "within", "кинути": "yeet", "пропустити": "skip",
    "сказати": "speak", "показати": "speak", "вивести": "speak",
    "сутність": "essence", "клас": "essence", "розширити": "extend",
    "себе": "self", "батько": "super", "новий": "new",
    "спроба": "attempt", "спробувати": "attempt", "врятувати": "rescue",
    "зловити": "rescue", "також": "also", "і": "also",
    "або": "either", "не": "isnt", "дорівнює": "equals",
    "відрізняється": "differs", "так": "yep", "істина": "yep",
    "ні": "nope", "хиба": "nope", "порожньо": "void",
    "призвати": "summon", "імпорт": "summon", "асинхронний": "async",
    "чекати": "await", "породити": "spawn",
  },
  Czech: {
    "kovat": "forge", "vytvořit": "forge", "být": "be", "je": "be",
    "vyvolat": "conjure", "funkce": "conjure", "vrátit": "yield",
    "uvážit": "ponder", "pokud": "ponder", "jinak": "otherwise",
    "smyčka": "cycle", "dokud": "cycle", "iterovat": "iterate",
    "pro": "iterate", "skrz": "through", "uvnitř": "within",
    "v": "within", "hodit": "yeet", "přeskočit": "skip",
    "říci": "speak", "zobrazit": "speak", "vytisknout": "speak",
    "podstata": "essence", "třída": "essence", "rozšířit": "extend",
    "sám": "self", "rodič": "super", "nový": "new",
    "zkusit": "attempt", "zachránit": "rescue", "chytit": "rescue",
    "také": "also", "a": "also", "nebo": "either",
    "není": "isnt", "rovná": "equals", "liší": "differs",
    "ano": "yep", "pravda": "yep", "ne": "nope",
    "nepravda": "nope", "prázdný": "void", "importovat": "summon",
    "asynchronní": "async", "čekat": "await", "vytvořit_proces": "spawn",
  },
  Romanian: {
    "forja": "forge", "crea": "forge", "fi": "be", "este": "be",
    "evoca": "conjure", "funcție": "conjure", "funcția": "conjure",
    "întoarce": "yield", "returna": "yield", "gândi": "ponder",
    "dacă": "ponder", "altfel": "otherwise", "buclă": "cycle",
    "câttimp": "cycle", "itera": "iterate", "pentru": "iterate",
    "prin": "through", "în_interior": "within", "în": "within",
    "arunca": "yeet", "sări": "skip", "spune": "speak",
    "arată": "speak", "afișează": "speak", "esență": "essence",
    "clasă": "essence", "extinde": "extend", "sine": "self",
    "părinte": "super", "nou": "new", "încearcă": "attempt",
    "salvează": "rescue", "prinde": "rescue", "de_asemenea": "also",
    "și": "also", "sau": "either", "nu_este": "isnt",
    "egal": "equals", "diferă": "differs", "da": "yep",
    "adevărat": "yep", "nu": "nope", "fals": "nope",
    "gol": "void", "importa": "summon", "asincron": "async",
    "așteaptă": "await", "genera": "spawn",
  },
  Hungarian: {
    "kovácsol": "forge", "létrehoz": "forge", "lenni": "be", "legyen": "be",
    "idéz": "conjure", "függvény": "conjure", "visszaad": "yield",
    "fontol": "ponder", "ha": "ponder", "különben": "otherwise",
    "ciklus": "cycle", "amíg": "cycle", "iterál": "iterate",
    "minden": "iterate", "keresztül": "through", "belül": "within",
    "ban": "within", "dob": "yeet", "átugor": "skip",
    "mond": "speak", "mutat": "speak", "kiír": "speak",
    "lényeg": "essence", "osztály": "essence", "bővít": "extend",
    "maga": "self", "szülő": "super", "új": "new",
    "próba": "attempt", "megpróbál": "attempt", "ment": "rescue",
    "elkap": "rescue", "is": "also", "és": "also",
    "vagy": "either", "nem": "isnt", "egyenlő": "equals",
    "különbözik": "differs", "igen": "yep", "igaz": "yep",
    "hamis": "nope", "üres": "void",
    "behív": "summon", "importál": "summon", "aszinkron": "async",
    "vár": "await", "indít": "spawn",
  },
  Bulgarian: {
    // forge — create / declare a variable. Accept many natural verbs.
    "изкова": "forge", "изковай": "forge", "създай": "forge", "създам": "forge",
    "създавам": "forge", "създаване": "forge", "направи": "forge", "направя": "forge",
    "правя": "forge", "нека": "forge", "дефинирай": "forge", "дефиниция": "forge",
    "обяви": "forge", "обявявам": "forge", "приеми": "forge", "вземи": "forge",
    "имаме": "forge", "имам": "forge",
    // be — assignment / equality binding
    "бъде": "be", "да_бъде": "be", "бъда": "be", "е": "be", "да_е": "be",
    "са": "be", "става": "be", "да_стане": "be", "стане": "be",
    "равняване": "be", "присвой": "be", "присвоявам": "be",
    "със_стойност": "be",
    // conjure — function / method definition
    "извикай": "conjure", "извикване": "conjure", "функция": "conjure",
    "метод": "conjure", "процедура": "conjure",
    "конструирай": "conjure",
    // yield — return value
    "върни": "yield", "връщам": "yield", "връщай": "yield",
    "отговори": "yield", "дай": "yield",
    // ponder — if / conditional
    "обмисли": "ponder", "ако": "ponder", "когато": "ponder", "в_случай": "ponder",
    "при_условие": "ponder", "провери": "ponder",
    // otherwise — else
    "иначе": "otherwise", "в_противен_случай": "otherwise", "иначе_ако": "otherwise",
    "обратно": "otherwise", "ако_не": "otherwise",
    // cycle — while loop
    "цикъл": "cycle", "докато": "cycle", "повтаряй": "cycle", "повтори": "cycle",
    "продължавай": "cycle", "върти": "cycle", "върти_се": "cycle",
    // iterate — for loop
    "обходи": "iterate", "обхождай": "iterate", "за_всеки": "iterate", "за": "iterate",
    "всеки": "iterate", "итерирай": "iterate", "минавай_през": "iterate",
    // through — over a collection
    "през": "through", "по": "through", "над": "through",
    // within — in / inside
    "вътре": "within", "вътре_в": "within", "в": "within", "сред": "within",
    // yeet — throw / break
    "хвърли": "yeet", "хвърлям": "yeet", "счупи": "yeet", "прекъсни": "yeet",
    "спри": "yeet", "излез": "yeet", "край": "yeet",
    // skip — continue
    "прескочи": "skip", "пропусни": "skip", "продължи": "skip", "следващ": "skip",
    // speak — print / output
    "кажи": "speak", "казвай": "speak", "изкрещи": "speak", "покажи": "speak",
    "показвай": "speak", "изведи": "speak", "извеждай": "speak",
    "отпечатай": "speak", "печатай": "speak", "изпиши": "speak", "пиши": "speak",
    "напиши": "speak", "принтирай": "speak", "принт": "speak",
    "логни": "speak", "съобщи": "speak",
    // essence — class
    "същност": "essence", "клас": "essence",
    "структура": "essence",
    // extend — inherit
    "разшири": "extend", "разширяване": "extend", "наследи": "extend",
    "наследяване": "extend", "произлиза": "extend",
    // self / super
    "себе_си": "self", "себе": "self", "този": "self", "тази": "self",
    "родител": "super", "родителят": "super", "наследник": "super", "баща": "super",
    // new — instantiate
    "нов": "new", "ново": "new", "нова": "new", "създай_нов": "new", "инстанция": "new",
    // attempt / rescue
    "опитай": "attempt", "опитвай": "attempt", "пробвай": "attempt",
    "опит_за": "attempt",
    "спаси": "rescue", "хвани": "rescue", "прихвани": "rescue",
    "при_грешка": "rescue", "ако_грешка": "rescue", "улови": "rescue",
    // logical
    "също": "also", "и": "also", "както_и": "also",
    "или": "either", "било_то": "either",
    "не_е": "isnt", "не": "isnt",
    "равно": "equals", "равно_на": "equals", "еднакво": "equals", "същото": "equals",
    "различно": "differs", "различно_от": "differs", "не_равно": "differs",
    // booleans
    "да": "yep", "вярно": "yep", "истина": "yep", "истинно": "yep", "истинско": "yep",
    "невярно": "nope", "лъжа": "nope", "грешно": "nope", "неистина": "nope",
    // void / null
    "празно": "void", "нищо": "void", "нула": "void", "нулева": "void", "липсва": "void",
    // summon — import
    "призови": "summon", "импортирай": "summon", "внеси": "summon", "вкарай": "summon",
    "включи": "summon", "зареди": "summon", "използвай": "summon",
    // async / await / spawn
    "асинхронен": "async", "асинхронно": "async", "паралелно": "async",
    "изчакай": "await", "чакай": "await", "почакай": "await",
    "породи": "spawn", "стартирай": "spawn", "пусни": "spawn", "изпълни": "spawn",
  },
};
  const SUPPORTED_LANGUAGES = Object.keys(KEYWORD_TABLES);

  const PHRASE_NORMALIZATIONS = {};
  function buildPhraseNormalizations(lang) {
    if (PHRASE_NORMALIZATIONS[lang]) return PHRASE_NORMALIZATIONS[lang];
    const table = KEYWORD_TABLES[lang];
    if (!table) return (PHRASE_NORMALIZATIONS[lang] = []);
    const phrases = Object.keys(table).filter(k => k.includes('_'));
    const result = phrases.map(p => {
      const spaced = p.replace(/_/g, '\\s+');
      return [new RegExp('(^|[^\\p{L}\\p{N}_])' + spaced + '(?=$|[^\\p{L}\\p{N}_])', 'gu'), '$1' + p];
    });
    PHRASE_NORMALIZATIONS[lang] = result;
    return result;
  }

  const COMPILED_REPLACERS = {};
  function compileReplacer(lang) {
    if (COMPILED_REPLACERS[lang]) return COMPILED_REPLACERS[lang];
    const table = KEYWORD_TABLES[lang];
    if (!table) return (COMPILED_REPLACERS[lang] = (s) => s);
    const entries = Object.entries(table).sort((a, b) => b[0].length - a[0].length);
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = entries.map(([k]) => escape(k)).join('|');
    if (!pattern) return (COMPILED_REPLACERS[lang] = (s) => s);
    const re = new RegExp('(^|[^\\p{L}\\p{N}_])(' + pattern + ')(?=$|[^\\p{L}\\p{N}_])', 'gu');
    const map = new Map(entries);
    const fn = (src) => src.replace(re, (_m, pre, word) => pre + (map.get(word) || word));
    COMPILED_REPLACERS[lang] = fn;
    return fn;
  }

  function segmentSource(source) {
    const segs = [];
    let i = 0, buf = '';
    const flush = (code) => { if (buf) { segs.push({ code, text: buf }); buf = ''; } };
    while (i < source.length) {
      const c = source[i];
      if ((c === '/' && source[i + 1] === '/') || c === '#') {
        flush(true);
        const end = source.indexOf('\n', i);
        const stop = end === -1 ? source.length : end;
        segs.push({ code: false, text: source.slice(i, stop) });
        i = stop; continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        flush(true);
        const quote = c;
        let j = i + 1;
        while (j < source.length) {
          if (source[j] === '\\') { j += 2; continue; }
          if (source[j] === quote) { j++; break; }
          j++;
        }
        segs.push({ code: false, text: source.slice(i, j) });
        i = j; continue;
      }
      buf += c; i++;
    }
    flush(true);
    return segs;
  }

  function hasNonAscii(code) { return /[^\x00-\x7F]/.test(code); }

  function detectLanguage(source) {
    const englishHits = (source.match(/\b(forge|be|conjure|ponder|cycle|speak|yield)\b/g) || []).length;
    let bestLang = null, bestScore = 0;
    for (const lang of SUPPORTED_LANGUAGES) {
      const table = KEYWORD_TABLES[lang];
      let score = 0;
      for (const word of Object.keys(table)) {
        if (source.includes(word)) score++;
      }
      if (score > bestScore) { bestScore = score; bestLang = lang; }
    }
    if (bestScore >= 2 && bestScore > englishHits) return bestLang;
    return null;
  }

  function translateSource(source, sourceLanguage = 'auto') {
    if (!source) return { translated: source, detectedLanguage: null };
    let lang = sourceLanguage;
    if (lang === 'English') return { translated: source, detectedLanguage: 'English' };
    if (!lang || lang === 'auto') {
      if (!hasNonAscii(source)) {
        const detected = detectLanguage(source);
        if (!detected) return { translated: source, detectedLanguage: null };
        lang = detected;
      } else {
        lang = detectLanguage(source);
        if (!lang) return { translated: source, detectedLanguage: null };
      }
    }
    if (!KEYWORD_TABLES[lang]) return { translated: source, detectedLanguage: null };
    const replace = compileReplacer(lang);
    const phraseNorms = buildPhraseNormalizations(lang);
    const segments = segmentSource(source);
    const translated = segments.map(seg => {
      if (!seg.code) return seg.text;
      let t = seg.text;
      for (const [re, repl] of phraseNorms) t = t.replace(re, repl);
      return replace(t);
    }).join('');
    return { translated, detectedLanguage: lang };
  }

  return { translateSource, detectLanguage, hasNonAscii, SUPPORTED_LANGUAGES, KEYWORD_TABLES };
})();

// ============= LEXER =============
class Lexer {
  constructor(source, options) {
    options = options || {};
    const sourceLanguage = options.sourceLanguage === undefined ? 'auto' : options.sourceLanguage;
    const doTranslate = options.translate !== false;
    if (doTranslate && sourceLanguage !== 'English' && sourceLanguage !== null && typeof __sdevTranslator !== 'undefined') {
      const r = __sdevTranslator.translateSource(source, sourceLanguage);
      this.source = r.translated;
      this.detectedLanguage = r.detectedLanguage;
    } else {
      this.source = source;
      this.detectedLanguage = null;
    }
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  tokenize() {
    while (!this.isAtEnd()) {
      this.scanToken();
    }
    this.tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.column });
    return this.tokens;
  }

  scanToken() {
    this.skipWhitespace();
    if (this.isAtEnd()) return;

    const startColumn = this.column;
    const char = this.advance();

    const singleTokens = {
      '(': TokenType.LPAREN,
      ')': TokenType.RPAREN,
      '[': TokenType.LBRACKET,
      ']': TokenType.RBRACKET,
      ',': TokenType.COMMA,
      '.': TokenType.DOT,
      '+': TokenType.PLUS,
      '*': TokenType.STAR,
      '%': TokenType.PERCENT,
      '^': TokenType.CARET,
      '~': TokenType.TILDE
    };

    if (singleTokens[char]) {
      this.addToken(singleTokens[char], char, startColumn);
      return;
    }

    if (char === '-') {
      if (this.peek() === '>') {
        this.advance();
        this.addToken(TokenType.ARROW, '->', startColumn);
      } else {
        this.addToken(TokenType.MINUS, char, startColumn);
      }
      return;
    }

    if (char === '|') {
      if (this.peek() === '>') {
        this.advance();
        this.addToken(TokenType.PIPE, '|>', startColumn);
      } else {
        throw new SdevError(`Unexpected character: '${char}'`, this.line, startColumn);
      }
      return;
    }

    if (char === ':') {
      if (this.peek() === ':') {
        this.advance();
        this.addToken(TokenType.DOUBLE_COLON, '::', startColumn);
      } else {
        this.addToken(TokenType.COLON, ':', startColumn);
      }
      return;
    }

    if (char === ';') {
      if (this.peek() === ';') {
        this.advance();
        this.addToken(TokenType.DOUBLE_SEMI, ';;', startColumn);
      }
      return;
    }

    if (char === '/') {
      if (this.peek() === '/') {
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance();
        }
        return;
      }
      this.addToken(TokenType.SLASH, char, startColumn);
      return;
    }

    if (char === '<') {
      if (this.peek() === '>') {
        this.advance();
        this.addToken(TokenType.DIFFERS, '<>', startColumn);
      } else if (this.peek() === '=') {
        this.advance();
        this.addToken(TokenType.ATMOST, '<=', startColumn);
      } else {
        this.addToken(TokenType.LESS, '<', startColumn);
      }
      return;
    }

    if (char === '>') {
      if (this.peek() === '=') {
        this.advance();
        this.addToken(TokenType.ATLEAST, '>=', startColumn);
      } else {
        this.addToken(TokenType.MORE, '>', startColumn);
      }
      return;
    }

    if (char === '"' || char === "'" || char === '`') {
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
    let value = '';
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\n') {
        if (quote === '`') {
          value += this.advance();
          this.line++;
          this.column = 1;
          continue;
        }
        throw new SdevError('Unterminated string', this.line, startColumn);
      }
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        const escapes = { 'n': '\n', 't': '\t', 'r': '\r', '\\': '\\', '"': '"', "'": "'", '`': '`' };
        value += escapes[escaped] ?? escaped;
      } else {
        value += this.advance();
      }
    }
    if (this.isAtEnd()) {
      throw new SdevError('Unterminated string', this.line, startColumn);
    }
    this.advance();
    this.addToken(TokenType.STRING, value, startColumn);
  }

  scanNumber(first, startColumn) {
    let value = first;
    while (this.isDigit(this.peek())) {
      value += this.advance();
    }
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance();
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }
    this.addToken(TokenType.NUMBER, value, startColumn);
  }

  scanIdentifier(first, startColumn) {
    let value = first;
    while (this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }
    const type = KEYWORDS[value] ?? TokenType.IDENTIFIER;
    this.addToken(type, value, startColumn);
    
    // Special handling for 'js' keyword - capture rest of line as JS code
    if (type === TokenType.JS) {
      this.scanJsCode();
    }
  }

  scanJsCode() {
    // Skip whitespace (but not newline)
    while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t')) {
      this.advance();
    }
    
    const startColumn = this.column;
    let code = '';
    
    // Check if this is a block form: js { ... } or js ( ... )
    const startChar = this.peek();
    
    if (startChar === '{') {
      // Multi-line block form: js { ... }
      this.advance(); // consume '{'
      let braceCount = 1;
      
      while (!this.isAtEnd() && braceCount > 0) {
        const char = this.peek();
        
        if (char === '{') {
          braceCount++;
          code += this.advance();
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            this.advance(); // consume final '}'
            break;
          }
          code += this.advance();
        } else if (char === '\n') {
          code += this.advance();
          this.line++;
          this.column = 1;
        } else if (char === '"' || char === "'" || char === '`') {
          // Handle strings to avoid counting braces inside them
          const quote = char;
          code += this.advance();
          while (!this.isAtEnd() && this.peek() !== quote) {
            if (this.peek() === '\\' && !this.isAtEnd()) {
              code += this.advance(); // escape char
            }
            if (this.peek() === '\n') {
              this.line++;
              this.column = 0;
            }
            code += this.advance();
          }
          if (!this.isAtEnd()) {
            code += this.advance(); // closing quote
          }
        } else {
          code += this.advance();
        }
      }
      
      if (braceCount > 0) {
        throw new SdevError('Unterminated js block, missing }', this.line, startColumn);
      }
    } else if (startChar === '(') {
      // Parenthesized form: js ( ... ) - can span multiple lines
      this.advance(); // consume '('
      let parenCount = 1;
      
      while (!this.isAtEnd() && parenCount > 0) {
        const char = this.peek();
        
        if (char === '(') {
          parenCount++;
          code += this.advance();
        } else if (char === ')') {
          parenCount--;
          if (parenCount === 0) {
            this.advance(); // consume final ')'
            break;
          }
          code += this.advance();
        } else if (char === '\n') {
          code += this.advance();
          this.line++;
          this.column = 1;
        } else if (char === '"' || char === "'" || char === '`') {
          // Handle strings to avoid counting parens inside them
          const quote = char;
          code += this.advance();
          while (!this.isAtEnd() && this.peek() !== quote) {
            if (this.peek() === '\\' && !this.isAtEnd()) {
              code += this.advance(); // escape char
            }
            if (this.peek() === '\n') {
              this.line++;
              this.column = 0;
            }
            code += this.advance();
          }
          if (!this.isAtEnd()) {
            code += this.advance(); // closing quote
          }
        } else {
          code += this.advance();
        }
      }
      
      if (parenCount > 0) {
        throw new SdevError('Unterminated js expression, missing )', this.line, startColumn);
      }
    } else {
      // Single-line form: js expression (rest of line)
      while (!this.isAtEnd() && this.peek() !== '\n') {
        code += this.advance();
      }
    }
    
    // Only add token if there's actual code
    if (code.trim().length > 0) {
      this.addToken(TokenType.JS_CODE, code.trim(), startColumn);
    }
  }

  skipWhitespace() {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '\n') {
        this.line++;
        this.column = 0;
        this.advance();
      } else {
        break;
      }
    }
  }

  isAtEnd() { return this.pos >= this.source.length; }
  peek() { return this.source[this.pos] ?? '\0'; }
  peekNext() { return this.source[this.pos + 1] ?? '\0'; }
  
  advance() {
    const char = this.source[this.pos];
    this.pos++;
    this.column++;
    return char;
  }

  addToken(type, value, column) {
    this.tokens.push({ type, value, line: this.line, column });
  }

  isDigit(char) { return char >= '0' && char <= '9'; }
  isAlpha(char) { return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_' || /\p{L}/u.test(char); }
  isAlphaNumeric(char) { return this.isAlpha(char) || this.isDigit(char); }
}

// ============= PARSER =============
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  parse() {
    const statements = [];
    while (!this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    return { type: 'Program', statements, line: 1 };
  }

  parseStatement() {
    if (this.check(TokenType.FORGE)) return this.parseForgeStatement();
    if (this.check(TokenType.CONJURE)) return this.parseConjureDeclaration();
    if (this.check(TokenType.ASYNC)) return this.parseAsyncConjure();
    if (this.check(TokenType.PONDER)) return this.parsePonderStatement();
    if (this.check(TokenType.CYCLE)) return this.parseCycleStatement();
    if (this.check(TokenType.WITHIN)) return this.parseWithinStatement();
    if (this.check(TokenType.YIELD)) return this.parseYieldStatement();
    if (this.check(TokenType.YEET)) return this.parseYeetStatement();
    if (this.check(TokenType.SKIP)) return this.parseSkipStatement();
    if (this.check(TokenType.ESSENCE)) return this.parseEssenceDeclaration();
    if (this.check(TokenType.ATTEMPT)) return this.parseAttemptStatement();
    if (this.check(TokenType.JS)) return this.parseJsStatement();
    if (this.check(TokenType.DOUBLE_COLON)) return this.parseBlockStatement();
    return this.parseExpressionStatement();
  }

  parseJsStatement() {
    const jsToken = this.consume(TokenType.JS, "Expected 'js'");
    const codeToken = this.consume(TokenType.JS_CODE, "Expected JavaScript code after 'js'");
    return { type: 'JsExpr', code: codeToken.value, line: jsToken.line };
  }

  parseForgeStatement() {
    const forgeToken = this.consume(TokenType.FORGE, "Expected 'forge'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;
    this.consume(TokenType.BE, "Expected 'be'");
    
    // Special case: forge x be js <raw JS code>
    if (this.match(TokenType.JS)) {
      const codeToken = this.consume(TokenType.JS_CODE, "Expected JavaScript code after 'js'");
      const jsExpr = { type: 'JsExpr', code: codeToken.value, line: forgeToken.line };
      return { type: 'LetStatement', name, value: jsExpr, line: forgeToken.line };
    }
    
    const value = this.parseExpression();
    return { type: 'LetStatement', name, value, line: forgeToken.line };
  }

  parseConjureDeclaration() {
    const conjureToken = this.consume(TokenType.CONJURE, "Expected 'conjure'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected function name").value;
    this.consume(TokenType.LPAREN, "Expected '('");
    
    const params = [];
    const defaults = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const paramName = this.consume(TokenType.IDENTIFIER, "Expected parameter name").value;
        params.push(paramName);
        if (this.match(TokenType.BE)) {
          defaults.push(this.parseExpression());
        } else {
          defaults.push(undefined);
        }
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')'");
    
    const body = this.parseBlockStatement();
    return { type: 'FuncDeclaration', name, params, defaults, body, line: conjureToken.line };
  }

  parseAsyncConjure() {
    const asyncToken = this.consume(TokenType.ASYNC, "Expected 'async'");
    this.consume(TokenType.CONJURE, "Expected 'conjure'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected function name").value;
    this.consume(TokenType.LPAREN, "Expected '('");
    
    const params = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        params.push(this.consume(TokenType.IDENTIFIER, "Expected parameter name").value);
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')'");
    
    const body = this.parseBlockStatement();
    return { type: 'AsyncFuncDeclaration', name, params, body, line: asyncToken.line };
  }

  parseEssenceDeclaration() {
    const essenceToken = this.consume(TokenType.ESSENCE, "Expected 'essence'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected class name").value;
    
    let parent = null;
    if (this.match(TokenType.EXTEND)) {
      parent = this.consume(TokenType.IDENTIFIER, "Expected parent class name").value;
    }
    
    this.consume(TokenType.DOUBLE_COLON, "Expected '::'");
    
    const methods = [];
    while (!this.check(TokenType.DOUBLE_SEMI) && !this.isAtEnd()) {
      if (this.check(TokenType.CONJURE)) {
        const method = this.parseConjureDeclaration();
        methods.push(method);
      } else {
        throw new SdevError('Expected method declaration inside essence', this.peek().line);
      }
    }
    
    this.consume(TokenType.DOUBLE_SEMI, "Expected ';;'");
    return { type: 'EssenceDeclaration', name, parent, methods, line: essenceToken.line };
  }

  parsePonderStatement() {
    const ponderToken = this.consume(TokenType.PONDER, "Expected 'ponder'");
    const condition = this.parseExpression();
    const thenBranch = this.parseBlockStatement();
    
    let elseBranch = null;
    if (this.match(TokenType.OTHERWISE)) {
      if (this.check(TokenType.PONDER)) {
        elseBranch = this.parsePonderStatement();
      } else {
        elseBranch = this.parseBlockStatement();
      }
    }
    
    return { type: 'IfStatement', condition, thenBranch, elseBranch, line: ponderToken.line };
  }

  parseCycleStatement() {
    const cycleToken = this.consume(TokenType.CYCLE, "Expected 'cycle'");
    const condition = this.parseExpression();
    const body = this.parseBlockStatement();
    return { type: 'WhileStatement', condition, body, line: cycleToken.line };
  }

  parseWithinStatement() {
    const withinToken = this.consume(TokenType.WITHIN, "Expected 'within'");
    const varName = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;
    this.consume(TokenType.BE, "Expected 'be'");
    const iterable = this.parseExpression();
    const body = this.parseBlockStatement();
    return { type: 'ForInStatement', varName, iterable, body, line: withinToken.line };
  }

  parseYieldStatement() {
    const yieldToken = this.consume(TokenType.YIELD, "Expected 'yield'");
    let value = null;
    if (!this.check(TokenType.DOUBLE_SEMI) && !this.isAtEnd()) {
      if (!this.check(TokenType.FORGE) && !this.check(TokenType.CONJURE) && 
          !this.check(TokenType.PONDER) && !this.check(TokenType.CYCLE)) {
        value = this.parseExpression();
      }
    }
    return { type: 'ReturnStatement', value, line: yieldToken.line };
  }

  parseYeetStatement() {
    const yeetToken = this.consume(TokenType.YEET, "Expected 'yeet'");
    return { type: 'BreakStatement', line: yeetToken.line };
  }

  parseSkipStatement() {
    const skipToken = this.consume(TokenType.SKIP, "Expected 'skip'");
    return { type: 'ContinueStatement', line: skipToken.line };
  }

  parseAttemptStatement() {
    const attemptToken = this.consume(TokenType.ATTEMPT, "Expected 'attempt'");
    const tryBlock = this.parseBlockStatement();
    
    let catchVar = null;
    let catchBlock = null;
    if (this.match(TokenType.RESCUE)) {
      if (this.check(TokenType.IDENTIFIER)) {
        catchVar = this.consume(TokenType.IDENTIFIER, "Expected error variable").value;
      }
      catchBlock = this.parseBlockStatement();
    }
    
    return { type: 'TryCatchStatement', tryBlock, catchVar, catchBlock, line: attemptToken.line };
  }

  parseBlockStatement() {
    const colonToken = this.consume(TokenType.DOUBLE_COLON, "Expected '::'");
    const statements = [];
    while (!this.check(TokenType.DOUBLE_SEMI) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    this.consume(TokenType.DOUBLE_SEMI, "Expected ';;'");
    return { type: 'BlockStatement', statements, line: colonToken.line };
  }

  parseExpressionStatement() {
    const expr = this.parseExpression();
    
    if (this.match(TokenType.BE)) {
      const value = this.parseExpression();
      
      if (expr.type === 'Identifier') {
        return { type: 'AssignStatement', name: expr.name, value, line: expr.line };
      }
      if (expr.type === 'IndexExpr') {
        return { type: 'IndexAssignStatement', object: expr.object, index: expr.index, value, line: expr.line };
      }
      if (expr.type === 'MemberExpr') {
        return { type: 'MemberAssignStatement', object: expr.object, property: expr.property, value, line: expr.line };
      }
      throw new SdevError('Invalid assignment target', expr.line);
    }
    
    return { type: 'ExpressionStatement', expression: expr, line: expr.line };
  }

  parseExpression() {
    return this.parseTernary();
  }

  parseTernary() {
    let condition = this.parsePipe();
    
    if (this.match(TokenType.TILDE)) {
      const thenExpr = this.parseExpression();
      this.consume(TokenType.COLON, "Expected ':' in ternary");
      const elseExpr = this.parseExpression();
      return { type: 'TernaryExpr', condition, thenExpr, elseExpr, line: condition.line };
    }
    
    return condition;
  }

  parsePipe() {
    let left = this.parseOr();
    
    while (this.match(TokenType.PIPE)) {
      const right = this.parseOr();
      if (right.type === 'CallExpr') {
        right.args.unshift(left);
        left = right;
      } else if (right.type === 'Identifier') {
        left = { type: 'CallExpr', callee: right, args: [left], line: left.line };
      } else {
        throw new SdevError('Pipe target must be a function or call', right.line);
      }
    }
    
    return left;
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.match(TokenType.EITHER)) {
      const right = this.parseAnd();
      left = { type: 'BinaryExpr', operator: 'either', left, right, line: left.line };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseEquality();
    while (this.match(TokenType.ALSO)) {
      const right = this.parseEquality();
      left = { type: 'BinaryExpr', operator: 'also', left, right, line: left.line };
    }
    return left;
  }

  parseEquality() {
    let left = this.parseComparison();
    while (this.match(TokenType.EQUALS, TokenType.DIFFERS)) {
      const operator = this.previous().type === TokenType.EQUALS ? 'equals' : 'differs';
      const right = this.parseComparison();
      left = { type: 'BinaryExpr', operator, left, right, line: left.line };
    }
    return left;
  }

  parseComparison() {
    let left = this.parseTerm();
    while (this.match(TokenType.LESS, TokenType.MORE, TokenType.ATMOST, TokenType.ATLEAST)) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      left = { type: 'BinaryExpr', operator, left, right, line: left.line };
    }
    return left;
  }

  parseTerm() {
    let left = this.parseFactor();
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value;
      const right = this.parseFactor();
      left = { type: 'BinaryExpr', operator, left, right, line: left.line };
    }
    return left;
  }

  parseFactor() {
    let left = this.parsePower();
    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const operator = this.previous().value;
      const right = this.parsePower();
      left = { type: 'BinaryExpr', operator, left, right, line: left.line };
    }
    return left;
  }

  parsePower() {
    let left = this.parseUnary();
    while (this.match(TokenType.CARET)) {
      const right = this.parseUnary();
      left = { type: 'BinaryExpr', operator: '^', left, right, line: left.line };
    }
    return left;
  }

  parseUnary() {
    if (this.match(TokenType.MINUS, TokenType.ISNT)) {
      const operator = this.previous().value;
      const operand = this.parseUnary();
      return { type: 'UnaryExpr', operator, operand, line: this.previous().line };
    }
    if (this.match(TokenType.AWAIT)) {
      const expr = this.parseUnary();
      return { type: 'AwaitExpr', expression: expr, line: this.previous().line };
    }
    if (this.match(TokenType.SPAWN)) {
      const expr = this.parseUnary();
      return { type: 'SpawnExpr', expression: expr, line: this.previous().line };
    }
    if (this.match(TokenType.NEW)) {
      const className = this.consume(TokenType.IDENTIFIER, "Expected class name").value;
      this.consume(TokenType.LPAREN, "Expected '('");
      const args = [];
      if (!this.check(TokenType.RPAREN)) {
        do {
          args.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RPAREN, "Expected ')'");
      return { type: 'NewExpr', className, args, line: this.previous().line };
    }
    return this.parseCall();
  }

  parseCall() {
    let expr = this.parsePrimary();
    
    while (true) {
      if (this.match(TokenType.LPAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.LBRACKET)) {
        const index = this.parseExpression();
        this.consume(TokenType.RBRACKET, "Expected ']'");
        expr = { type: 'IndexExpr', object: expr, index, line: expr.line };
      } else if (this.match(TokenType.DOT)) {
        const property = this.consume(TokenType.IDENTIFIER, "Expected property name").value;
        expr = { type: 'MemberExpr', object: expr, property, line: expr.line };
      } else if (this.match(TokenType.ARROW)) {
        if (expr.type === 'Identifier') {
          const body = this.parseExpression();
          expr = { type: 'LambdaExpr', params: [expr.name], body, line: expr.line };
        } else {
          throw new SdevError('Invalid lambda syntax', expr.line);
        }
      } else {
        break;
      }
    }
    
    return expr;
  }

  finishCall(callee) {
    const args = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')'");
    return { type: 'CallExpr', callee, args, line: callee.line };
  }

  parsePrimary() {
    const token = this.peek();

    if (this.match(TokenType.NUMBER)) {
      return { type: 'NumberLiteral', value: parseFloat(token.value), line: token.line };
    }

    if (this.match(TokenType.STRING)) {
      return { type: 'StringLiteral', value: token.value, line: token.line };
    }

    if (this.match(TokenType.YEP)) {
      return { type: 'BooleanLiteral', value: true, line: token.line };
    }

    if (this.match(TokenType.NOPE)) {
      return { type: 'BooleanLiteral', value: false, line: token.line };
    }

    if (this.match(TokenType.VOID)) {
      return { type: 'NullLiteral', line: token.line };
    }

    if (this.match(TokenType.SELF)) {
      return { type: 'SelfExpr', line: token.line };
    }

    if (this.match(TokenType.SUPER)) {
      this.consume(TokenType.DOT, "Expected '.' after 'super'");
      const method = this.consume(TokenType.IDENTIFIER, "Expected superclass method name").value;
      return { type: 'SuperExpr', method, line: token.line };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return { type: 'Identifier', name: token.value, line: token.line };
    }

    if (this.match(TokenType.LPAREN)) {
      const exprs = [];
      const names = [];
      let isLambdaParams = true;
      
      if (!this.check(TokenType.RPAREN)) {
        do {
          const expr = this.parseExpression();
          exprs.push(expr);
          if (expr.type !== 'Identifier') isLambdaParams = false;
          else names.push(expr.name);
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RPAREN, "Expected ')'");
      
      if (this.match(TokenType.ARROW)) {
        if (!isLambdaParams) {
          throw new SdevError('Invalid lambda parameters', token.line);
        }
        const body = this.parseExpression();
        return { type: 'LambdaExpr', params: names, body, line: token.line };
      }
      
      if (exprs.length === 1) return exprs[0];
      throw new SdevError('Unexpected multiple expressions', token.line);
    }

    if (this.match(TokenType.LBRACKET)) {
      return this.parseArrayLiteral(token.line);
    }

    if (this.match(TokenType.DOUBLE_COLON)) {
      return this.parseDictLiteral(token.line);
    }

    throw new SdevError(`Unexpected token: '${token.value}'`, token.line, token.column);
  }

  parseArrayLiteral(line) {
    const elements = [];
    if (!this.check(TokenType.RBRACKET)) {
      do {
        elements.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RBRACKET, "Expected ']'");
    return { type: 'ArrayLiteral', elements, line };
  }

  parseDictLiteral(line) {
    const entries = [];
    if (!this.check(TokenType.DOUBLE_SEMI)) {
      do {
        const key = this.parseExpression();
        this.consume(TokenType.COLON, "Expected ':'");
        const value = this.parseExpression();
        entries.push({ key, value });
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.DOUBLE_SEMI, "Expected ';;'");
    return { type: 'DictLiteral', entries, line };
  }

  peek() { return this.tokens[this.pos]; }
  previous() { return this.tokens[this.pos - 1]; }
  isAtEnd() { return this.peek().type === TokenType.EOF; }
  check(...types) { return !this.isAtEnd() && types.includes(this.peek().type); }
  
  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  advance() {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  consume(type, message) {
    if (this.check(type)) return this.advance();
    throw new SdevError(message, this.peek().line, this.peek().column);
  }
}

// ============= ENVIRONMENT =============
class Environment {
  constructor(parent = null) {
    this.values = new Map();
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
    return this.values.has(name) || (this.parent && this.parent.has(name));
  }
}

// ============= SDEV TYPES =============
class SdevClass {
  constructor(name, parent, methods) {
    this.name = name;
    this.parent = parent;
    this.methods = methods;
  }

  findMethod(name) {
    if (this.methods.has(name)) {
      return this.methods.get(name);
    }
    if (this.parent) {
      return this.parent.findMethod(name);
    }
    return null;
  }

  toString() {
    return `<essence ${this.name}>`;
  }
}

class SdevInstance {
  constructor(klass) {
    this.klass = klass;
    this.fields = new Map();
  }

  get(name, line) {
    if (this.fields.has(name)) {
      return this.fields.get(name);
    }
    const method = this.klass.findMethod(name);
    if (method) {
      return this.bindMethod(method);
    }
    throw new SdevError(`Undefined property: '${name}'`, line);
  }

  set(name, value) {
    this.fields.set(name, value);
  }

  bindMethod(method) {
    return {
      type: 'bound_method',
      instance: this,
      method: method,
      call: (args, line) => method.call([this, ...args], line)
    };
  }

  toString() {
    return `<${this.klass.name} instance>`;
  }
}

class SdevVector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(other) { return new SdevVector2(this.x + other.x, this.y + other.y); }
  sub(other) { return new SdevVector2(this.x - other.x, this.y - other.y); }
  scale(s) { return new SdevVector2(this.x * s, this.y * s); }
  dot(other) { return this.x * other.x + this.y * other.y; }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  normalize() {
    const len = this.length();
    return len > 0 ? new SdevVector2(this.x / len, this.y / len) : new SdevVector2(0, 0);
  }
  distance(other) { return this.sub(other).length(); }
  angle() { return Math.atan2(this.y, this.x); }
  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new SdevVector2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  toString() { return `Vector2(${this.x}, ${this.y})`; }
}

class SdevSprite {
  constructor(id, x, y, width, height) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.rotation = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.visible = true;
    this.color = '#ffffff';
    this.image = null;
  }

  moveTo(x, y) { this.x = x; this.y = y; }
  moveBy(dx, dy) { this.x += dx; this.y += dy; }
  rotateTo(angle) { this.rotation = angle; }
  rotateBy(angle) { this.rotation += angle; }
  scaleTo(sx, sy) { this.scaleX = sx; this.scaleY = sy ?? sx; }

  collidesWith(other) {
    return !(this.x + this.width < other.x ||
             other.x + other.width < this.x ||
             this.y + this.height < other.y ||
             other.y + other.height < this.y);
  }

  toString() { return `<Sprite ${this.id} at (${this.x}, ${this.y})>`; }
}

// ============= DATA STRUCTURES =============
class SdevSet {
  constructor(items = []) {
    this.items = new Set(items);
  }
  add(item) { this.items.add(item); return this; }
  remove(item) { this.items.delete(item); return this; }
  has(item) { return this.items.has(item); }
  size() { return this.items.size; }
  toList() { return Array.from(this.items); }
  union(other) { return new SdevSet([...this.items, ...other.items]); }
  intersect(other) { return new SdevSet([...this.items].filter(x => other.has(x))); }
  toString() { return `Set{${Array.from(this.items).join(', ')}}`; }
}

class SdevMap {
  constructor() {
    this.items = new Map();
  }
  set(key, value) { this.items.set(key, value); return this; }
  get(key) { return this.items.get(key); }
  has(key) { return this.items.has(key); }
  remove(key) { this.items.delete(key); return this; }
  keys() { return Array.from(this.items.keys()); }
  values() { return Array.from(this.items.values()); }
  size() { return this.items.size; }
  toString() { return `Map{${Array.from(this.items).map(([k,v]) => `${k}: ${v}`).join(', ')}}`; }
}

class SdevQueue {
  constructor() { this.items = []; }
  enqueue(item) { this.items.push(item); return this; }
  dequeue() { return this.items.shift(); }
  peek() { return this.items[0]; }
  isEmpty() { return this.items.length === 0; }
  size() { return this.items.length; }
  toString() { return `Queue[${this.items.join(' <- ')}]`; }
}

class SdevStack {
  constructor() { this.items = []; }
  push(item) { this.items.push(item); return this; }
  pop() { return this.items.pop(); }
  peek() { return this.items[this.items.length - 1]; }
  isEmpty() { return this.items.length === 0; }
  size() { return this.items.length; }
  toString() { return `Stack[${this.items.join(' | ')}]`; }
}

class SdevLinkedList {
  constructor() { this.head = null; this.tail = null; this._size = 0; }
  
  append(value) {
    const node = { value, next: null };
    if (!this.head) {
      this.head = this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }
    this._size++;
    return this;
  }
  
  prepend(value) {
    const node = { value, next: this.head };
    this.head = node;
    if (!this.tail) this.tail = node;
    this._size++;
    return this;
  }
  
  removeFirst() {
    if (!this.head) return null;
    const value = this.head.value;
    this.head = this.head.next;
    if (!this.head) this.tail = null;
    this._size--;
    return value;
  }
  
  toList() {
    const result = [];
    let current = this.head;
    while (current) {
      result.push(current.value);
      current = current.next;
    }
    return result;
  }
  
  size() { return this._size; }
  isEmpty() { return this._size === 0; }
  toString() { return `LinkedList[${this.toList().join(' -> ')}]`; }
}

// ============= INTERPRETER =============
class Interpreter {
  constructor(outputCallback = console.log) {
    this.output = outputCallback;
    this.globalEnv = new Environment();
    this.graphicsCommands = [];
    this.sprites = new Map();
    this.spriteIdCounter = 0;
    this.turtleState = { x: 200, y: 200, angle: 0, penDown: true, color: '#ffffff', width: 2 };
    this.registerBuiltins();
  }

  registerBuiltins() {
    const builtins = this.createBuiltins();
    for (const [name, fn] of builtins) {
      this.globalEnv.define(name, fn);
    }
  }

  createBuiltins() {
    const builtins = new Map();
    const self = this;

    // I/O
    builtins.set('speak', { type: 'builtin', call: (args) => { self.output(args.map(a => stringify(a)).join(' ')); return null; }});
    builtins.set('whisper', { type: 'builtin', call: (args) => { self.output(args.map(a => stringify(a)).join('')); return null; }});
    builtins.set('shout', { type: 'builtin', call: (args) => { self.output(args.map(a => stringify(a)).join(' ').toUpperCase()); return null; }});

    // Type operations
    builtins.set('measure', { type: 'builtin', call: (args, line) => {
      const arg = args[0];
      if (typeof arg === 'string') return arg.length;
      if (Array.isArray(arg)) return arg.length;
      if (arg && typeof arg === 'object') return Object.keys(arg).length;
      throw new SdevError('measure() argument must be string, list, or dict', line);
    }});

    builtins.set('morph', { type: 'builtin', call: (args, line) => {
      const [val, targetType] = args;
      switch (targetType) {
        case 'number': return typeof val === 'number' ? val : parseFloat(val);
        case 'text': return stringify(val);
        case 'truth': return isTruthy(val);
        default: throw new SdevError(`Unknown type: ${targetType}`, line);
      }
    }});

    builtins.set('essence', { type: 'builtin', call: (args) => {
      const val = args[0];
      if (val === null) return 'void';
      if (typeof val === 'number') return 'number';
      if (typeof val === 'string') return 'text';
      if (typeof val === 'boolean') return 'truth';
      if (Array.isArray(val)) return 'list';
      if (val instanceof SdevInstance) return val.klass.name;
      if (val instanceof SdevVector2) return 'Vector2';
      if (val instanceof SdevSprite) return 'Sprite';
      if (val && val.type) return 'conjuration';
      if (typeof val === 'object') return 'tome';
      return 'mystery';
    }});

    // Sequences
    builtins.set('sequence', { type: 'builtin', call: (args, line) => {
      let start = 0, end = 0, step = 1;
      if (args.length === 1) { end = args[0]; }
      else if (args.length === 2) { start = args[0]; end = args[1]; }
      else { start = args[0]; end = args[1]; step = args[2]; }
      if (step === 0) throw new SdevError('sequence() step cannot be 0', line);
      const result = [];
      if (step > 0) { for (let i = start; i < end; i += step) result.push(i); }
      else { for (let i = start; i > end; i += step) result.push(i); }
      return result;
    }});

    // Functional
    builtins.set('each', { type: 'builtin', call: (args, line) => {
      const [arr, fn] = args;
      if (!Array.isArray(arr)) throw new SdevError('First argument must be a list', line);
      return arr.map((item, idx) => fn.call([item, idx], line));
    }});

    builtins.set('sift', { type: 'builtin', call: (args, line) => {
      const [arr, fn] = args;
      if (!Array.isArray(arr)) throw new SdevError('First argument must be a list', line);
      return arr.filter(item => isTruthy(fn.call([item], line)));
    }});

    builtins.set('fold', { type: 'builtin', call: (args, line) => {
      const [arr, initial, fn] = args;
      if (!Array.isArray(arr)) throw new SdevError('First argument must be a list', line);
      return arr.reduce((acc, item) => fn.call([acc, item], line), initial);
    }});

    // List operations
    builtins.set('gather', { type: 'builtin', call: (args, line) => {
      const [arr, item] = args;
      if (!Array.isArray(arr)) throw new SdevError('First argument must be a list', line);
      arr.push(item);
      return arr;
    }});

    builtins.set('pluck', { type: 'builtin', call: (args, line) => {
      const arr = args[0];
      if (!Array.isArray(arr)) throw new SdevError('Argument must be a list', line);
      return arr.pop();
    }});

    builtins.set('portion', { type: 'builtin', call: (args) => {
      const [arr, start, end] = args;
      return arr.slice(start, end);
    }});

    builtins.set('weave', { type: 'builtin', call: (args) => {
      const [arr, sep] = args;
      return arr.map(stringify).join(sep);
    }});

    builtins.set('shatter', { type: 'builtin', call: (args) => {
      const [str, sep] = args;
      return str.split(sep);
    }});

    // String operations
    builtins.set('upper', { type: 'builtin', call: (args) => args[0].toUpperCase() });
    builtins.set('lower', { type: 'builtin', call: (args) => args[0].toLowerCase() });
    builtins.set('trim', { type: 'builtin', call: (args) => args[0].trim() });
    builtins.set('reverse', { type: 'builtin', call: (args) => {
      const val = args[0];
      if (typeof val === 'string') return val.split('').reverse().join('');
      if (Array.isArray(val)) return [...val].reverse();
      return val;
    }});
    builtins.set('contains', { type: 'builtin', call: (args) => {
      const [haystack, needle] = args;
      if (typeof haystack === 'string') return haystack.includes(needle);
      if (Array.isArray(haystack)) return haystack.includes(needle);
      return false;
    }});

    // Dict operations
    builtins.set('inscriptions', { type: 'builtin', call: (args) => Object.keys(args[0]) });
    builtins.set('contents', { type: 'builtin', call: (args) => Object.values(args[0]) });

    // Math
    builtins.set('magnitude', { type: 'builtin', call: (args) => Math.abs(args[0]) });
    builtins.set('least', { type: 'builtin', call: (args) => {
      if (args.length === 1 && Array.isArray(args[0])) return Math.min(...args[0]);
      return Math.min(...args);
    }});
    builtins.set('greatest', { type: 'builtin', call: (args) => {
      if (args.length === 1 && Array.isArray(args[0])) return Math.max(...args[0]);
      return Math.max(...args);
    }});
    builtins.set('root', { type: 'builtin', call: (args) => Math.sqrt(args[0]) });
    builtins.set('ground', { type: 'builtin', call: (args) => Math.floor(args[0]) });
    builtins.set('elevate', { type: 'builtin', call: (args) => Math.ceil(args[0]) });
    builtins.set('nearby', { type: 'builtin', call: (args) => Math.round(args[0]) });
    builtins.set('chaos', { type: 'builtin', call: () => Math.random() });
    builtins.set('sin', { type: 'builtin', call: (args) => Math.sin(args[0]) });
    builtins.set('cos', { type: 'builtin', call: (args) => Math.cos(args[0]) });
    builtins.set('tan', { type: 'builtin', call: (args) => Math.tan(args[0]) });
    builtins.set('asin', { type: 'builtin', call: (args) => Math.asin(args[0]) });
    builtins.set('acos', { type: 'builtin', call: (args) => Math.acos(args[0]) });
    builtins.set('atan', { type: 'builtin', call: (args) => Math.atan(args[0]) });
    builtins.set('atan2', { type: 'builtin', call: (args) => Math.atan2(args[0], args[1]) });
    builtins.set('log', { type: 'builtin', call: (args) => Math.log(args[0]) });
    builtins.set('log10', { type: 'builtin', call: (args) => Math.log10(args[0]) });
    builtins.set('exp', { type: 'builtin', call: (args) => Math.exp(args[0]) });
    builtins.set('PI', { type: 'builtin', call: () => Math.PI });
    builtins.set('TAU', { type: 'builtin', call: () => Math.PI * 2 });
    builtins.set('E', { type: 'builtin', call: () => Math.E });

    // Random
    builtins.set('randint', { type: 'builtin', call: (args) => {
      const [min, max] = args;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }});
    builtins.set('pick', { type: 'builtin', call: (args) => {
      const arr = args[0];
      return arr[Math.floor(Math.random() * arr.length)];
    }});
    builtins.set('shuffle', { type: 'builtin', call: (args) => {
      const arr = [...args[0]];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }});

    // JSON
    builtins.set('etch', { type: 'builtin', call: (args) => JSON.stringify(args[0]) });
    builtins.set('unetch', { type: 'builtin', call: (args, line) => {
      try { return JSON.parse(args[0]); }
      catch { throw new SdevError('Invalid JSON', line); }
    }});

    // Vector2
    builtins.set('Vector2', { type: 'builtin', call: (args) => new SdevVector2(args[0] ?? 0, args[1] ?? 0) });

    // Data structures
    builtins.set('Set', { type: 'builtin', call: (args) => new SdevSet(args[0] ?? []) });
    builtins.set('Map', { type: 'builtin', call: () => new SdevMap() });
    builtins.set('Queue', { type: 'builtin', call: () => new SdevQueue() });
    builtins.set('Stack', { type: 'builtin', call: () => new SdevStack() });
    builtins.set('LinkedList', { type: 'builtin', call: () => new SdevLinkedList() });

    // Time
    builtins.set('now', { type: 'builtin', call: () => Date.now() });
    builtins.set('delay', { type: 'builtin', call: (args) => new Promise(resolve => setTimeout(resolve, args[0])) });

    // Graphics
    this.registerGraphicsBuiltins(builtins);

    // ───────── UI Toolkit (CLI: logs declarative commands) ─────────
    const uiState = { values: new Map(), nodes: [] };
    const uiLog = (msg) => self.output('[ui] ' + msg);
    const stringifyArg = (v) => v === null || v === undefined ? '' : (typeof v === 'string' ? v : stringify(v));
    const uiHandlers = new Map(); let nextHandler = 1;
    const wrapHandler = (fn) => {
      if (!fn || typeof fn !== 'object' || typeof fn.call !== 'function') return null;
      const id = nextHandler++; uiHandlers.set(id, fn); return id;
    };
    const uiSimple = (name, fmt) => builtins.set(name, { type: 'builtin', call: (args) => { uiLog(fmt(args)); return null; }});
    uiSimple('window', (a) => `window("${stringifyArg(a[0]||'sdev App')}", ${a[1]||480}, ${a[2]||600})`);
    uiSimple('endwindow', () => 'endwindow');
    uiSimple('row', () => 'row'); uiSimple('endrow', () => 'endrow');
    uiSimple('column', () => 'column'); uiSimple('endcolumn', () => 'endcolumn');
    uiSimple('group', (a) => `group("${stringifyArg(a[0])}")`); uiSimple('endgroup', () => 'endgroup');
    uiSimple('tabs', () => 'tabs'); uiSimple('endtabs', () => 'endtabs');
    uiSimple('tab', (a) => `tab("${stringifyArg(a[0])}")`); uiSimple('endtab', () => 'endtab');
    uiSimple('heading', (a) => `heading("${stringifyArg(a[0])}", ${a[1]||1})`);
    uiSimple('label', (a) => `label("${stringifyArg(a[0])}")`);
    uiSimple('paragraph', (a) => `paragraph("${stringifyArg(a[0])}")`);
    uiSimple('image', (a) => `image("${stringifyArg(a[0])}", ${a[1]||0}, ${a[2]||0})`);
    uiSimple('divider', () => 'divider'); uiSimple('spacer', (a) => `spacer(${a[0]||8})`);
    uiSimple('progress', (a) => `progress(${a[0]||0}/${a[1]||100})`);
    uiSimple('table', (a) => `table(${JSON.stringify(a[0]||[])}, rows=${(Array.isArray(a[1])?a[1].length:0)})`);
    uiSimple('menu', (a) => `menu("${stringifyArg(a[0])}")`); uiSimple('endmenu', () => 'endmenu');
    builtins.set('button', { type: 'builtin', call: (a) => { wrapHandler(a[1]); uiLog(`button("${stringifyArg(a[0]||'Button')}", variant="${stringifyArg(a[2]||'default')}")`); return null; }});
    builtins.set('menuitem', { type: 'builtin', call: (a) => { wrapHandler(a[1]); uiLog(`menuitem("${stringifyArg(a[0])}")`); return null; }});
    builtins.set('input', { type: 'builtin', call: (a) => { const k = stringifyArg(a[0]); if(k && !uiState.values.has(k)) uiState.values.set(k, ''); uiLog(`input(bind="${k}", placeholder="${stringifyArg(a[1])}")`); return null; }});
    builtins.set('textarea', { type: 'builtin', call: (a) => { const k = stringifyArg(a[0]); if(k && !uiState.values.has(k)) uiState.values.set(k, ''); uiLog(`textarea(bind="${k}", rows=${a[2]||4})`); return null; }});
    builtins.set('checkbox', { type: 'builtin', call: (a) => { const k = stringifyArg(a[0]); if(k && !uiState.values.has(k)) uiState.values.set(k, false); uiLog(`checkbox(bind="${k}", label="${stringifyArg(a[1])}")`); return null; }});
    builtins.set('slider', { type: 'builtin', call: (a) => { const k = stringifyArg(a[0]); const min=Number(a[1])||0; if(k && !uiState.values.has(k)) uiState.values.set(k, min); uiLog(`slider(bind="${k}", ${min}..${Number(a[2])||100} step ${Number(a[3])||1})`); return null; }});
    builtins.set('select', { type: 'builtin', call: (a) => { const k = stringifyArg(a[0]); const opts = Array.isArray(a[1]) ? a[1].map(String) : []; if(k && !uiState.values.has(k)) uiState.values.set(k, opts[0]||''); uiLog(`select(bind="${k}", options=${JSON.stringify(opts)})`); return null; }});
    builtins.set('uiget', { type: 'builtin', call: (a) => uiState.values.has(stringifyArg(a[0])) ? uiState.values.get(stringifyArg(a[0])) : null });
    builtins.set('uiset', { type: 'builtin', call: (a) => { uiState.values.set(stringifyArg(a[0]), a[1]); return null; }});
    builtins.set('show', { type: 'builtin', call: () => { uiLog('show()'); return null; }});
    builtins.set('alert', { type: 'builtin', call: (a) => { self.output('[alert] ' + stringifyArg(a[0])); return null; }});

    return builtins;
  }

  registerGraphicsBuiltins(builtins) {
    const self = this;

    // Canvas setup
    builtins.set('canvas', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'canvas', width: args[0], height: args[1] });
      return null;
    }});
    builtins.set('clear', { type: 'builtin', call: () => { self.graphicsCommands.push({ type: 'clear' }); return null; }});
    builtins.set('background', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'background', color: args[0] });
      return null;
    }});

    // Drawing state
    builtins.set('stroke', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'stroke', color: args[0] });
      return null;
    }});
    builtins.set('fill', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'fill', color: args[0] });
      return null;
    }});
    builtins.set('lineWidth', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'lineWidth', width: args[0] });
      return null;
    }});
    builtins.set('noStroke', { type: 'builtin', call: () => {
      self.graphicsCommands.push({ type: 'noStroke' });
      return null;
    }});
    builtins.set('noFill', { type: 'builtin', call: () => {
      self.graphicsCommands.push({ type: 'noFill' });
      return null;
    }});

    // Shapes
    builtins.set('rect', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'rect', x: args[0], y: args[1], width: args[2], height: args[3], radius: args[4] ?? 0 });
      return null;
    }});
    builtins.set('circle', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'circle', x: args[0], y: args[1], radius: args[2] });
      return null;
    }});
    builtins.set('ellipse', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'ellipse', x: args[0], y: args[1], rx: args[2], ry: args[3] });
      return null;
    }});
    builtins.set('line', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'line', x1: args[0], y1: args[1], x2: args[2], y2: args[3] });
      return null;
    }});
    builtins.set('arc', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'arc', x: args[0], y: args[1], radius: args[2], startAngle: args[3], endAngle: args[4] });
      return null;
    }});
    builtins.set('star', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'star', x: args[0], y: args[1], outerRadius: args[2], innerRadius: args[3], points: args[4] ?? 5 });
      return null;
    }});
    builtins.set('heart', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'heart', x: args[0], y: args[1], size: args[2] });
      return null;
    }});
    builtins.set('polygon', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'polygon', x: args[0], y: args[1], radius: args[2], sides: args[3] });
      return null;
    }});

    // Text
    builtins.set('text', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'text', text: args[0], x: args[1], y: args[2] });
      return null;
    }});
    builtins.set('fontSize', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'fontSize', size: args[0] });
      return null;
    }});
    builtins.set('fontFamily', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'fontFamily', family: args[0] });
      return null;
    }});

    // Gradients
    builtins.set('linearGradient', { type: 'builtin', call: (args) => {
      const [x1, y1, x2, y2, ...stops] = args;
      self.graphicsCommands.push({ type: 'linearGradient', x1, y1, x2, y2, stops });
      return null;
    }});
    builtins.set('radialGradient', { type: 'builtin', call: (args) => {
      const [x, y, r, ...stops] = args;
      self.graphicsCommands.push({ type: 'radialGradient', x, y, r, stops });
      return null;
    }});

    // Transformations
    builtins.set('translate', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'translate', x: args[0], y: args[1] });
      return null;
    }});
    builtins.set('rotate', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'rotate', angle: args[0] });
      return null;
    }});
    builtins.set('scale', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'scale', x: args[0], y: args[1] ?? args[0] });
      return null;
    }});
    builtins.set('save', { type: 'builtin', call: () => { self.graphicsCommands.push({ type: 'save' }); return null; }});
    builtins.set('restore', { type: 'builtin', call: () => { self.graphicsCommands.push({ type: 'restore' }); return null; }});
    builtins.set('resetTransform', { type: 'builtin', call: () => { self.graphicsCommands.push({ type: 'resetTransform' }); return null; }});

    // Path drawing
    builtins.set('beginPath', { type: 'builtin', call: () => { self.graphicsCommands.push({ type: 'beginPath' }); return null; }});
    builtins.set('closePath', { type: 'builtin', call: () => { self.graphicsCommands.push({ type: 'closePath' }); return null; }});
    builtins.set('moveTo', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'moveTo', x: args[0], y: args[1] });
      return null;
    }});
    builtins.set('lineTo', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'lineTo', x: args[0], y: args[1] });
      return null;
    }});
    builtins.set('quadraticTo', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'quadraticTo', cpx: args[0], cpy: args[1], x: args[2], y: args[3] });
      return null;
    }});
    builtins.set('bezierTo', { type: 'builtin', call: (args) => {
      self.graphicsCommands.push({ type: 'bezierTo', cp1x: args[0], cp1y: args[1], cp2x: args[2], cp2y: args[3], x: args[4], y: args[5] });
      return null;
    }});
    builtins.set('strokePath', { type: 'builtin', call: () => { self.graphicsCommands.push({ type: 'strokePath' }); return null; }});
    builtins.set('fillPath', { type: 'builtin', call: () => { self.graphicsCommands.push({ type: 'fillPath' }); return null; }});

    // Sprites
    builtins.set('createSprite', { type: 'builtin', call: (args) => {
      const id = `sprite_${self.spriteIdCounter++}`;
      const sprite = new SdevSprite(id, args[0] ?? 0, args[1] ?? 0, args[2] ?? 50, args[3] ?? 50);
      self.sprites.set(id, sprite);
      return sprite;
    }});
    builtins.set('drawSprite', { type: 'builtin', call: (args) => {
      const sprite = args[0];
      if (sprite instanceof SdevSprite && sprite.visible) {
        self.graphicsCommands.push({
          type: 'sprite',
          x: sprite.x, y: sprite.y,
          width: sprite.width, height: sprite.height,
          rotation: sprite.rotation,
          scaleX: sprite.scaleX, scaleY: sprite.scaleY,
          color: sprite.color, image: sprite.image
        });
      }
      return null;
    }});
    builtins.set('spriteCollides', { type: 'builtin', call: (args) => {
      const [a, b] = args;
      if (a instanceof SdevSprite && b instanceof SdevSprite) {
        return a.collidesWith(b);
      }
      return false;
    }});

    // Turtle graphics
    builtins.set('forward', { type: 'builtin', call: (args) => {
      const dist = args[0];
      const rad = self.turtleState.angle * Math.PI / 180;
      const newX = self.turtleState.x + Math.cos(rad) * dist;
      const newY = self.turtleState.y + Math.sin(rad) * dist;
      if (self.turtleState.penDown) {
        self.graphicsCommands.push({
          type: 'turtleLine',
          x1: self.turtleState.x, y1: self.turtleState.y,
          x2: newX, y2: newY,
          color: self.turtleState.color, width: self.turtleState.width
        });
      }
      self.turtleState.x = newX;
      self.turtleState.y = newY;
      return null;
    }});
    builtins.set('backward', { type: 'builtin', call: (args) => {
      const dist = args[0];
      const rad = self.turtleState.angle * Math.PI / 180;
      const newX = self.turtleState.x - Math.cos(rad) * dist;
      const newY = self.turtleState.y - Math.sin(rad) * dist;
      if (self.turtleState.penDown) {
        self.graphicsCommands.push({
          type: 'turtleLine',
          x1: self.turtleState.x, y1: self.turtleState.y,
          x2: newX, y2: newY,
          color: self.turtleState.color, width: self.turtleState.width
        });
      }
      self.turtleState.x = newX;
      self.turtleState.y = newY;
      return null;
    }});
    builtins.set('left', { type: 'builtin', call: (args) => { self.turtleState.angle -= args[0]; return null; }});
    builtins.set('right', { type: 'builtin', call: (args) => { self.turtleState.angle += args[0]; return null; }});
    builtins.set('penUp', { type: 'builtin', call: () => { self.turtleState.penDown = false; return null; }});
    builtins.set('penDown', { type: 'builtin', call: () => { self.turtleState.penDown = true; return null; }});
    builtins.set('penColor', { type: 'builtin', call: (args) => { self.turtleState.color = args[0]; return null; }});
    builtins.set('penWidth', { type: 'builtin', call: (args) => { self.turtleState.width = args[0]; return null; }});
    builtins.set('goto', { type: 'builtin', call: (args) => {
      if (self.turtleState.penDown) {
        self.graphicsCommands.push({
          type: 'turtleLine',
          x1: self.turtleState.x, y1: self.turtleState.y,
          x2: args[0], y2: args[1],
          color: self.turtleState.color, width: self.turtleState.width
        });
      }
      self.turtleState.x = args[0];
      self.turtleState.y = args[1];
      return null;
    }});
    builtins.set('setHeading', { type: 'builtin', call: (args) => { self.turtleState.angle = args[0]; return null; }});
    builtins.set('home', { type: 'builtin', call: () => {
      if (self.turtleState.penDown) {
        self.graphicsCommands.push({
          type: 'turtleLine',
          x1: self.turtleState.x, y1: self.turtleState.y,
          x2: 200, y2: 200,
          color: self.turtleState.color, width: self.turtleState.width
        });
      }
      self.turtleState.x = 200;
      self.turtleState.y = 200;
      self.turtleState.angle = 0;
      return null;
    }});
    builtins.set('getX', { type: 'builtin', call: () => self.turtleState.x });
    builtins.set('getY', { type: 'builtin', call: () => self.turtleState.y });
    builtins.set('getHeading', { type: 'builtin', call: () => self.turtleState.angle });
    builtins.set('drawTurtle', { type: 'builtin', call: () => {
      self.graphicsCommands.push({
        type: 'turtle',
        x: self.turtleState.x, y: self.turtleState.y,
        angle: self.turtleState.angle,
        color: self.turtleState.color
      });
      return null;
    }});

    // ============= LEAFLET MAP FUNCTIONS =============
    // Store maps and layers
    self.leafletMaps = new Map();
    self.leafletLayers = new Map();
    self.leafletIdCounter = 0;

    // Check if Leaflet is available
    const hasLeaflet = () => typeof L !== 'undefined';

    // createMap(containerId, lat, lng, zoom)
    builtins.set('createMap', { type: 'builtin', call: (args) => {
      if (!hasLeaflet()) throw new SdevError('Leaflet library not loaded', 0);
      const [containerId, lat, lng, zoom] = args;
      const map = L.map(containerId).setView([lat, lng], zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      const id = `map_${self.leafletIdCounter++}`;
      self.leafletMaps.set(id, map);
      return { _leafletType: 'map', _id: id, _map: map };
    }});

    // setMapView(map, lat, lng, zoom)
    builtins.set('setMapView', { type: 'builtin', call: (args) => {
      const [mapObj, lat, lng, zoom] = args;
      if (mapObj?._map) mapObj._map.setView([lat, lng], zoom);
      return null;
    }});

    // getMapCenter(map)
    builtins.set('getMapCenter', { type: 'builtin', call: (args) => {
      const mapObj = args[0];
      if (mapObj?._map) {
        const center = mapObj._map.getCenter();
        return { lat: center.lat, lng: center.lng };
      }
      return null;
    }});

    // getMapZoom(map)
    builtins.set('getMapZoom', { type: 'builtin', call: (args) => {
      const mapObj = args[0];
      return mapObj?._map ? mapObj._map.getZoom() : 0;
    }});

    // getMapBounds(map)
    builtins.set('getMapBounds', { type: 'builtin', call: (args) => {
      const mapObj = args[0];
      if (mapObj?._map) {
        const bounds = mapObj._map.getBounds();
        return {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        };
      }
      return null;
    }});

    // addMarker(map, lat, lng, popupText?)
    builtins.set('addMarker', { type: 'builtin', call: (args) => {
      const [mapObj, lat, lng, popupText] = args;
      if (mapObj?._map) {
        const marker = L.marker([lat, lng]).addTo(mapObj._map);
        if (popupText) marker.bindPopup(popupText);
        const id = `marker_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, marker);
        return { _leafletType: 'marker', _id: id, _layer: marker };
      }
      return null;
    }});

    // addMarkerIcon(map, lat, lng, iconUrl, iconSize, popupText?)
    builtins.set('addMarkerIcon', { type: 'builtin', call: (args) => {
      const [mapObj, lat, lng, iconUrl, iconSize, popupText] = args;
      if (mapObj?._map) {
        const icon = L.icon({
          iconUrl: iconUrl,
          iconSize: Array.isArray(iconSize) ? iconSize : [32, 32]
        });
        const marker = L.marker([lat, lng], { icon }).addTo(mapObj._map);
        if (popupText) marker.bindPopup(popupText);
        const id = `marker_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, marker);
        return { _leafletType: 'marker', _id: id, _layer: marker };
      }
      return null;
    }});

    // removeMarker(map, marker)
    builtins.set('removeMarker', { type: 'builtin', call: (args) => {
      const [mapObj, markerObj] = args;
      if (mapObj?._map && markerObj?._layer) {
        mapObj._map.removeLayer(markerObj._layer);
      }
      return null;
    }});

    // setMarkerPosition(marker, lat, lng)
    builtins.set('setMarkerPosition', { type: 'builtin', call: (args) => {
      const [markerObj, lat, lng] = args;
      if (markerObj?._layer) markerObj._layer.setLatLng([lat, lng]);
      return null;
    }});

    // getMarkerPosition(marker)
    builtins.set('getMarkerPosition', { type: 'builtin', call: (args) => {
      const markerObj = args[0];
      if (markerObj?._layer) {
        const pos = markerObj._layer.getLatLng();
        return { lat: pos.lat, lng: pos.lng };
      }
      return null;
    }});

    // setMarkerDraggable(marker, draggable)
    builtins.set('setMarkerDraggable', { type: 'builtin', call: (args) => {
      const [markerObj, draggable] = args;
      if (markerObj?._layer) {
        if (draggable) markerObj._layer.dragging.enable();
        else markerObj._layer.dragging.disable();
      }
      return null;
    }});

    // bindPopup(marker, content)
    builtins.set('bindPopup', { type: 'builtin', call: (args) => {
      const [obj, content] = args;
      if (obj?._layer) obj._layer.bindPopup(content);
      return null;
    }});

    // bindTooltip(marker, content)
    builtins.set('bindTooltip', { type: 'builtin', call: (args) => {
      const [obj, content] = args;
      if (obj?._layer) obj._layer.bindTooltip(content);
      return null;
    }});

    // openPopup(marker)
    builtins.set('openPopup', { type: 'builtin', call: (args) => {
      const obj = args[0];
      if (obj?._layer) obj._layer.openPopup();
      return null;
    }});

    // addCircle(map, lat, lng, radius, options?)
    builtins.set('addCircle', { type: 'builtin', call: (args) => {
      const [mapObj, lat, lng, radius, options] = args;
      if (mapObj?._map) {
        const circle = L.circle([lat, lng], { radius, ...options }).addTo(mapObj._map);
        const id = `circle_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, circle);
        return { _leafletType: 'circle', _id: id, _layer: circle };
      }
      return null;
    }});

    // addCircleMarker(map, lat, lng, radius, options?)
    builtins.set('addCircleMarker', { type: 'builtin', call: (args) => {
      const [mapObj, lat, lng, radius, options] = args;
      if (mapObj?._map) {
        const marker = L.circleMarker([lat, lng], { radius, ...options }).addTo(mapObj._map);
        const id = `circleMarker_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, marker);
        return { _leafletType: 'circleMarker', _id: id, _layer: marker };
      }
      return null;
    }});

    // addRectangle(map, lat1, lng1, lat2, lng2, options?)
    builtins.set('addRectangle', { type: 'builtin', call: (args) => {
      const [mapObj, lat1, lng1, lat2, lng2, options] = args;
      if (mapObj?._map) {
        const rect = L.rectangle([[lat1, lng1], [lat2, lng2]], options).addTo(mapObj._map);
        const id = `rect_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, rect);
        return { _leafletType: 'rectangle', _id: id, _layer: rect };
      }
      return null;
    }});

    // addPolyline(map, points, options?)
    builtins.set('addPolyline', { type: 'builtin', call: (args) => {
      const [mapObj, points, options] = args;
      if (mapObj?._map && Array.isArray(points)) {
        const line = L.polyline(points, options).addTo(mapObj._map);
        const id = `polyline_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, line);
        return { _leafletType: 'polyline', _id: id, _layer: line };
      }
      return null;
    }});

    // addPolygon(map, points, options?)
    builtins.set('addPolygon', { type: 'builtin', call: (args) => {
      const [mapObj, points, options] = args;
      if (mapObj?._map && Array.isArray(points)) {
        const poly = L.polygon(points, options).addTo(mapObj._map);
        const id = `polygon_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, poly);
        return { _leafletType: 'polygon', _id: id, _layer: poly };
      }
      return null;
    }});

    // addMultiPolygon(map, polygons, options?)
    builtins.set('addMultiPolygon', { type: 'builtin', call: (args) => {
      const [mapObj, polygons, options] = args;
      if (mapObj?._map && Array.isArray(polygons)) {
        const poly = L.polygon(polygons, options).addTo(mapObj._map);
        const id = `multipolygon_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, poly);
        return { _leafletType: 'multipolygon', _id: id, _layer: poly };
      }
      return null;
    }});

    // addTileLayer(map, urlTemplate, options?)
    builtins.set('addTileLayer', { type: 'builtin', call: (args) => {
      const [mapObj, urlTemplate, options] = args;
      if (mapObj?._map) {
        const layer = L.tileLayer(urlTemplate, options).addTo(mapObj._map);
        const id = `tile_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, layer);
        return { _leafletType: 'tileLayer', _id: id, _layer: layer };
      }
      return null;
    }});

    // createLayerGroup()
    builtins.set('createLayerGroup', { type: 'builtin', call: () => {
      if (!hasLeaflet()) throw new SdevError('Leaflet library not loaded', 0);
      const group = L.layerGroup();
      const id = `group_${self.leafletIdCounter++}`;
      self.leafletLayers.set(id, group);
      return { _leafletType: 'layerGroup', _id: id, _layer: group };
    }});

    // addLayerToMap(map, layer)
    builtins.set('addLayerToMap', { type: 'builtin', call: (args) => {
      const [mapObj, layerObj] = args;
      if (mapObj?._map && layerObj?._layer) {
        layerObj._layer.addTo(mapObj._map);
      }
      return null;
    }});

    // removeLayerFromMap(map, layer)
    builtins.set('removeLayerFromMap', { type: 'builtin', call: (args) => {
      const [mapObj, layerObj] = args;
      if (mapObj?._map && layerObj?._layer) {
        mapObj._map.removeLayer(layerObj._layer);
      }
      return null;
    }});

    // clearLayer(layer)
    builtins.set('clearLayer', { type: 'builtin', call: (args) => {
      const layerObj = args[0];
      if (layerObj?._layer && typeof layerObj._layer.clearLayers === 'function') {
        layerObj._layer.clearLayers();
      }
      return null;
    }});

    // onMapClick(map, callback)
    builtins.set('onMapClick', { type: 'builtin', call: (args) => {
      const [mapObj, callback] = args;
      if (mapObj?._map && callback) {
        mapObj._map.on('click', (e) => {
          const event = { lat: e.latlng.lat, lng: e.latlng.lng };
          self.callFunction(callback, [event]);
        });
      }
      return null;
    }});

    // onMapZoom(map, callback)
    builtins.set('onMapZoom', { type: 'builtin', call: (args) => {
      const [mapObj, callback] = args;
      if (mapObj?._map && callback) {
        mapObj._map.on('zoomend', () => {
          self.callFunction(callback, [{}]);
        });
      }
      return null;
    }});

    // onMapMove(map, callback)
    builtins.set('onMapMove', { type: 'builtin', call: (args) => {
      const [mapObj, callback] = args;
      if (mapObj?._map && callback) {
        mapObj._map.on('moveend', () => {
          self.callFunction(callback, [{}]);
        });
      }
      return null;
    }});

    // onMarkerClick(marker, callback)
    builtins.set('onMarkerClick', { type: 'builtin', call: (args) => {
      const [markerObj, callback] = args;
      if (markerObj?._layer && callback) {
        markerObj._layer.on('click', () => {
          self.callFunction(callback, [{}]);
        });
      }
      return null;
    }});

    // onMarkerDrag(marker, callback)
    builtins.set('onMarkerDrag', { type: 'builtin', call: (args) => {
      const [markerObj, callback] = args;
      if (markerObj?._layer && callback) {
        markerObj._layer.on('dragend', () => {
          self.callFunction(callback, [{}]);
        });
      }
      return null;
    }});

    // addZoomControl(map, position?)
    builtins.set('addZoomControl', { type: 'builtin', call: (args) => {
      const [mapObj, position] = args;
      if (mapObj?._map) {
        L.control.zoom({ position: position || 'topleft' }).addTo(mapObj._map);
      }
      return null;
    }});

    // addScaleControl(map, options?)
    builtins.set('addScaleControl', { type: 'builtin', call: (args) => {
      const [mapObj, options] = args;
      if (mapObj?._map) {
        L.control.scale(options || {}).addTo(mapObj._map);
      }
      return null;
    }});

    // addAttributionControl(map, prefix?)
    builtins.set('addAttributionControl', { type: 'builtin', call: (args) => {
      const [mapObj, prefix] = args;
      if (mapObj?._map) {
        L.control.attribution({ prefix: prefix || '' }).addTo(mapObj._map);
      }
      return null;
    }});

    // addLayerControl(map, baseLayers, overlays)
    builtins.set('addLayerControl', { type: 'builtin', call: (args) => {
      const [mapObj, baseLayers, overlays] = args;
      if (mapObj?._map) {
        const bases = {};
        const overs = {};
        if (baseLayers && typeof baseLayers === 'object') {
          for (const [k, v] of Object.entries(baseLayers)) {
            if (v?._layer) bases[k] = v._layer;
          }
        }
        if (overlays && typeof overlays === 'object') {
          for (const [k, v] of Object.entries(overlays)) {
            if (v?._layer) overs[k] = v._layer;
          }
        }
        L.control.layers(bases, overs).addTo(mapObj._map);
      }
      return null;
    }});

    // addGeoJSON(map, geoJsonData, options?)
    builtins.set('addGeoJSON', { type: 'builtin', call: (args) => {
      const [mapObj, data, options] = args;
      if (mapObj?._map) {
        const layer = L.geoJSON(data, options).addTo(mapObj._map);
        const id = `geojson_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, layer);
        return { _leafletType: 'geoJSON', _id: id, _layer: layer };
      }
      return null;
    }});

    // latLng(lat, lng)
    builtins.set('latLng', { type: 'builtin', call: (args) => {
      return { lat: args[0], lng: args[1] };
    }});

    // distance(lat1, lng1, lat2, lng2)
    builtins.set('distance', { type: 'builtin', call: (args) => {
      if (!hasLeaflet()) {
        // Haversine formula fallback
        const [lat1, lng1, lat2, lng2] = args;
        const R = 6371000; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      }
      const p1 = L.latLng(args[0], args[1]);
      const p2 = L.latLng(args[2], args[3]);
      return p1.distanceTo(p2);
    }});

    // boundsContains(bounds, lat, lng)
    builtins.set('boundsContains', { type: 'builtin', call: (args) => {
      const [bounds, lat, lng] = args;
      if (bounds && typeof bounds === 'object') {
        return lat >= bounds.south && lat <= bounds.north &&
               lng >= bounds.west && lng <= bounds.east;
      }
      return false;
    }});

    // fitBounds(map, lat1, lng1, lat2, lng2)
    builtins.set('fitBounds', { type: 'builtin', call: (args) => {
      const [mapObj, lat1, lng1, lat2, lng2] = args;
      if (mapObj?._map) {
        mapObj._map.fitBounds([[lat1, lng1], [lat2, lng2]]);
      }
      return null;
    }});

    // invalidateSize(map)
    builtins.set('invalidateSize', { type: 'builtin', call: (args) => {
      const mapObj = args[0];
      if (mapObj?._map) mapObj._map.invalidateSize();
      return null;
    }});

    // ============= ADDITIONAL LEAFLET FUNCTIONS =============

    // closePopup(marker)
    builtins.set('closePopup', { type: 'builtin', call: (args) => {
      const obj = args[0];
      if (obj?._layer) obj._layer.closePopup();
      return null;
    }});

    // openTooltip(marker)
    builtins.set('openTooltip', { type: 'builtin', call: (args) => {
      const obj = args[0];
      if (obj?._layer) obj._layer.openTooltip();
      return null;
    }});

    // closeTooltip(marker)
    builtins.set('closeTooltip', { type: 'builtin', call: (args) => {
      const obj = args[0];
      if (obj?._layer) obj._layer.closeTooltip();
      return null;
    }});

    // setPopupContent(marker, content)
    builtins.set('setPopupContent', { type: 'builtin', call: (args) => {
      const [obj, content] = args;
      if (obj?._layer) obj._layer.setPopupContent(content);
      return null;
    }});

    // setTooltipContent(marker, content)
    builtins.set('setTooltipContent', { type: 'builtin', call: (args) => {
      const [obj, content] = args;
      if (obj?._layer) obj._layer.setTooltipContent(content);
      return null;
    }});

    // setMarkerIcon(marker, iconUrl, iconSize)
    builtins.set('setMarkerIcon', { type: 'builtin', call: (args) => {
      const [markerObj, iconUrl, iconSize] = args;
      if (markerObj?._layer && hasLeaflet()) {
        const icon = L.icon({
          iconUrl: iconUrl,
          iconSize: Array.isArray(iconSize) ? iconSize : [32, 32]
        });
        markerObj._layer.setIcon(icon);
      }
      return null;
    }});

    // setMarkerOpacity(marker, opacity)
    builtins.set('setMarkerOpacity', { type: 'builtin', call: (args) => {
      const [markerObj, opacity] = args;
      if (markerObj?._layer) markerObj._layer.setOpacity(opacity);
      return null;
    }});

    // setMarkerZIndex(marker, zIndex)
    builtins.set('setMarkerZIndex', { type: 'builtin', call: (args) => {
      const [markerObj, zIndex] = args;
      if (markerObj?._layer) markerObj._layer.setZIndexOffset(zIndex);
      return null;
    }});

    // setCircleRadius(circle, radius)
    builtins.set('setCircleRadius', { type: 'builtin', call: (args) => {
      const [circleObj, radius] = args;
      if (circleObj?._layer) circleObj._layer.setRadius(radius);
      return null;
    }});

    // setCircleStyle(circle, options)
    builtins.set('setCircleStyle', { type: 'builtin', call: (args) => {
      const [circleObj, options] = args;
      if (circleObj?._layer) circleObj._layer.setStyle(options);
      return null;
    }});

    // setPolylineStyle(polyline, options)
    builtins.set('setPolylineStyle', { type: 'builtin', call: (args) => {
      const [polyObj, options] = args;
      if (polyObj?._layer) polyObj._layer.setStyle(options);
      return null;
    }});

    // setPolygonStyle(polygon, options)
    builtins.set('setPolygonStyle', { type: 'builtin', call: (args) => {
      const [polyObj, options] = args;
      if (polyObj?._layer) polyObj._layer.setStyle(options);
      return null;
    }});

    // getPolylineLatLngs(polyline)
    builtins.set('getPolylineLatLngs', { type: 'builtin', call: (args) => {
      const polyObj = args[0];
      if (polyObj?._layer) {
        return polyObj._layer.getLatLngs().map(ll => ({ lat: ll.lat, lng: ll.lng }));
      }
      return [];
    }});

    // setPolylineLatLngs(polyline, points)
    builtins.set('setPolylineLatLngs', { type: 'builtin', call: (args) => {
      const [polyObj, points] = args;
      if (polyObj?._layer && Array.isArray(points)) {
        polyObj._layer.setLatLngs(points);
      }
      return null;
    }});

    // addLatLng(polyline, lat, lng)
    builtins.set('addLatLng', { type: 'builtin', call: (args) => {
      const [polyObj, lat, lng] = args;
      if (polyObj?._layer) polyObj._layer.addLatLng([lat, lng]);
      return null;
    }});

    // bringToFront(layer)
    builtins.set('bringToFront', { type: 'builtin', call: (args) => {
      const layerObj = args[0];
      if (layerObj?._layer && typeof layerObj._layer.bringToFront === 'function') {
        layerObj._layer.bringToFront();
      }
      return null;
    }});

    // bringToBack(layer)
    builtins.set('bringToBack', { type: 'builtin', call: (args) => {
      const layerObj = args[0];
      if (layerObj?._layer && typeof layerObj._layer.bringToBack === 'function') {
        layerObj._layer.bringToBack();
      }
      return null;
    }});

    // onLayerClick(layer, callback)
    builtins.set('onLayerClick', { type: 'builtin', call: (args) => {
      const [layerObj, callback] = args;
      if (layerObj?._layer && callback) {
        layerObj._layer.on('click', (e) => {
          const event = e.latlng ? { lat: e.latlng.lat, lng: e.latlng.lng } : {};
          self.callFunction(callback, [event]);
        });
      }
      return null;
    }});

    // onLayerMouseover(layer, callback)
    builtins.set('onLayerMouseover', { type: 'builtin', call: (args) => {
      const [layerObj, callback] = args;
      if (layerObj?._layer && callback) {
        layerObj._layer.on('mouseover', (e) => {
          const event = e.latlng ? { lat: e.latlng.lat, lng: e.latlng.lng } : {};
          self.callFunction(callback, [event]);
        });
      }
      return null;
    }});

    // onLayerMouseout(layer, callback)
    builtins.set('onLayerMouseout', { type: 'builtin', call: (args) => {
      const [layerObj, callback] = args;
      if (layerObj?._layer && callback) {
        layerObj._layer.on('mouseout', () => {
          self.callFunction(callback, [{}]);
        });
      }
      return null;
    }});

    // onMapDoubleClick(map, callback)
    builtins.set('onMapDoubleClick', { type: 'builtin', call: (args) => {
      const [mapObj, callback] = args;
      if (mapObj?._map && callback) {
        mapObj._map.on('dblclick', (e) => {
          const event = { lat: e.latlng.lat, lng: e.latlng.lng };
          self.callFunction(callback, [event]);
        });
      }
      return null;
    }});

    // onMapRightClick(map, callback)
    builtins.set('onMapRightClick', { type: 'builtin', call: (args) => {
      const [mapObj, callback] = args;
      if (mapObj?._map && callback) {
        mapObj._map.on('contextmenu', (e) => {
          const event = { lat: e.latlng.lat, lng: e.latlng.lng };
          self.callFunction(callback, [event]);
        });
      }
      return null;
    }});

    // onMapMousemove(map, callback)
    builtins.set('onMapMousemove', { type: 'builtin', call: (args) => {
      const [mapObj, callback] = args;
      if (mapObj?._map && callback) {
        mapObj._map.on('mousemove', (e) => {
          const event = { lat: e.latlng.lat, lng: e.latlng.lng };
          self.callFunction(callback, [event]);
        });
      }
      return null;
    }});

    // panTo(map, lat, lng, options?)
    builtins.set('panTo', { type: 'builtin', call: (args) => {
      const [mapObj, lat, lng, options] = args;
      if (mapObj?._map) mapObj._map.panTo([lat, lng], options || {});
      return null;
    }});

    // panBy(map, x, y)
    builtins.set('panBy', { type: 'builtin', call: (args) => {
      const [mapObj, x, y] = args;
      if (mapObj?._map) mapObj._map.panBy([x, y]);
      return null;
    }});

    // flyTo(map, lat, lng, zoom, options?)
    builtins.set('flyTo', { type: 'builtin', call: (args) => {
      const [mapObj, lat, lng, zoom, options] = args;
      if (mapObj?._map) mapObj._map.flyTo([lat, lng], zoom, options || {});
      return null;
    }});

    // flyToBounds(map, lat1, lng1, lat2, lng2, options?)
    builtins.set('flyToBounds', { type: 'builtin', call: (args) => {
      const [mapObj, lat1, lng1, lat2, lng2, options] = args;
      if (mapObj?._map) mapObj._map.flyToBounds([[lat1, lng1], [lat2, lng2]], options || {});
      return null;
    }});

    // setMinZoom(map, zoom)
    builtins.set('setMinZoom', { type: 'builtin', call: (args) => {
      const [mapObj, zoom] = args;
      if (mapObj?._map) mapObj._map.setMinZoom(zoom);
      return null;
    }});

    // setMaxZoom(map, zoom)
    builtins.set('setMaxZoom', { type: 'builtin', call: (args) => {
      const [mapObj, zoom] = args;
      if (mapObj?._map) mapObj._map.setMaxZoom(zoom);
      return null;
    }});

    // setMaxBounds(map, lat1, lng1, lat2, lng2)
    builtins.set('setMaxBounds', { type: 'builtin', call: (args) => {
      const [mapObj, lat1, lng1, lat2, lng2] = args;
      if (mapObj?._map) mapObj._map.setMaxBounds([[lat1, lng1], [lat2, lng2]]);
      return null;
    }});

    // zoomIn(map, delta?)
    builtins.set('zoomIn', { type: 'builtin', call: (args) => {
      const [mapObj, delta] = args;
      if (mapObj?._map) mapObj._map.zoomIn(delta ?? 1);
      return null;
    }});

    // zoomOut(map, delta?)
    builtins.set('zoomOut', { type: 'builtin', call: (args) => {
      const [mapObj, delta] = args;
      if (mapObj?._map) mapObj._map.zoomOut(delta ?? 1);
      return null;
    }});

    // setZoom(map, zoom)
    builtins.set('setZoom', { type: 'builtin', call: (args) => {
      const [mapObj, zoom] = args;
      if (mapObj?._map) mapObj._map.setZoom(zoom);
      return null;
    }});

    // getMinZoom(map)
    builtins.set('getMinZoom', { type: 'builtin', call: (args) => {
      const mapObj = args[0];
      return mapObj?._map ? mapObj._map.getMinZoom() : 0;
    }});

    // getMaxZoom(map)
    builtins.set('getMaxZoom', { type: 'builtin', call: (args) => {
      const mapObj = args[0];
      return mapObj?._map ? mapObj._map.getMaxZoom() : 18;
    }});

    // getSize(map)
    builtins.set('getSize', { type: 'builtin', call: (args) => {
      const mapObj = args[0];
      if (mapObj?._map) {
        const size = mapObj._map.getSize();
        return { width: size.x, height: size.y };
      }
      return { width: 0, height: 0 };
    }});

    // latLngToContainerPoint(map, lat, lng)
    builtins.set('latLngToContainerPoint', { type: 'builtin', call: (args) => {
      const [mapObj, lat, lng] = args;
      if (mapObj?._map) {
        const point = mapObj._map.latLngToContainerPoint([lat, lng]);
        return { x: point.x, y: point.y };
      }
      return { x: 0, y: 0 };
    }});

    // containerPointToLatLng(map, x, y)
    builtins.set('containerPointToLatLng', { type: 'builtin', call: (args) => {
      const [mapObj, x, y] = args;
      if (mapObj?._map) {
        const ll = mapObj._map.containerPointToLatLng([x, y]);
        return { lat: ll.lat, lng: ll.lng };
      }
      return { lat: 0, lng: 0 };
    }});

    // locate(map, options?)
    builtins.set('locate', { type: 'builtin', call: (args) => {
      const [mapObj, options] = args;
      if (mapObj?._map) mapObj._map.locate(options || {});
      return null;
    }});

    // onLocationFound(map, callback)
    builtins.set('onLocationFound', { type: 'builtin', call: (args) => {
      const [mapObj, callback] = args;
      if (mapObj?._map && callback) {
        mapObj._map.on('locationfound', (e) => {
          const event = {
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            accuracy: e.accuracy,
            altitude: e.altitude,
            speed: e.speed,
            timestamp: e.timestamp
          };
          self.callFunction(callback, [event]);
        });
      }
      return null;
    }});

    // onLocationError(map, callback)
    builtins.set('onLocationError', { type: 'builtin', call: (args) => {
      const [mapObj, callback] = args;
      if (mapObj?._map && callback) {
        mapObj._map.on('locationerror', (e) => {
          self.callFunction(callback, [{ message: e.message, code: e.code }]);
        });
      }
      return null;
    }});

    // stopLocate(map)
    builtins.set('stopLocate', { type: 'builtin', call: (args) => {
      const mapObj = args[0];
      if (mapObj?._map) mapObj._map.stopLocate();
      return null;
    }});

    // addImageOverlay(map, imageUrl, lat1, lng1, lat2, lng2, options?)
    builtins.set('addImageOverlay', { type: 'builtin', call: (args) => {
      const [mapObj, imageUrl, lat1, lng1, lat2, lng2, options] = args;
      if (mapObj?._map && hasLeaflet()) {
        const overlay = L.imageOverlay(imageUrl, [[lat1, lng1], [lat2, lng2]], options || {}).addTo(mapObj._map);
        const id = `imageOverlay_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, overlay);
        return { _leafletType: 'imageOverlay', _id: id, _layer: overlay };
      }
      return null;
    }});

    // addVideoOverlay(map, videoUrl, lat1, lng1, lat2, lng2, options?)
    builtins.set('addVideoOverlay', { type: 'builtin', call: (args) => {
      const [mapObj, videoUrl, lat1, lng1, lat2, lng2, options] = args;
      if (mapObj?._map && hasLeaflet()) {
        const overlay = L.videoOverlay(videoUrl, [[lat1, lng1], [lat2, lng2]], options || {}).addTo(mapObj._map);
        const id = `videoOverlay_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, overlay);
        return { _leafletType: 'videoOverlay', _id: id, _layer: overlay };
      }
      return null;
    }});

    // setImageOpacity(overlay, opacity)
    builtins.set('setImageOpacity', { type: 'builtin', call: (args) => {
      const [overlayObj, opacity] = args;
      if (overlayObj?._layer) overlayObj._layer.setOpacity(opacity);
      return null;
    }});

    // setImageUrl(overlay, url)
    builtins.set('setImageUrl', { type: 'builtin', call: (args) => {
      const [overlayObj, url] = args;
      if (overlayObj?._layer) overlayObj._layer.setUrl(url);
      return null;
    }});

    // setBounds(overlay, lat1, lng1, lat2, lng2)
    builtins.set('setBounds', { type: 'builtin', call: (args) => {
      const [overlayObj, lat1, lng1, lat2, lng2] = args;
      if (overlayObj?._layer && hasLeaflet()) {
        overlayObj._layer.setBounds(L.latLngBounds([[lat1, lng1], [lat2, lng2]]));
      }
      return null;
    }});

    // createFeatureGroup()
    builtins.set('createFeatureGroup', { type: 'builtin', call: () => {
      if (!hasLeaflet()) throw new SdevError('Leaflet library not loaded', 0);
      const group = L.featureGroup();
      const id = `featureGroup_${self.leafletIdCounter++}`;
      self.leafletLayers.set(id, group);
      return { _leafletType: 'featureGroup', _id: id, _layer: group };
    }});

    // getFeatureGroupBounds(featureGroup)
    builtins.set('getFeatureGroupBounds', { type: 'builtin', call: (args) => {
      const groupObj = args[0];
      if (groupObj?._layer) {
        const bounds = groupObj._layer.getBounds();
        if (bounds.isValid()) {
          return {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          };
        }
      }
      return null;
    }});

    // fitFeatureGroup(map, featureGroup, options?)
    builtins.set('fitFeatureGroup', { type: 'builtin', call: (args) => {
      const [mapObj, groupObj, options] = args;
      if (mapObj?._map && groupObj?._layer) {
        const bounds = groupObj._layer.getBounds();
        if (bounds.isValid()) {
          mapObj._map.fitBounds(bounds, options || {});
        }
      }
      return null;
    }});

    // addToFeatureGroup(featureGroup, layer)
    builtins.set('addToFeatureGroup', { type: 'builtin', call: (args) => {
      const [groupObj, layerObj] = args;
      if (groupObj?._layer && layerObj?._layer) {
        groupObj._layer.addLayer(layerObj._layer);
      }
      return null;
    }});

    // removeFromFeatureGroup(featureGroup, layer)
    builtins.set('removeFromFeatureGroup', { type: 'builtin', call: (args) => {
      const [groupObj, layerObj] = args;
      if (groupObj?._layer && layerObj?._layer) {
        groupObj._layer.removeLayer(layerObj._layer);
      }
      return null;
    }});

    // eachLayer(layerGroup, callback)
    builtins.set('eachLayer', { type: 'builtin', call: (args) => {
      const [groupObj, callback] = args;
      if (groupObj?._layer && callback) {
        groupObj._layer.eachLayer((layer) => {
          self.callFunction(callback, [{ _layer: layer }]);
        });
      }
      return null;
    }});

    // getLayers(layerGroup)
    builtins.set('getLayers', { type: 'builtin', call: (args) => {
      const groupObj = args[0];
      if (groupObj?._layer && typeof groupObj._layer.getLayers === 'function') {
        return groupObj._layer.getLayers().map(layer => ({ _layer: layer }));
      }
      return [];
    }});

    // hasLayer(layerGroup, layer)
    builtins.set('hasLayer', { type: 'builtin', call: (args) => {
      const [groupObj, layerObj] = args;
      if (groupObj?._layer && layerObj?._layer) {
        return groupObj._layer.hasLayer(layerObj._layer);
      }
      return false;
    }});

    // addDivIcon(map, lat, lng, html, className, size)
    builtins.set('addDivIcon', { type: 'builtin', call: (args) => {
      const [mapObj, lat, lng, html, className, size] = args;
      if (mapObj?._map && hasLeaflet()) {
        const icon = L.divIcon({
          html: html || '',
          className: className || '',
          iconSize: Array.isArray(size) ? size : null
        });
        const marker = L.marker([lat, lng], { icon }).addTo(mapObj._map);
        const id = `divMarker_${self.leafletIdCounter++}`;
        self.leafletLayers.set(id, marker);
        return { _leafletType: 'marker', _id: id, _layer: marker };
      }
      return null;
    }});

    // bearing(lat1, lng1, lat2, lng2)
    builtins.set('bearing', { type: 'builtin', call: (args) => {
      const [lat1, lng1, lat2, lng2] = args;
      const toRad = d => d * Math.PI / 180;
      const toDeg = r => r * 180 / Math.PI;
      const dLng = toRad(lng2 - lng1);
      const lat1R = toRad(lat1);
      const lat2R = toRad(lat2);
      const y = Math.sin(dLng) * Math.cos(lat2R);
      const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
      return (toDeg(Math.atan2(y, x)) + 360) % 360;
    }});

    // midpoint(lat1, lng1, lat2, lng2)
    builtins.set('midpoint', { type: 'builtin', call: (args) => {
      const [lat1, lng1, lat2, lng2] = args;
      const toRad = d => d * Math.PI / 180;
      const toDeg = r => r * 180 / Math.PI;
      const dLng = toRad(lng2 - lng1);
      const lat1R = toRad(lat1);
      const lat2R = toRad(lat2);
      const lng1R = toRad(lng1);
      const Bx = Math.cos(lat2R) * Math.cos(dLng);
      const By = Math.cos(lat2R) * Math.sin(dLng);
      const lat3 = Math.atan2(Math.sin(lat1R) + Math.sin(lat2R), Math.sqrt((Math.cos(lat1R) + Bx) ** 2 + By ** 2));
      const lng3 = lng1R + Math.atan2(By, Math.cos(lat1R) + Bx);
      return { lat: toDeg(lat3), lng: toDeg(lng3) };
    }});

    // destination(lat, lng, bearing, distance)
    builtins.set('destination', { type: 'builtin', call: (args) => {
      const [lat, lng, bearing, distance] = args;
      const R = 6371000;
      const toRad = d => d * Math.PI / 180;
      const toDeg = r => r * 180 / Math.PI;
      const latR = toRad(lat);
      const lngR = toRad(lng);
      const bearingR = toRad(bearing);
      const angularDist = distance / R;
      const lat2 = Math.asin(Math.sin(latR) * Math.cos(angularDist) + Math.cos(latR) * Math.sin(angularDist) * Math.cos(bearingR));
      const lng2 = lngR + Math.atan2(Math.sin(bearingR) * Math.sin(angularDist) * Math.cos(latR), Math.cos(angularDist) - Math.sin(latR) * Math.sin(lat2));
      return { lat: toDeg(lat2), lng: toDeg(lng2) };
    }});

    // area(points) - calculates polygon area in square meters
    builtins.set('area', { type: 'builtin', call: (args) => {
      const points = args[0];
      if (!Array.isArray(points) || points.length < 3) return 0;
      const toRad = d => d * Math.PI / 180;
      const R = 6371000;
      let area = 0;
      const n = points.length;
      for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
        const lng1 = Array.isArray(p1) ? p1[1] : p1.lng;
        const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
        const lng2 = Array.isArray(p2) ? p2[1] : p2.lng;
        area += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
      }
      return Math.abs(area * R * R / 2);
    }});

    // length(points) - calculates polyline length in meters
    builtins.set('length', { type: 'builtin', call: (args) => {
      const points = args[0];
      if (!Array.isArray(points) || points.length < 2) return 0;
      let total = 0;
      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
        const lng1 = Array.isArray(p1) ? p1[1] : p1.lng;
        const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
        const lng2 = Array.isArray(p2) ? p2[1] : p2.lng;
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
        total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
      return total;
    }});

    // centroid(points) - calculates center of polygon
    builtins.set('centroid', { type: 'builtin', call: (args) => {
      const points = args[0];
      if (!Array.isArray(points) || points.length === 0) return { lat: 0, lng: 0 };
      let latSum = 0, lngSum = 0;
      for (const p of points) {
        const lat = Array.isArray(p) ? p[0] : p.lat;
        const lng = Array.isArray(p) ? p[1] : p.lng;
        latSum += lat;
        lngSum += lng;
      }
      return { lat: latSum / points.length, lng: lngSum / points.length };
    }});

    // isPointInPolygon(lat, lng, points)
    builtins.set('isPointInPolygon', { type: 'builtin', call: (args) => {
      const [lat, lng, points] = args;
      if (!Array.isArray(points) || points.length < 3) return false;
      let inside = false;
      const n = points.length;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = Array.isArray(points[i]) ? points[i][1] : points[i].lng;
        const yi = Array.isArray(points[i]) ? points[i][0] : points[i].lat;
        const xj = Array.isArray(points[j]) ? points[j][1] : points[j].lng;
        const yj = Array.isArray(points[j]) ? points[j][0] : points[j].lat;
        if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
      return inside;
    }});

    // simplify(points, tolerance) - Douglas-Peucker simplification
    builtins.set('simplify', { type: 'builtin', call: (args) => {
      const [points, tolerance] = args;
      if (!Array.isArray(points) || points.length < 3) return points;
      const tol = tolerance || 0.00001;
      
      function sqDist(p1, p2) {
        const dx = (Array.isArray(p1) ? p1[1] : p1.lng) - (Array.isArray(p2) ? p2[1] : p2.lng);
        const dy = (Array.isArray(p1) ? p1[0] : p1.lat) - (Array.isArray(p2) ? p2[0] : p2.lat);
        return dx * dx + dy * dy;
      }
      
      function sqDistToSegment(p, p1, p2) {
        let x = Array.isArray(p1) ? p1[1] : p1.lng;
        let y = Array.isArray(p1) ? p1[0] : p1.lat;
        let dx = (Array.isArray(p2) ? p2[1] : p2.lng) - x;
        let dy = (Array.isArray(p2) ? p2[0] : p2.lat) - y;
        if (dx !== 0 || dy !== 0) {
          const t = Math.max(0, Math.min(1, (((Array.isArray(p) ? p[1] : p.lng) - x) * dx + ((Array.isArray(p) ? p[0] : p.lat) - y) * dy) / (dx * dx + dy * dy)));
          x += dx * t;
          y += dy * t;
        }
        dx = (Array.isArray(p) ? p[1] : p.lng) - x;
        dy = (Array.isArray(p) ? p[0] : p.lat) - y;
        return dx * dx + dy * dy;
      }
      
      function simplifyDP(pts, sqTol, first, last, simplified) {
        let maxSqDist = sqTol;
        let index = 0;
        for (let i = first + 1; i < last; i++) {
          const sqDist = sqDistToSegment(pts[i], pts[first], pts[last]);
          if (sqDist > maxSqDist) {
            index = i;
            maxSqDist = sqDist;
          }
        }
        if (maxSqDist > sqTol) {
          if (index - first > 1) simplifyDP(pts, sqTol, first, index, simplified);
          simplified.push(pts[index]);
          if (last - index > 1) simplifyDP(pts, sqTol, index, last, simplified);
        }
      }
      
      const sqTol = tol * tol;
      const last = points.length - 1;
      const simplified = [points[0]];
      simplifyDP(points, sqTol, 0, last, simplified);
      simplified.push(points[last]);
      return simplified;
    }});

    // interpolateAlong(points, fraction) - get point at fraction along polyline
    builtins.set('interpolateAlong', { type: 'builtin', call: (args) => {
      const [points, fraction] = args;
      if (!Array.isArray(points) || points.length < 2) return null;
      if (fraction <= 0) {
        const p = points[0];
        return { lat: Array.isArray(p) ? p[0] : p.lat, lng: Array.isArray(p) ? p[1] : p.lng };
      }
      if (fraction >= 1) {
        const p = points[points.length - 1];
        return { lat: Array.isArray(p) ? p[0] : p.lat, lng: Array.isArray(p) ? p[1] : p.lng };
      }
      
      // Calculate total length
      const segments = [];
      let totalLen = 0;
      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
        const lng1 = Array.isArray(p1) ? p1[1] : p1.lng;
        const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
        const lng2 = Array.isArray(p2) ? p2[1] : p2.lng;
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
        const len = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        segments.push({ p1: { lat: lat1, lng: lng1 }, p2: { lat: lat2, lng: lng2 }, len });
        totalLen += len;
      }
      
      const targetLen = fraction * totalLen;
      let accLen = 0;
      for (const seg of segments) {
        if (accLen + seg.len >= targetLen) {
          const segFrac = (targetLen - accLen) / seg.len;
          return {
            lat: seg.p1.lat + (seg.p2.lat - seg.p1.lat) * segFrac,
            lng: seg.p1.lng + (seg.p2.lng - seg.p1.lng) * segFrac
          };
        }
        accLen += seg.len;
      }
      
      const last = points[points.length - 1];
      return { lat: Array.isArray(last) ? last[0] : last.lat, lng: Array.isArray(last) ? last[1] : last.lng };
    }});

    // wrapLng(lng) - wraps longitude to -180 to 180
    builtins.set('wrapLng', { type: 'builtin', call: (args) => {
      let lng = args[0];
      while (lng > 180) lng -= 360;
      while (lng < -180) lng += 360;
      return lng;
    }});

    // wrapLat(lat) - clamps latitude to -90 to 90
    builtins.set('wrapLat', { type: 'builtin', call: (args) => {
      return Math.max(-90, Math.min(90, args[0]));
    }});

    // degreesToDMS(degrees) - convert decimal degrees to DMS string
    builtins.set('degreesToDMS', { type: 'builtin', call: (args) => {
      const deg = args[0];
      const d = Math.floor(Math.abs(deg));
      const m = Math.floor((Math.abs(deg) - d) * 60);
      const s = ((Math.abs(deg) - d - m / 60) * 3600).toFixed(2);
      return `${d}° ${m}' ${s}"`;
    }});

    // DMSToDegrees(d, m, s) - convert DMS to decimal degrees
    builtins.set('DMSToDegrees', { type: 'builtin', call: (args) => {
      const [d, m, s] = args;
      return d + m / 60 + s / 3600;
    }});

    // metersToPixels(map, meters, lat)
    builtins.set('metersToPixels', { type: 'builtin', call: (args) => {
      const [mapObj, meters, lat] = args;
      if (mapObj?._map && hasLeaflet()) {
        const zoom = mapObj._map.getZoom();
        const metersPerPixel = 40075016.686 * Math.abs(Math.cos(lat * Math.PI / 180)) / Math.pow(2, zoom + 8);
        return meters / metersPerPixel;
      }
      return 0;
    }});

    // pixelsToMeters(map, pixels, lat)
    builtins.set('pixelsToMeters', { type: 'builtin', call: (args) => {
      const [mapObj, pixels, lat] = args;
      if (mapObj?._map && hasLeaflet()) {
        const zoom = mapObj._map.getZoom();
        const metersPerPixel = 40075016.686 * Math.abs(Math.cos(lat * Math.PI / 180)) / Math.pow(2, zoom + 8);
        return pixels * metersPerPixel;
      }
      return 0;
    }});

    // getLayerType(layer)
    builtins.set('getLayerType', { type: 'builtin', call: (args) => {
      const layerObj = args[0];
      return layerObj?._leafletType || 'unknown';
    }});

    // isLayerVisible(layer)
    builtins.set('isLayerVisible', { type: 'builtin', call: (args) => {
      const layerObj = args[0];
      if (layerObj?._layer) {
        return layerObj._layer._map != null;
      }
      return false;
    }});

    // showLayer(map, layer)
    builtins.set('showLayer', { type: 'builtin', call: (args) => {
      const [mapObj, layerObj] = args;
      if (mapObj?._map && layerObj?._layer && !layerObj._layer._map) {
        layerObj._layer.addTo(mapObj._map);
      }
      return null;
    }});

    // hideLayer(map, layer)
    builtins.set('hideLayer', { type: 'builtin', call: (args) => {
      const [mapObj, layerObj] = args;
      if (mapObj?._map && layerObj?._layer && layerObj._layer._map) {
        mapObj._map.removeLayer(layerObj._layer);
      }
      return null;
    }});

    // toggleLayer(map, layer)
    builtins.set('toggleLayer', { type: 'builtin', call: (args) => {
      const [mapObj, layerObj] = args;
      if (mapObj?._map && layerObj?._layer) {
        if (layerObj._layer._map) {
          mapObj._map.removeLayer(layerObj._layer);
        } else {
          layerObj._layer.addTo(mapObj._map);
        }
      }
      return null;
    }});
  }

  // Helper to call user functions from event handlers
  callFunction(fn, args) {
    if (fn.type === 'lambda' || fn.type === 'user') {
      const funcEnv = new Environment(fn.closure || this.globalEnv);
      const params = fn.params || [];
      for (let i = 0; i < params.length; i++) {
        funcEnv.define(params[i], args[i] ?? null);
      }
      try {
        return this.execute(fn.body, funcEnv);
      } catch (e) {
        if (e instanceof ReturnException) return e.value;
        throw e;
      }
    } else if (fn.type === 'builtin') {
      return fn.call(args);
    }
    return null;
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
      case 'Program':
        return this.executeProgram(node, env);
      case 'NumberLiteral':
        return node.value;
      case 'StringLiteral':
        return node.value;
      case 'BooleanLiteral':
        return node.value;
      case 'NullLiteral':
        return null;
      case 'Identifier':
        return env.get(node.name, node.line);
      case 'SelfExpr':
        return env.get('self', node.line);
      case 'SuperExpr':
        return this.executeSuperExpr(node, env);
      case 'BinaryExpr':
        return this.executeBinary(node, env);
      case 'UnaryExpr':
        return this.executeUnary(node, env);
      case 'TernaryExpr':
        return this.executeTernary(node, env);
      case 'CallExpr':
        return this.executeCall(node, env);
      case 'IndexExpr':
        return this.executeIndex(node, env);
      case 'MemberExpr':
        return this.executeMember(node, env);
      case 'NewExpr':
        return this.executeNew(node, env);
      case 'AwaitExpr':
        return this.execute(node.expression, env);
      case 'SpawnExpr':
        return Promise.resolve(this.execute(node.expression, env));
      case 'ArrayLiteral':
        return node.elements.map(el => this.execute(el, env));
      case 'DictLiteral':
        return this.executeDict(node, env);
      case 'LambdaExpr':
        return this.executeLambda(node, env);
      case 'LetStatement':
        return this.executeLet(node, env);
      case 'AssignStatement':
        return this.executeAssign(node, env);
      case 'IndexAssignStatement':
        return this.executeIndexAssign(node, env);
      case 'MemberAssignStatement':
        return this.executeMemberAssign(node, env);
      case 'IfStatement':
        return this.executeIf(node, env);
      case 'WhileStatement':
        return this.executeWhile(node, env);
      case 'ForInStatement':
        return this.executeForIn(node, env);
      case 'FuncDeclaration':
        return this.executeFuncDecl(node, env);
      case 'AsyncFuncDeclaration':
        return this.executeAsyncFuncDecl(node, env);
      case 'EssenceDeclaration':
        return this.executeEssenceDecl(node, env);
      case 'ReturnStatement':
        return this.executeReturn(node, env);
      case 'BreakStatement':
        throw new BreakException();
      case 'ContinueStatement':
        throw new ContinueException();
      case 'TryCatchStatement':
        return this.executeTryCatch(node, env);
      case 'BlockStatement':
        return this.executeBlock(node, env);
      case 'ExpressionStatement':
        return this.execute(node.expression, env);
      case 'JsExpr':
        return this.executeJs(node, env);
      default:
        throw new SdevError(`Unknown node type: ${node.type}`, node.line || 0);
    }
  }

  executeJs(node, env) {
    // Execute raw JavaScript code and return the result
    // Supports full JS syntax: arrow functions, object literals, arrays, multiline code
    try {
      // Create a context object with sdev variables accessible
      const context = {};
      
      // Copy all environment variables to context
      let currentEnv = env;
      while (currentEnv) {
        for (const [name, value] of currentEnv.values) {
          if (!(name in context)) {
            context[name] = value;
          }
        }
        currentEnv = currentEnv.parent;
      }
      
      const code = node.code;
      
      // Detect if this is a statement block or an expression
      // Statement blocks typically start with keywords or contain multiple statements
      const trimmedCode = code.trim();
      const isStatementBlock = /^(let|const|var|if|for|while|function|class|try|switch|return)\s/.test(trimmedCode) ||
                               (trimmedCode.includes(';') && !trimmedCode.startsWith('(') && !trimmedCode.startsWith('{'));
      
      // In browser environment, use Function constructor
      if (typeof window !== 'undefined') {
        const varNames = Object.keys(context);
        const varValues = Object.values(context);
        
        let fn;
        if (isStatementBlock) {
          // For statement blocks, execute directly
          fn = new Function(...varNames, `"use strict"; ${code}`);
        } else {
          // For expressions, try to return the value
          // Handle object literals by wrapping in parentheses if needed
          let wrappedCode = code;
          if (trimmedCode.startsWith('{') && !trimmedCode.includes('=>')) {
            // Likely an object literal, not a block - wrap in parens
            wrappedCode = `(${code})`;
          }
          
          try {
            fn = new Function(...varNames, `"use strict"; return (${wrappedCode});`);
          } catch (e) {
            // If that fails, try as statement
            fn = new Function(...varNames, `"use strict"; ${code}`);
          }
        }
        
        return fn(...varValues);
      } else if (typeof global !== 'undefined') {
        // Node.js environment
        const vm = require('vm');
        const sandbox = { ...global, ...context, console, require };
        
        if (isStatementBlock) {
          return vm.runInNewContext(code, sandbox);
        } else {
          let wrappedCode = code;
          if (trimmedCode.startsWith('{') && !trimmedCode.includes('=>')) {
            wrappedCode = `(${code})`;
          }
          try {
            return vm.runInNewContext(wrappedCode, sandbox);
          } catch (e) {
            return vm.runInNewContext(code, sandbox);
          }
        }
      } else {
        // Fallback - direct eval
        return eval(code);
      }
    } catch (error) {
      throw new SdevError(`JavaScript error: ${error.message}`, node.line);
    }
  }

  executeProgram(node, env) {
    let result = null;
    for (const stmt of node.statements) {
      result = this.execute(stmt, env);
    }
    return result;
  }

  executeBinary(node, env) {
    if (node.operator === 'also') {
      const left = this.execute(node.left, env);
      if (!isTruthy(left)) return left;
      return this.execute(node.right, env);
    }
    if (node.operator === 'either') {
      const left = this.execute(node.left, env);
      if (isTruthy(left)) return left;
      return this.execute(node.right, env);
    }

    const left = this.execute(node.left, env);
    const right = this.execute(node.right, env);

    switch (node.operator) {
      case '+':
        if (typeof left === 'number' && typeof right === 'number') return left + right;
        if (typeof left === 'string' || typeof right === 'string') return stringify(left) + stringify(right);
        if (Array.isArray(left) && Array.isArray(right)) return [...left, ...right];
        if (left instanceof SdevVector2 && right instanceof SdevVector2) return left.add(right);
        throw new SdevError("Cannot use '+' with these types", node.line);
      case '-':
        if (left instanceof SdevVector2 && right instanceof SdevVector2) return left.sub(right);
        return this.requireNumbers(left, right, '-', node.line, (a, b) => a - b);
      case '*':
        if (typeof left === 'number' && typeof right === 'number') return left * right;
        if (typeof left === 'string' && typeof right === 'number') return left.repeat(right);
        if (typeof left === 'number' && typeof right === 'string') return right.repeat(left);
        if (left instanceof SdevVector2 && typeof right === 'number') return left.scale(right);
        throw new SdevError("Cannot use '*' with these types", node.line);
      case '/':
        return this.requireNumbers(left, right, '/', node.line, (a, b) => {
          if (b === 0) throw new SdevError('Division by zero', node.line);
          return a / b;
        });
      case '%':
        return this.requireNumbers(left, right, '%', node.line, (a, b) => a % b);
      case '^':
        return this.requireNumbers(left, right, '^', node.line, (a, b) => Math.pow(a, b));
      case '<':
        return this.requireNumbers(left, right, '<', node.line, (a, b) => a < b);
      case '>':
        return this.requireNumbers(left, right, '>', node.line, (a, b) => a > b);
      case '<=':
        return this.requireNumbers(left, right, '<=', node.line, (a, b) => a <= b);
      case '>=':
        return this.requireNumbers(left, right, '>=', node.line, (a, b) => a >= b);
      case 'equals':
        return this.isEqual(left, right);
      case 'differs':
      case '<>':
        return !this.isEqual(left, right);
      default:
        throw new SdevError(`Unknown operator: ${node.operator}`, node.line);
    }
  }

  executeUnary(node, env) {
    const operand = this.execute(node.operand, env);

    switch (node.operator) {
      case '-':
        if (typeof operand !== 'number') throw new SdevError("Cannot use '-' with non-number", node.line);
        return -operand;
      case 'isnt':
        return !isTruthy(operand);
      default:
        throw new SdevError(`Unknown unary operator: ${node.operator}`, node.line);
    }
  }

  executeTernary(node, env) {
    const condition = this.execute(node.condition, env);
    return isTruthy(condition) 
      ? this.execute(node.thenExpr, env) 
      : this.execute(node.elseExpr, env);
  }

  executeCall(node, env) {
    const callee = this.execute(node.callee, env);
    const args = node.args.map(arg => this.execute(arg, env));

    if (callee instanceof SdevClass) {
      const instance = new SdevInstance(callee);
      const init = callee.findMethod('init');
      if (init) {
        const bound = instance.bindMethod(init);
        bound.call(args, node.line);
      }
      return instance;
    }

    if (!callee || typeof callee !== 'object' || !('call' in callee)) {
      throw new SdevError('Cannot call non-function', node.line);
    }

    return callee.call(args, node.line);
  }

  executeIndex(node, env) {
    const obj = this.execute(node.object, env);
    const index = this.execute(node.index, env);

    if (Array.isArray(obj)) {
      const idx = index < 0 ? obj.length + index : index;
      if (idx < 0 || idx >= obj.length) throw new SdevError('List index out of bounds', node.line);
      return obj[idx];
    }

    if (typeof obj === 'string') {
      const idx = index < 0 ? obj.length + index : index;
      if (idx < 0 || idx >= obj.length) throw new SdevError('String index out of bounds', node.line);
      return obj[idx];
    }

    if (obj && typeof obj === 'object') {
      return obj[stringify(index)];
    }

    throw new SdevError('Cannot index this type', node.line);
  }

  executeMember(node, env) {
    const obj = this.execute(node.object, env);
    const prop = node.property;

    // Handle special methods for built-in types
    if (Array.isArray(obj)) {
      const listMethods = {
        length: () => obj.length,
        push: (item) => { obj.push(item); return obj; },
        pop: () => obj.pop(),
        first: () => obj[0],
        last: () => obj[obj.length - 1],
        isEmpty: () => obj.length === 0,
        reverse: () => [...obj].reverse(),
        sort: () => [...obj].sort((a, b) => a - b),
        join: (sep) => obj.join(sep ?? ','),
        includes: (item) => obj.includes(item),
        indexOf: (item) => obj.indexOf(item),
        slice: (start, end) => obj.slice(start, end),
        map: (fn) => obj.map((item, idx) => fn.call([item, idx], node.line)),
        filter: (fn) => obj.filter(item => isTruthy(fn.call([item], node.line))),
        reduce: (fn, init) => obj.reduce((acc, item) => fn.call([acc, item], node.line), init)
      };
      if (listMethods[prop]) {
        return { type: 'builtin', call: (args) => listMethods[prop](...args) };
      }
    }

    if (typeof obj === 'string') {
      const strMethods = {
        length: () => obj.length,
        upper: () => obj.toUpperCase(),
        lower: () => obj.toLowerCase(),
        trim: () => obj.trim(),
        split: (sep) => obj.split(sep ?? ''),
        chars: () => obj.split(''),
        includes: (sub) => obj.includes(sub),
        startsWith: (sub) => obj.startsWith(sub),
        endsWith: (sub) => obj.endsWith(sub),
        indexOf: (sub) => obj.indexOf(sub),
        replace: (old, newStr) => obj.replace(old, newStr),
        slice: (start, end) => obj.slice(start, end),
        repeat: (n) => obj.repeat(n)
      };
      if (strMethods[prop]) {
        return { type: 'builtin', call: (args) => strMethods[prop](...args) };
      }
    }

    if (obj instanceof SdevVector2) {
      const vecMethods = {
        x: () => obj.x, y: () => obj.y,
        add: (other) => obj.add(other),
        sub: (other) => obj.sub(other),
        scale: (s) => obj.scale(s),
        dot: (other) => obj.dot(other),
        length: () => obj.length(),
        normalize: () => obj.normalize(),
        distance: (other) => obj.distance(other),
        angle: () => obj.angle(),
        rotate: (angle) => obj.rotate(angle)
      };
      if (vecMethods[prop]) {
        return { type: 'builtin', call: (args) => vecMethods[prop](...args) };
      }
    }

    if (obj instanceof SdevSprite) {
      const spriteMethods = {
        x: () => obj.x, y: () => obj.y,
        width: () => obj.width, height: () => obj.height,
        moveTo: (x, y) => { obj.moveTo(x, y); return obj; },
        moveBy: (dx, dy) => { obj.moveBy(dx, dy); return obj; },
        rotateTo: (angle) => { obj.rotateTo(angle); return obj; },
        rotateBy: (angle) => { obj.rotateBy(angle); return obj; },
        scaleTo: (sx, sy) => { obj.scaleTo(sx, sy); return obj; },
        show: () => { obj.visible = true; return obj; },
        hide: () => { obj.visible = false; return obj; },
        setColor: (color) => { obj.color = color; return obj; }
      };
      if (spriteMethods[prop]) {
        return { type: 'builtin', call: (args) => spriteMethods[prop](...args) };
      }
    }

    // Data structure methods
    if (obj instanceof SdevSet) {
      const setMethods = {
        add: (item) => obj.add(item),
        remove: (item) => obj.remove(item),
        has: (item) => obj.has(item),
        size: () => obj.size(),
        toList: () => obj.toList(),
        union: (other) => obj.union(other),
        intersect: (other) => obj.intersect(other)
      };
      if (setMethods[prop]) return { type: 'builtin', call: (args) => setMethods[prop](...args) };
    }

    if (obj instanceof SdevMap) {
      const mapMethods = {
        set: (k, v) => obj.set(k, v),
        get: (k) => obj.get(k),
        has: (k) => obj.has(k),
        remove: (k) => obj.remove(k),
        keys: () => obj.keys(),
        values: () => obj.values(),
        size: () => obj.size()
      };
      if (mapMethods[prop]) return { type: 'builtin', call: (args) => mapMethods[prop](...args) };
    }

    if (obj instanceof SdevQueue) {
      const queueMethods = {
        enqueue: (item) => obj.enqueue(item),
        dequeue: () => obj.dequeue(),
        peek: () => obj.peek(),
        isEmpty: () => obj.isEmpty(),
        size: () => obj.size()
      };
      if (queueMethods[prop]) return { type: 'builtin', call: (args) => queueMethods[prop](...args) };
    }

    if (obj instanceof SdevStack) {
      const stackMethods = {
        push: (item) => obj.push(item),
        pop: () => obj.pop(),
        peek: () => obj.peek(),
        isEmpty: () => obj.isEmpty(),
        size: () => obj.size()
      };
      if (stackMethods[prop]) return { type: 'builtin', call: (args) => stackMethods[prop](...args) };
    }

    if (obj instanceof SdevLinkedList) {
      const llMethods = {
        append: (val) => obj.append(val),
        prepend: (val) => obj.prepend(val),
        removeFirst: () => obj.removeFirst(),
        toList: () => obj.toList(),
        size: () => obj.size(),
        isEmpty: () => obj.isEmpty()
      };
      if (llMethods[prop]) return { type: 'builtin', call: (args) => llMethods[prop](...args) };
    }

    if (obj instanceof SdevInstance) {
      return obj.get(prop, node.line);
    }

    if (obj && typeof obj === 'object') {
      return obj[prop];
    }

    throw new SdevError('Cannot access property on this type', node.line);
  }

  executeNew(node, env) {
    const klass = env.get(node.className, node.line);
    if (!(klass instanceof SdevClass)) {
      throw new SdevError(`'${node.className}' is not a class`, node.line);
    }
    const instance = new SdevInstance(klass);
    const init = klass.findMethod('init');
    if (init) {
      const args = node.args.map(arg => this.execute(arg, env));
      const bound = instance.bindMethod(init);
      bound.call(args, node.line);
    }
    return instance;
  }

  executeSuperExpr(node, env) {
    const instance = env.get('self', node.line);
    if (!(instance instanceof SdevInstance)) {
      throw new SdevError("'super' outside of class method", node.line);
    }
    const parentClass = instance.klass.parent;
    if (!parentClass) {
      throw new SdevError('No parent class', node.line);
    }
    const method = parentClass.findMethod(node.method);
    if (!method) {
      throw new SdevError(`Undefined method '${node.method}' in parent class`, node.line);
    }
    return instance.bindMethod(method);
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
    const self = this;
    return {
      type: 'lambda',
      call: (args, callLine) => {
        const lambdaEnv = new Environment(env);
        for (let i = 0; i < node.params.length; i++) {
          lambdaEnv.define(node.params[i], args[i] ?? null);
        }
        return self.execute(node.body, lambdaEnv);
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
      const idx = index < 0 ? obj.length + index : index;
      obj[idx] = value;
      return value;
    }

    if (obj && typeof obj === 'object') {
      obj[stringify(index)] = value;
      return value;
    }

    throw new SdevError('Cannot assign to index of this type', node.line);
  }

  executeMemberAssign(node, env) {
    const obj = this.execute(node.object, env);
    const value = this.execute(node.value, env);

    if (obj instanceof SdevInstance) {
      obj.set(node.property, value);
      return value;
    }

    if (obj instanceof SdevSprite) {
      obj[node.property] = value;
      return value;
    }

    if (obj && typeof obj === 'object') {
      obj[node.property] = value;
      return value;
    }

    throw new SdevError('Cannot assign to property of this type', node.line);
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
    const maxIterations = 100000;
    
    while (isTruthy(this.execute(node.condition, env))) {
      try {
        result = this.execute(node.body, env);
      } catch (e) {
        if (e instanceof BreakException) break;
        if (e instanceof ContinueException) continue;
        throw e;
      }
      iterations++;
      if (iterations > maxIterations) {
        throw new SdevError('Maximum loop iterations exceeded (possible infinite loop)', node.line);
      }
    }
    
    return result;
  }

  executeForIn(node, env) {
    const iterable = this.execute(node.iterable, env);
    let result = null;

    if (!Array.isArray(iterable) && typeof iterable !== 'string') {
      throw new SdevError('Can only iterate over lists or strings', node.line);
    }

    const items = Array.isArray(iterable) ? iterable : iterable.split('');
    
    for (const item of items) {
      const loopEnv = new Environment(env);
      loopEnv.define(node.varName, item);
      
      try {
        result = this.execute(node.body, loopEnv);
      } catch (e) {
        if (e instanceof BreakException) break;
        if (e instanceof ContinueException) continue;
        throw e;
      }
    }

    return result;
  }

  executeFuncDecl(node, env) {
    const self = this;
    const func = {
      type: 'user',
      call: (args, callLine) => {
        const funcEnv = new Environment(env);
        for (let i = 0; i < node.params.length; i++) {
          const defaultVal = node.defaults && node.defaults[i] !== undefined
            ? self.execute(node.defaults[i], env)
            : null;
          funcEnv.define(node.params[i], args[i] !== undefined ? args[i] : defaultVal);
        }

        try {
          self.execute(node.body, funcEnv);
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

  executeAsyncFuncDecl(node, env) {
    const self = this;
    const func = {
      type: 'async',
      call: async (args, callLine) => {
        const funcEnv = new Environment(env);
        for (let i = 0; i < node.params.length; i++) {
          funcEnv.define(node.params[i], args[i] ?? null);
        }

        try {
          await self.execute(node.body, funcEnv);
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

  executeEssenceDecl(node, env) {
    let parentClass = null;
    if (node.parent) {
      parentClass = env.get(node.parent, node.line);
      if (!(parentClass instanceof SdevClass)) {
        throw new SdevError(`'${node.parent}' is not a class`, node.line);
      }
    }

    const methods = new Map();
    const self = this;

    for (const method of node.methods) {
      methods.set(method.name, {
        type: 'method',
        call: (args, callLine) => {
          const instance = args[0];
          const methodArgs = args.slice(1);
          const methodEnv = new Environment(env);
          methodEnv.define('self', instance);

          for (let i = 0; i < method.params.length; i++) {
            methodEnv.define(method.params[i], methodArgs[i] ?? null);
          }

          try {
            self.execute(method.body, methodEnv);
            return null;
          } catch (e) {
            if (e instanceof ReturnException) {
              return e.value;
            }
            throw e;
          }
        }
      });
    }

    const klass = new SdevClass(node.name, parentClass, methods);
    env.define(node.name, klass);
  }

  executeReturn(node, env) {
    const value = node.value ? this.execute(node.value, env) : null;
    throw new ReturnException(value);
  }

  executeTryCatch(node, env) {
    try {
      return this.execute(node.tryBlock, env);
    } catch (e) {
      if (e instanceof ReturnException || e instanceof BreakException || e instanceof ContinueException) {
        throw e;
      }
      if (node.catchBlock) {
        const catchEnv = new Environment(env);
        if (node.catchVar) {
          catchEnv.define(node.catchVar, e.message || String(e));
        }
        return this.execute(node.catchBlock, catchEnv);
      }
      return null;
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
    if (typeof left !== 'number' || typeof right !== 'number') {
      throw new SdevError(`Cannot use '${op}' with non-numbers`, line);
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
    if (a instanceof SdevVector2 && b instanceof SdevVector2) {
      return a.x === b.x && a.y === b.y;
    }
    return a === b;
  }

  getGraphicsCommands() {
    return this.graphicsCommands;
  }

  resetGraphics() {
    this.graphicsCommands = [];
    this.turtleState = { x: 200, y: 200, angle: 0, penDown: true, color: '#ffffff', width: 2 };
  }

  run(source) {
    this.resetGraphics();
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return this.interpret(ast);
  }
}

// ============= HELPER FUNCTIONS =============
function stringify(value) {
  if (value === null || value === undefined) return 'void';
  if (typeof value === 'boolean') return value ? 'yep' : 'nope';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return '[' + value.map(stringify).join(', ') + ']';
  }
  if (value instanceof SdevVector2) return value.toString();
  if (value instanceof SdevSprite) return value.toString();
  if (value instanceof SdevInstance) return value.toString();
  if (value instanceof SdevClass) return value.toString();
  if (value instanceof SdevSet) return value.toString();
  if (value instanceof SdevMap) return value.toString();
  if (value instanceof SdevQueue) return value.toString();
  if (value instanceof SdevStack) return value.toString();
  if (value instanceof SdevLinkedList) return value.toString();
  if (typeof value === 'object') {
    if (value.type === 'builtin' || value.type === 'user' || value.type === 'lambda' || value.type === 'method') {
      return '<conjuration>';
    }
    const entries = Object.entries(value)
      .map(([k, v]) => `${k}: ${stringify(v)}`)
      .join(', ');
    return ':: ' + entries + ' ;;';
  }
  return String(value);
}

function isTruthy(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

// ============= MAIN (for Node.js CLI usage) =============
if (typeof process !== 'undefined' && process.argv) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    const fs = require('fs');
    const filename = args[0];
    
    try {
      const code = fs.readFileSync(filename, 'utf8');
      const interpreter = new Interpreter(console.log);
      interpreter.run(code);
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.error(`Error: File not found: ${filename}`);
      } else if (e instanceof SdevError) {
        console.error(`Error: ${e.message}`);
      } else {
        console.error(`Error: ${e.message}`);
      }
      process.exit(1);
    }
  }
}

// ============= EXPORTS =============
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Interpreter,
    Lexer,
    Parser,
    Environment,
    SdevError,
    SdevClass,
    SdevInstance,
    SdevVector2,
    SdevSprite,
    SdevSet,
    SdevMap,
    SdevQueue,
    SdevStack,
    SdevLinkedList,
    stringify,
    isTruthy
  };
}

// For browser usage
if (typeof window !== 'undefined') {
  window.SdevInterpreter = Interpreter;
  window.SdevLexer = Lexer;
  window.SdevParser = Parser;
  
  // Leaflet integration helper
  window.SdevLeaflet = {
    version: '1.0.0',
    requiredLeafletVersion: '1.9.4',
    isAvailable: () => typeof L !== 'undefined',
    init: (containerId, lat, lng, zoom) => {
      if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded. Include Leaflet CSS and JS before using sdev maps.');
        return null;
      }
      const interpreter = new Interpreter();
      return interpreter.run(`createMap("${containerId}", ${lat}, ${lng}, ${zoom})`);
    }
  };
}
