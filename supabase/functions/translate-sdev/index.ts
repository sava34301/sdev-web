import { requireUser } from '../_shared/auth.ts';
import { aiKey, aiUrl, aiHeaders, aiModel, usingOwnProvider, AI_NOT_CONFIGURED } from '../_shared/ai.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// Explicit keyword mapping tables for every supported language
// These give the AI exact references for translation
// ═══════════════════════════════════════════════════════════════

const KEYWORD_TABLES: Record<string, Record<string, string>> = {
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
    "mientras": "cycle", "para": "iterate", "si": "ponder", "sino_si": "otherwise ponder",
    "romper": "yeet", "continuar": "skip", "y": "also", "importar": "summon",
    "función": "conjure", "crear": "new",
  },
  French: {
    "forger": "forge", "être": "be", "est": "be", "évoquer": "conjure",
    "rendre": "yield", "retourner": "yield", "réfléchir": "ponder", "si": "ponder",
    "sinon": "otherwise", "boucle": "cycle", "tantque": "cycle", "itérer": "iterate",
    "pour": "iterate", "à_travers": "through", "dans": "within", "jeter": "yeet",
    "sauter": "skip", "parler": "speak", "dire": "speak", "afficher": "speak",
    "essence": "essence", "classe": "essence", "étendre": "extend", "soi": "self",
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
    "durch": "through", "innerhalb": "within", "in": "within",
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
    "단조": "forge", "만들다": "forge", "이다": "be", "는": "be",
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
    "और": "also", "या": "either", 
    "बराबर": "equals", "भिन्न": "differs", "हां": "yep",
    "सत्य": "yep", "नहीं": "nope", "असत्य": "nope",
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
     "funkcja": "conjure", "zwróć": "yield",
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
    "albo": "either",  "równe": "equals",
    "różni": "differs", "tak": "yep", "prawda": "yep",
    "nie": "nope", "fałsz": "nope", "pusty": "void",
    "przywołaj": "summon", "importuj": "summon",
    "asynchroniczny": "async", "czekaj": "await", "stwórz": "spawn",
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
    "tai": "either",  "yhtäsuuri": "equals",
    "eroaa": "differs", "kyllä": "yep", "tosi": "yep",
    "ei": "nope", "epätosi": "nope", "tyhjä": "void",
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
    "ו": "also", "או": "either", 
    "שווה": "equals", "שונה": "differs", "כן": "yep",
    "אמת": "yep", "לא": "nope", "שקר": "nope",
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
    "vagy": "either",  "egyenlő": "equals",
    "különbözik": "differs", "igen": "yep", "igaz": "yep",
    "nem": "nope", "hamis": "nope", "üres": "void",
    "behív": "summon", "importál": "summon", "aszinkron": "async",
    "vár": "await", "indít": "spawn",
  },
  Bulgarian: {
    "изкова": "forge", "създай": "forge", "направи": "forge",
    "нека": "forge", "бъде": "be",  "е": "be",
     
    "извикай": "conjure", "функция": "conjure",
    "върни": "yield", "обмисли": "ponder", "ако": "ponder",
    "иначе": "otherwise", "в_противен_случай": "otherwise",
    "цикъл": "cycle", "докато": "cycle",
    "обходи": "iterate", "за": "iterate",
    "през": "through", "вътре": "within", "в": "within",
    "хвърли": "yeet", "прескочи": "skip",
    "кажи": "speak", "изкрещи": "speak", "покажи": "speak",
    "изведи": "speak", "отпечатай": "speak", "изпиши": "speak",
    "същност": "essence", "клас": "essence",
    "разшири": "extend", "себе_си": "self", "родител": "super",
    "нов": "new", "ново": "new", "нова": "new",
    "опитай": "attempt", "спаси": "rescue", "хвани": "rescue",
    "също": "also", "и": "also", "или": "either",
    "не_е": "isnt", "равно": "equals", "различно": "differs",
    "да": "yep", "вярно": "yep", "истина": "yep",
    "не": "nope", "невярно": "nope", "лъжа": "nope",
    "празно": "void", "нищо": "void",
    "призови": "summon", "импортирай": "summon",
    "асинхронен": "async", "изчакай": "await", "породи": "spawn",
    // Common multi-word patterns
    "да_бъде": "be", "да_е": "be",
  },
};

// Also list all built-in function names that should NOT be translated
const BUILTIN_FUNCTIONS = [
  "speak", "whisper", "yell", "measure", "gather", "pluck", "peek",
  "shift", "find", "locate", "contains", "fuse", "shatter", "snip",
  "swap", "mirror", "trim", "upper", "lower", "startsWith", "endsWith",
  "flatten", "unique", "sort", "count", "range", "zip", "unzip",
  "enumerate", "chunk", "compact", "all", "any", "none",
  "morph", "essence", "kindof", "floor", "ceil", "round", "abs",
  "sqrt", "pow", "min", "max", "random", "sin", "cos", "tan",
  "log", "log2", "log10", "exp", "sign", "clamp", "lerp",
  "PI", "E", "INF",
  "keys", "values", "entries", "merge", "remove", "has",
  "transform", "sift", "fold", "foldr", "each",
  "createSet", "createMap", "createQueue", "createStack", "createLinkedList",
  "jsonParse", "jsonStringify",
  "matmul", "transpose", "determinant", "inverse", "dot", "reshape",
  "createCanvas", "drawRect", "drawCircle", "drawLine", "drawText",
  "setColor", "setFont", "clearCanvas", "drawImage", "drawPath",
  "createTurtle", "forward", "backward", "left", "right", "penUp",
  "penDown", "setPosition", "setHeading", "setSpeed",
  "createSprite", "moveSprite", "onKeyPress", "onKeyRelease",
  "onClick", "animate", "getCanvasWidth", "getCanvasHeight",
  "setGradient", "drawPolygon", "drawArc", "drawEllipse",
  "setLineWidth", "setShadow", "setGlobalAlpha",
  "readFile", "writeFile", "appendFile", "fileExists", "deleteFile",
  "listFiles", "fetch", "httpGet", "httpPost",
  "parseInt", "parseFloat", "toString", "toNumber", "toBool",
  "type", "isNumber", "isString", "isList", "isTome", "isFunction",
  "isBool", "isVoid",
  "time", "timestamp", "delay", "uuid",
  "regexMatch", "regexReplace", "regexTest",
  "padStart", "padEnd", "repeat", "charCodeAt", "fromCharCode",
  "includes", "indexOf", "lastIndexOf", "slice",
  "push", "pop", "splice", "concat", "join", "reverse", "fill",
  "map", "filter", "reduce", "forEach", "some", "every",
  "Object", "Array", "Math", "String", "Number", "Boolean",
  "Date", "JSON", "RegExp", "Error", "Promise",
];

const SDEV_KEYWORDS_DOC = `
SDEV IS A PROGRAMMING LANGUAGE WITH THESE EXACT ENGLISH KEYWORDS:
- forge <name> be <value>        → variable declaration  
- <name> be <value>              → assignment
- conjure <name>(<params>) :: ... ;; → function declaration
- yield <value>                  → return
- ponder <cond> :: ... ;;        → if
- otherwise ponder <cond> :: ;; → else if
- otherwise :: ... ;;            → else
- cycle <cond> :: ... ;;         → while loop
- iterate <var> through <expr> :: ... ;; → for-each loop
- within <var> be <list> :: ... ;; → for-in loop
- yeet                           → break
- skip                           → continue
- speak(...)                     → print / console.log
- essence <Name> :: ... ;;       → class
- extend                         → inheritance
- self                           → this
- super                          → parent class
- new <Class>(...)               → instantiate
- attempt :: ... ;; rescue <err> :: ... ;; → try/catch
- also                           → and
- either                         → or
- isnt                           → not
- equals                         → ==
- differs                        → !=
- yep                            → true
- nope                           → false
- void                           → null
- summon "<path>"                → import
- async conjure                  → async function
- await <expr>                   → await
- spawn(fn)                      → async task
- #                              → comment (single line)
- <cond> ~ <then> : <else>       → ternary
- |>                             → pipe operator
- ::;;                           → empty dict literal
`;

function buildKeywordTablePrompt(lang: string): string {
  const table = KEYWORD_TABLES[lang];
  if (!table) return "";
  
  const lines = Object.entries(table)
    .map(([foreign, english]) => `  "${foreign}" → "${english}"`)
    .join("\n");
  
  return `\n\nEXACT KEYWORD MAPPING TABLE FOR ${lang.toUpperCase()}:\n${lines}\n\nYou MUST use these exact mappings. If a word in the code matches a key in this table, replace it with the corresponding sdev keyword. This is mandatory.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const denied = await requireUser(req, corsHeaders);
  if (denied) return denied;

  try {
    const { code, sourceLanguage: rawLang } = await req.json();
    // Language names only: letters, digits, spaces, + # . - (keeps instructions out of the system prompt)
    const sourceLanguage = typeof rawLang === "string" ? (/^[A-Za-z0-9+#. -]{1,40}$/.test(rawLang.trim()) ? rawLang.trim() : "auto") : rawLang;

    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "No code provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (code.length > 50000) {
      return new Response(JSON.stringify({ error: "Code too long (max 50000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (sourceLanguage !== undefined && sourceLanguage !== null) {
      if (typeof sourceLanguage !== "string" || sourceLanguage.length > 40) {
        return new Response(JSON.stringify({ error: "Invalid sourceLanguage" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const AI_KEY = aiKey();
    if (!AI_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langHint = sourceLanguage && sourceLanguage !== "auto"
      ? `The code is written in ${sourceLanguage}.`
      : "The code may be written in any human language.";

    const keywordTablePrompt = sourceLanguage && sourceLanguage !== "auto"
      ? buildKeywordTablePrompt(sourceLanguage)
      : "";

    const builtinsList = BUILTIN_FUNCTIONS.join(", ");

    const systemPrompt = `You are a translator for the sdev programming language. Your job is to translate sdev code written in any human language into sdev code written with ENGLISH keywords and identifiers.

${SDEV_KEYWORDS_DOC}

BUILT-IN FUNCTION NAMES (these must appear exactly as listed, never translate them):
${builtinsList}
${keywordTablePrompt}

TRANSLATION RULES — follow them strictly:
1. Translate ALL keywords to their English sdev equivalents using the mapping table above.
2. Translate variable names and function names to meaningful English equivalents (e.g. "съобщение" → "message", "nombre" → "name", "сума" → "sum").
3. Preserve the EXACT sdev syntax structure: ::, ;;, ->, |>, ~, :, etc. Do NOT change any operators or delimiters.
4. Translate comments (lines starting with #) to English.
5. Translate string literal CONTENTS to English while keeping the quotes.
6. If an identifier is already in English, leave it as-is.
7. Built-in function names (speak, measure, gather, etc.) must NEVER be changed — use them exactly as listed.
8. Do NOT add explanations, markdown code blocks, backticks, or any extra text.
9. Return ONLY the translated sdev source code, nothing else.
10. Preserve all whitespace, indentation, and line structure exactly.
11. If the code is already 100% in English sdev, return it unchanged.
12. Multi-word foreign keywords that map to a single sdev keyword should be collapsed (e.g. "да бъде" → "be", "в противен случай" → "otherwise").
13. Pay attention to the CONTEXT: a word might be a keyword in one position but an identifier in another. Use the sdev syntax rules to determine which.
14. CLASS DECLARATIONS: When you see words like "クラス", "класс", "classe", "klasse", "sınıf", "klasa", "osztály" etc. (meaning "class"), the ENTIRE class declaration must become "essence <ClassName> ::". The word for "class" becomes "essence", and the class name is the OTHER word (e.g. "動物 クラス ::" → "essence Animal ::", "Животное класс ::" → "essence Animal ::"). NEVER merge them into one word. NEVER use "forge" for class declarations.
15. Do NOT add extra words like "Class", "class", "Klasse", etc. after the class name. Just "essence ClassName ::" is correct.
16. VARIABLE DECLARATIONS: The pattern is "forge <name> be <value>" — "forge" comes first, then variable name, then "be", then value.
17. CRITICAL EXAMPLES of correct translations:
    - "動物 クラス ::" → "essence Animal ::" (NOT "forge AnimalClass ::")
    - "Животное класс ::" → "essence Animal ::" (NOT "forge Animal essence ::")
    - "classe Animal ::" → "essence Animal ::" 
    - "sınıf Hayvan ::" → "essence Animal ::"
    - "създай сума(а, б)" → "conjure sum(a, b)"
    - "кажи(х)" → "speak(x)"
    - "ако х > 5 ::" → "ponder x > 5 ::"
    - "иначе ::" → "otherwise ::"
    - "докато вярно ::" → "cycle yep ::"
    - "обходи елемент през списък ::" → "iterate element through list ::"`;


    const userPrompt = `${langHint} Please translate this sdev code to English sdev:

${code}`;

    const response = await fetch(aiUrl('/chat/completions'), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-2.5-flash"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let translated = data.choices?.[0]?.message?.content ?? "";
    
    // Strip markdown code fences if the AI wrapped the output
    translated = translated.replace(/^```(?:sdev)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    // Detect source language
    let detectedLanguage = sourceLanguage && sourceLanguage !== "auto" ? sourceLanguage : "Unknown";
    
    if (detectedLanguage === "Unknown") {
      const detectResponse = await fetch(aiUrl('/chat/completions'), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiModel("google/gemini-3.1-flash-lite", 'fast'),
          messages: [
            {
              role: "system",
              content: "You detect the human language used in source code (variable names, comments, strings). Reply with ONLY the language name in English (e.g. 'Spanish', 'French', 'English', 'Japanese'). One word only.",
            },
            { role: "user", content: code.substring(0, 500) },
          ],
          stream: false,
        }),
      });

      if (detectResponse.ok) {
        const detectData = await detectResponse.json();
        detectedLanguage = (detectData.choices?.[0]?.message?.content ?? "Unknown").trim().replace(/[.,"']/g, "");
      }
    }

    return new Response(
      JSON.stringify({ translated, detectedLanguage, original: code }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("translate-sdev error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
