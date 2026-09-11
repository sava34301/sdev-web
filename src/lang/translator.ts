/**
 * sdev built-in language translator
 * ------------------------------------------------------------
 * This module is part of the language CORE — it lives next to
 * the lexer/parser/interpreter so that EVERY entry point that
 * runs sdev (interpreter, compiler, VM, REPL, IDE, playground,
 * Python embedding, edge function, future CLI) automatically
 * supports writing sdev in 26+ human languages.
 *
 * Translation is purely deterministic and SYNCHRONOUS — it uses
 * hard-coded keyword maps and word-boundary regex replacement.
 * No network, no AI, no async. Safe to run on every tokenize().
 *
 * Multi-word phrases (e.g. "otherwise ponder", "da_bъde") are
 * supported via underscore-joined keys in the keyword tables.
 */
import { V1_TO_V2, V2_EXTRA, TAG_TO_LANGUAGE } from './translator-v2';

// ============================================================
// Keyword tables — foreign word → canonical English sdev keyword
// ============================================================

export const KEYWORD_TABLES: Record<string, Record<string, string>> = {
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
    "структура": "essence", "есенция": "essence", "есенция_на": "essence",
    // extend — inherit
    "разшири": "extend", "разширяване": "extend", "наследи": "extend",
    "наследяване": "extend", "произлиза": "extend",
    // self / super
    "себе_си": "self", "себе": "self", "този": "self", "тази": "self",
    "родител": "super", "родителят": "super", "наследник": "super", "баща": "super",
    // new — instantiate
    "нов": "new", "ново": "new", "нова": "new", "създай_нов": "new", "инстанция": "new",
    // init — constructor method name (not a keyword, but the runtime looks for `init`)
    "инит": "init", "конструктор": "init", "създаване_на": "init", "начало": "init",
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

// Canonical English sdev keywords — never translated, never replaced.
export const ENGLISH_KEYWORDS = new Set([
  'forge', 'be', 'conjure', 'yield', 'ponder', 'otherwise', 'cycle',
  'iterate', 'through', 'within', 'yeet', 'skip', 'speak', 'essence',
  'extend', 'self', 'super', 'new', 'attempt', 'rescue', 'also',
  'either', 'isnt', 'equals', 'differs', 'yep', 'nope', 'void',
  'summon', 'async', 'await', 'spawn',
]);

export const SUPPORTED_LANGUAGES = Object.keys(KEYWORD_TABLES);

// ============================================================
// Surface targets — classic (v1) vs canonical sdev v2
// ============================================================

export type TranslationTarget = 'v1' | 'v2';

const EFFECTIVE_TABLES: Record<string, Record<string, string>> = {};

/**
 * The keyword table actually used for a language + surface.
 * v2 = every v1 entry mapped through V1_TO_V2, plus the v2-only extras.
 */
export function effectiveTable(lang: string, target: TranslationTarget = 'v1'): Record<string, string> | null {
  const base = KEYWORD_TABLES[lang];
  if (!base) return null;
  if (target === 'v1') return base;
  const key = `${lang}|v2`;
  if (EFFECTIVE_TABLES[key]) return EFFECTIVE_TABLES[key];
  const table: Record<string, string> = {};
  for (const [foreign, canonical] of Object.entries(base)) {
    table[foreign] = V1_TO_V2[canonical] ?? canonical;
  }
  Object.assign(table, V2_EXTRA[lang] ?? {});
  EFFECTIVE_TABLES[key] = table;
  return table;
}

// ============================================================
// Multi-word phrase normalization
// ------------------------------------------------------------
// Some keywords are space-separated phrases (e.g. "в противен случай").
// We translate them to underscore form (e.g. "в_противен_случай")
// before single-word replacement runs.
// ============================================================

const PHRASE_NORMALIZATIONS: Record<string, [RegExp, string][]> = {};
function buildPhraseNormalizations(lang: string, target: TranslationTarget = 'v1'): [RegExp, string][] {
  const key = `${lang}|${target}`;
  if (PHRASE_NORMALIZATIONS[key]) return PHRASE_NORMALIZATIONS[key];
  const table = effectiveTable(lang, target);
  if (!table) return (PHRASE_NORMALIZATIONS[key] = []);
  const phrases = Object.keys(table).filter(k => k.includes('_'));
  // Convert "в_противен_случай" → matcher for "в противен случай"
  const result: [RegExp, string][] = phrases.map(p => {
    const spaced = p.replace(/_/g, '\\s+');
    // Use Unicode-aware lookarounds — match if not surrounded by word chars.
    // Negative lookarounds prevent partial-word matches inside identifiers.
    return [new RegExp(`(^|[^\\p{L}\\p{N}_])${spaced}(?=$|[^\\p{L}\\p{N}_])`, 'gu'), `$1${p}`];
  });
  PHRASE_NORMALIZATIONS[lang] = result;
  return result;
}

// ============================================================
// Compiled per-language word→word replacer
// ============================================================

const COMPILED_REPLACERS: Record<string, (s: string) => string> = {};

function compileReplacer(lang: string): (s: string) => string {
  if (COMPILED_REPLACERS[lang]) return COMPILED_REPLACERS[lang];
  const table = KEYWORD_TABLES[lang];
  if (!table) return (COMPILED_REPLACERS[lang] = (s) => s);

  // Sort by length DESC to avoid prefix-collision (e.g. "не" before "не_е").
  const entries = Object.entries(table).sort((a, b) => b[0].length - a[0].length);

  // Escape regex metacharacters — Cyrillic/CJK/etc letters are safe.
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Build one big alternation regex with Unicode word-boundary lookarounds.
  const pattern = entries.map(([k]) => escape(k)).join('|');
  if (!pattern) return (COMPILED_REPLACERS[lang] = (s) => s);

  // (^|non-word)(KEYWORD)(?=$|non-word)
  // \p{L} covers letters in any script; \p{N} numbers. Underscore is also "word".
  const re = new RegExp(`(^|[^\\p{L}\\p{N}_])(${pattern})(?=$|[^\\p{L}\\p{N}_])`, 'gu');
  const map = new Map(entries);

  const fn = (src: string): string => {
    return src.replace(re, (_m, pre: string, word: string) => {
      const repl = map.get(word) ?? word;
      return pre + repl;
    });
  };
  COMPILED_REPLACERS[lang] = fn;
  return fn;
}

// ============================================================
// String-aware splitter — never translate inside string literals
// or comments. Preserves original text byte-for-byte.
// ============================================================

interface Segment { code: boolean; text: string; }

function segmentSource(source: string): Segment[] {
  const segs: Segment[] = [];
  let i = 0;
  let buf = '';
  const flush = (code: boolean) => { if (buf) { segs.push({ code, text: buf }); buf = ''; } };

  while (i < source.length) {
    const c = source[i];
    // Line comments  // ...   or  # ...
    if ((c === '/' && source[i + 1] === '/') || c === '#') {
      flush(true);
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      segs.push({ code: false, text: source.slice(i, stop) });
      i = stop;
      continue;
    }
    // Strings: " ' `
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
      i = j;
      continue;
    }
    buf += c;
    i++;
  }
  flush(true);
  return segs;
}

// ============================================================
// Public API
// ============================================================

/** Returns true if `code` contains non-ASCII chars (likely foreign script). */
export function hasNonAscii(code: string): boolean {
  return /[^\x00-\x7F]/.test(code);
}

/**
 * Auto-detect the source language by counting keyword hits per table.
 * Returns the language name (e.g. "Bulgarian") or null when unsure /
 * code is already English sdev.
 */
export function detectLanguage(source: string): string | null {
  // Quick English check — if it parses as English sdev keywords, skip detection.
  const englishHits = (source.match(/\b(forge|be|conjure|ponder|cycle|speak|yield)\b/g) || []).length;

  let bestLang: string | null = null;
  let bestScore = 0;

  for (const lang of SUPPORTED_LANGUAGES) {
    const table = KEYWORD_TABLES[lang];
    let score = 0;
    for (const word of Object.keys(table)) {
      // Cheap substring count — good enough for heuristic detection.
      if (source.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  // Require at least 2 hits AND beat English signal.
  if (bestScore >= 2 && bestScore > englishHits) return bestLang;
  return null;
}

/**
 * Translate sdev source code from a given (or auto-detected) language
 * to canonical English sdev. Synchronous, deterministic, network-free.
 *
 *   - sourceLanguage: explicit language name, "auto" (detect), or
 *                     "English"/null (no-op).
 *   - Strings and comments are never modified.
 *   - Identifiers that are not keywords are left untouched.
 */
export function translateSource(
  source: string,
  sourceLanguage: string | null = 'auto'
): { translated: string; detectedLanguage: string | null } {
  if (!source) return { translated: source, detectedLanguage: null };

  let lang = sourceLanguage;
  if (lang === 'English') return { translated: source, detectedLanguage: 'English' };
  if (!lang || lang === 'auto') {
    // Skip entirely if pure ASCII AND no obvious foreign-language hits.
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
  const translated = segments
    .map(seg => {
      if (!seg.code) return seg.text;
      let t = seg.text;
      // First normalize multi-word phrases to underscore form.
      for (const [re, repl] of phraseNorms) {
        t = t.replace(re, repl);
      }
      // Then exact word-by-word replacement.
      t = replace(t);
      // Finally, fuzzy match anything that looks like an unconverted foreign keyword.
      t = fuzzy(t);
      // Context fix: `forge name(` is really a method/function declaration in
      // most natural languages where "create" covers both vars and functions
      // (e.g. Bulgarian `създай`). Rewrite to `conjure name(`.
      t = t.replace(
        /\bforge(\s+[\p{L}_][\p{L}\p{N}_]*\s*\()/gu,
        'conjure$1'
      );
      return t;
    })
    .join('');

  return { translated, detectedLanguage: lang };
}

// ============================================================
// Fuzzy matching — catches typos, conjugations, and synonyms
// the strict dictionary missed. Uses Levenshtein distance.
// ============================================================

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  // Single-row DP for memory efficiency.
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

const FUZZY_REPLACERS: Record<string, (s: string) => string> = {};

function compileFuzzyReplacer(lang: string): (s: string) => string {
  if (FUZZY_REPLACERS[lang]) return FUZZY_REPLACERS[lang];
  const table = KEYWORD_TABLES[lang];
  if (!table) return (FUZZY_REPLACERS[lang] = (s) => s);

  // Precompute keyword keys (only non-phrase, length ≥ 3 to avoid false positives).
  const keys = Object.keys(table).filter(k => !k.includes('_') && [...k].length >= 3);
  const keysByFirstChar = new Map<string, string[]>();
  for (const k of keys) {
    const c = k[0].toLowerCase();
    if (!keysByFirstChar.has(c)) keysByFirstChar.set(c, []);
    keysByFirstChar.get(c)!.push(k);
  }

  // Match runs of Unicode letters (any script). Skip pure-ASCII (already English).
  const wordRe = /[\p{L}][\p{L}\p{N}_]*/gu;

  // Words that introduce an identifier as their next token — we must NOT
  // fuzzy-translate the following word, otherwise variable names like
  // `съобщение` get rewritten to `speak`.
  const IDENT_INTRODUCERS = new Set([
    'forge', 'be', 'new', 'essence', 'conjure', 'extend', 'summon', 'within',
  ]);

  const fn = (src: string): string => {
    // Track the previous emitted token (post-translation) so we know whether
    // the current word is in identifier position.
    let prevToken = '';
    return src.replace(wordRe, (word, offset) => {
      // Skip pure ASCII — those are real identifiers or already-English keywords.
      if (/^[\x00-\x7F]+$/.test(word)) {
        prevToken = word.toLowerCase();
        return word;
      }
      // Skip if exact match already in table (handled by strict pass — but be safe).
      const lower = word.toLowerCase();
      if (table[lower]) {
        const out = table[lower];
        prevToken = out;
        return out;
      }

      // Identifier-position guard — leave the word as a user identifier.
      // Also skip when the previous char is `.` (member access).
      const prevChar = offset > 0 ? src[offset - 1] : '';
      if (prevChar === '.' || IDENT_INTRODUCERS.has(prevToken)) {
        prevToken = lower;
        return word;
      }

      // Conservative threshold: only swap on very close matches.
      // ≤1 edit for 4-5 char words, ≤2 for 6+. Never for <4.
      if ([...lower].length < 4) {
        prevToken = lower;
        return word;
      }
      const threshold = [...lower].length >= 6 ? 2 : 1;

      const candidates = keysByFirstChar.get(lower[0]) ?? [];
      let best: { key: string; dist: number } | null = null;
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
