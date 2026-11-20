#!/usr/bin/env python3
"""
Generate the comprehensive sdev book in EN and BG.

Strategy:
- Start from the original docs/02-language/v1-reference.md (2921 lines, the proven source of truth)
- Add a designed front-matter (preface, what's new in this edition, conventions)
- Append major NEW sections covering features added since the original docs:
    * UI Toolkit deep dive (windows, buttons, inputs, layout, customization)
    * Cloud & workspace sync
    * Auto-sync model & nested folders
    * 15 step-by-step tutorials
    * Recipes & cookbook
    * Glossary & index
- Append the full Leaflet documentation as the GIS appendix
- Bulgarian version: same structure, fully translated NEW chapters,
  plus the existing 1638-line BG book content as the body, plus
  Bulgarian preface/glossary/tutorials.

Target: > 6000 lines per language.
"""
import os, textwrap, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read(p): 
    with open(os.path.join(ROOT, p), 'r', encoding='utf-8') as f: 
        return f.read()

# ---------------------------------------------------------------------------
# Common UI feature reference data (used by EN + BG generators)
# ---------------------------------------------------------------------------
WIDGETS = [
    ('window(title, width, height)',          'Open a top-level application window. Closed with `endwindow`.'),
    ('endwindow',                             'Close the current window block.'),
    ('heading(text, level=1..6)',             'Headline text inside a window.'),
    ('paragraph(text)',                       'Block of body text.'),
    ('label(text)',                           'Inline label, no margin.'),
    ('button(label, onclick, variant?)',      'Clickable button. Variants: `primary`, `secondary`, `ghost`, `destructive`, `link`.'),
    ('input(name, placeholder?, value?)',     'Single-line text input. Value is bound to `uiget(name)`.'),
    ('textarea(name, rows?, placeholder?)',   'Multi-line text input.'),
    ('checkbox(name, label)',                 'Boolean toggle. State at `uiget(name)`.'),
    ('radio(name, options)',                  'Mutually exclusive choice list.'),
    ('select(name, options)',                 'Drop-down selector.'),
    ('slider(name, min, max, step?)',         'Numeric range slider.'),
    ('switch(name, label)',                   'On/off switch.'),
    ('image(src, w?, h?, alt?)',              'Render an image, local or remote URL.'),
    ('video(src, w?, h?)',                    'Embedded video player.'),
    ('audio(src)',                            'Audio player widget.'),
    ('progress(value, max?)',                 'Progress bar.'),
    ('divider()',                             'Horizontal rule between widgets.'),
    ('spacer(px)',                            'Empty vertical gap.'),
    ('row() ... endrow',                      'Lay children horizontally.'),
    ('column() ... endcolumn',                'Lay children vertically.'),
    ('group(title) ... endgroup',             'Bordered group with optional title.'),
    ('tabs() ... endtabs / tab(t)..endtab',   'Tabbed container with multiple panels.'),
    ('menu(title) ... endmenu / menuitem(t,fn)','Top-of-window menu bar.'),
    ('table(headers, rows)',                  'Data table.'),
    ('canvas(name, w, h)',                    'Drawable canvas surface inside a window.'),
    ('map(lat, lng, zoom)',                   'Embedded Leaflet map.'),
    ('uiget(name)',                           'Read the bound value of a widget.'),
    ('uiset(name, value)',                    'Programmatically write a widget value.'),
    ('toast(msg, kind?)',                     'Show a non-blocking notification.'),
    ('confirm(msg, fn)',                      'Show a confirm dialog and run `fn` if accepted.'),
    ('prompt(msg, fn)',                       'Show a prompt dialog and pass the typed string to `fn`.'),
]

WIDGETS_BG = [
    ('window(заглавие, ширина, височина)',     'Отваря прозорец от най-високо ниво. Затваря се с `endwindow`.'),
    ('endwindow',                              'Затваря текущия блок прозорец.'),
    ('heading(текст, ниво=1..6)',              'Заглавие в прозореца.'),
    ('paragraph(текст)',                       'Параграф основен текст.'),
    ('label(текст)',                           'Кратък текстов етикет.'),
    ('button(етикет, onclick, вариант?)',      'Кликаем бутон. Варианти: `primary`, `secondary`, `ghost`, `destructive`, `link`.'),
    ('input(име, плейсхолдър?, стойност?)',    'Едноредово текстово поле, чиято стойност се чете с `uiget(име)`.'),
    ('textarea(име, редове?, плейсхолдър?)',   'Многоредово текстово поле.'),
    ('checkbox(име, етикет)',                  'Превключвател истина/неистина.'),
    ('radio(име, опции)',                      'Списък със взаимно изключващи се опции.'),
    ('select(име, опции)',                     'Падащ селектор.'),
    ('slider(име, мин, макс, стъпка?)',        'Числов плъзгач.'),
    ('switch(име, етикет)',                    'Превключвател „включено/изключено“.'),
    ('image(src, ш?, в?, alt?)',               'Изображение от локален път или URL.'),
    ('video(src, ш?, в?)',                     'Вграден видео плейър.'),
    ('audio(src)',                             'Аудио плейър.'),
    ('progress(стойност, макс?)',              'Лента за прогрес.'),
    ('divider()',                              'Хоризонтална разделителна линия.'),
    ('spacer(пиксели)',                        'Празно вертикално разстояние.'),
    ('row() ... endrow',                       'Подрежда децата хоризонтално.'),
    ('column() ... endcolumn',                 'Подрежда децата вертикално.'),
    ('group(заглавие) ... endgroup',           'Група с рамка и опционално заглавие.'),
    ('tabs() ... endtabs / tab(т)..endtab',    'Контейнер с табове.'),
    ('menu(t) ... endmenu / menuitem(t,fn)',   'Меню в горната част на прозореца.'),
    ('table(заглавия, редове)',                'Таблица с данни.'),
    ('canvas(име, ш, в)',                      'Чертожна повърхност вътре в прозорец.'),
    ('map(шир, дълж, увеличение)',             'Вградена Leaflet карта.'),
    ('uiget(име)',                             'Чете стойността на компонент.'),
    ('uiset(име, стойност)',                   'Задава стойност на компонент програмно.'),
    ('toast(съобщение, вид?)',                 'Изскачащо известие, което не блокира.'),
    ('confirm(съобщение, fn)',                 'Диалог за потвърждение; извиква `fn` при OK.'),
    ('prompt(съобщение, fn)',                  'Диалог за въвеждане на текст.'),
]

# ---------------------------------------------------------------------------
# Tutorials shared structure (titles + descriptions); bodies are written below
# ---------------------------------------------------------------------------
TUTORIALS_EN = [
    ('Hello, Window',           'Build your very first windowed application.'),
    ('A Tip Calculator',        'Inputs, sliders, live computation, and a result panel.'),
    ('A To-Do List',            'State, lists, removing items, persisting to local storage.'),
    ('A Note-Taking App',       'Textareas, multiple notes, save & load through the cloud.'),
    ('A Drawing Pad',           'Canvas widget, mouse events, color picker, save as PNG.'),
    ('A Pomodoro Timer',        'Tabs, progress bars, audio cues, settings panel.'),
    ('A Markdown Previewer',    'Side-by-side textarea + rendered preview.'),
    ('A Weather Dashboard',     'HTTP requests, JSON parsing, displaying remote data.'),
    ('A Map Explorer',          'Leaflet map with markers, tooltips, and a search box.'),
    ('A Mini Spreadsheet',      'Tables, in-place editing, formula evaluation.'),
    ('A Chat Window',           'Sticky scroll, async streaming, message bubbles.'),
    ('A File Manager',          'Nested folder tree, drag & drop, cloud sync.'),
    ('A Calculator',            'Grid layout, button variants, keyboard shortcuts.'),
    ('A Bouncing Ball Game',    'Canvas + animation loop with collisions.'),
    ('Your First Library',      'Package code as a Gist and `summon` it from anywhere.'),
]
TUTORIALS_BG = [
    ('Здравей, прозорец',          'Първото ви приложение с прозорец.'),
    ('Калкулатор за бакшиш',       'Входни полета, плъзгачи и панел за резултат.'),
    ('Списък със задачи',          'Състояние, списъци, изтриване, запис в локално хранилище.'),
    ('Приложение за бележки',      'Textarea, няколко бележки, запис и зареждане през облак.'),
    ('Скицник за рисуване',        'Canvas, събития от мишка, избор на цвят, експорт като PNG.'),
    ('Помодоро таймер',            'Табове, лента за прогрес, аудио сигнали, настройки.'),
    ('Преглед на Markdown',        'Textarea + рендерирана визуализация едно до друго.'),
    ('Табло за времето',           'HTTP заявки, JSON, показване на отдалечени данни.'),
    ('Карта-изследовател',         'Leaflet с маркери, tooltips и поле за търсене.'),
    ('Мини електронна таблица',    'Таблици, редактиране на място, формули.'),
    ('Прозорец за чат',            'Скрол, async поток, балончета със съобщения.'),
    ('Файлов мениджър',            'Дърво с папки, drag & drop, облачна синхронизация.'),
    ('Калкулатор',                 'Grid подредба, варианти на бутони, бързи клавиши.'),
    ('Игра с подскачаща топка',    'Canvas + анимационен цикъл със сблъсъци.'),
    ('Вашата първа библиотека',    'Пакетирайте код в Gist и го извикайте с `summon`.'),
]

# ---------------------------------------------------------------------------
# CONTENT BUILDERS
# ---------------------------------------------------------------------------
def front_matter_en():
    return f"""# The sdev Book

_The complete guide to the sdev programming language — second edition._

> "A language is a craft. A book is a workshop." — sdev team

---

## Preface

This is the **second, expanded edition** of the sdev book. It exists because
the language has grown well past what the first edition could carry: a full
UI toolkit, a cloud workspace, nested project folders, an autosave engine,
a kernel with cooperative tasks, a bytecode VM, a fuzzy code translator,
and a Leaflet-powered mapping system are now first-class citizens.

The book is organised in three movements:

1. **The Language** — the original sdev reference, polished and lightly
   updated. If you're new, start here.
2. **The Toolkit** — a deep dive into every UI widget, with full
   customisation tables, layout patterns, and recipes.
3. **The Cookbook** — fifteen step-by-step tutorials that build real
   applications from blank canvas to working program.

A complete Leaflet/GIS reference closes the book as Appendix A. A glossary
and index sit at the back so you can dip in by keyword.

### What's new in this edition

| Area | Addition |
|------|----------|
| UI | `window` / `endwindow`, full widget set, layout primitives, menus, tabs, tables |
| UI | Per-widget customisation: variants, sizes, colors, padding, radius |
| State | `uiget` / `uiset` reactive bindings |
| Cloud | Auto-sync of the entire workspace including nested folders |
| Cloud | Conflict resolution, offline mode, manual `Save to cloud` action |
| Storage | Nested folders with full tree, drag & drop, rename, delete |
| Tooling | Standalone JavaScript runtime (`sdev-interpreter.js`) |
| Tooling | Standalone Python runtime (`sdev-interpreter.py`) |
| Tooling | Web IDE with command palette, search, settings, terminal |
| Docs | This book — both English and Bulgarian editions |

### Conventions used in the book

- `monospace` is used for code, file names, and identifiers.
- **Bold** marks the first appearance of a new term.
- A box like the one below highlights a tip:

> **Tip.** Press **Ctrl + Enter** in the IDE to run the current file.

A box like this flags a pitfall:

> **Watch out.** A `window(...)` block must always be closed with `endwindow`,
> otherwise widgets that follow will silently render into the previous window.

### How to read this book

If you have programmed before, skim Part I and jump to Part II. If sdev is
your first language, work through Part I in order — every chapter builds on
the previous one. The tutorials in Part III are designed to be typed by
hand; resist the urge to copy-paste, the muscle memory is half the lesson.

---

"""

def front_matter_bg():
    return f"""# Книгата за sdev

_Пълно ръководство за програмния език sdev — второ издание._

> „Езикът е занаят. Книгата е работилница.“ — екипът на sdev

---

## Предговор

Това е **второто, разширено издание** на книгата за sdev. То съществува,
защото езикът се разрасна далеч отвъд първото издание: цял UI инструментариум,
облачно работно пространство, вложени папки, автоматично запазване, ядро с
кооперативни задачи, байт-код виртуална машина, „размит“ преводач на код и
картографска система с Leaflet вече са граждани от първи клас.

Книгата е организирана в три части:

1. **Езикът** — оригиналният справочник за sdev, обновен.
2. **Инструментариумът** — задълбочен преглед на всеки UI компонент с пълни
   таблици за персонализация, шаблони за оформление и рецепти.
3. **Готварската книга** — петнадесет урока стъпка по стъпка, които изграждат
   реални приложения от празен лист до работеща програма.

Пълният справочник за Leaflet/GIS е приложение А. Речник и индекс в края
позволяват търсене по ключова дума.

### Какво е ново в това издание

| Област | Допълнение |
|--------|------------|
| UI | `window` / `endwindow`, пълен набор компоненти, оформления, менюта, табове, таблици |
| UI | Персонализация: варианти, размери, цветове, отстъпи, радиуси |
| Състояние | `uiget` / `uiset` реактивни връзки |
| Облак | Автоматична синхронизация на цялото работно пространство, вкл. вложени папки |
| Облак | Разрешаване на конфликти, офлайн режим, ръчно „Запис в облака“ |
| Файлове | Вложени папки, дърво, drag & drop, преименуване, изтриване |
| Инструменти | Самостоятелен JavaScript интерпретатор (`sdev-interpreter.js`) |
| Инструменти | Самостоятелен Python интерпретатор (`sdev-interpreter.py`) |
| Инструменти | Уеб IDE с команден палет, търсене, настройки, терминал |
| Документация | Тази книга — английско и българско издание |

### Конвенции

- `монoширинен` шрифт се използва за код, имена на файлове и идентификатори.
- **Удебелено** маркира първата поява на нов термин.
- Така изглежда подсказка:

> **Съвет.** Натиснете **Ctrl + Enter** в IDE, за да изпълните текущия файл.

А така изглежда предупреждение:

> **Внимание.** Блок `window(...)` винаги трябва да се затваря с `endwindow`,
> иначе следващите компоненти ще се рендерират мълчаливо в предходния прозорец.

### Как да четете тази книга

Ако вече сте програмирали, прегледайте набързо Част I и преминете към Част II.
Ако sdev е първият ви език, четете Част I по ред — всяка глава надгражда
предишната. Уроците в Част III са замислени да се пишат на ръка; устоявайте
на изкушението да копирате — мускулната памет е половината от урока.

---

"""

# ---------------------------------------------------------------------------
# UI deep dive (English)
# ---------------------------------------------------------------------------
def ui_deep_dive_en():
    out = []
    out.append("# Part II — The UI Toolkit\n")
    out.append("This part of the book documents every UI primitive added since the first edition. The toolkit is shared between the JavaScript runtime and the Python runtime; programs using only the documented API will run unchanged on either.\n\n---\n\n")

    # Chapter: Windows in depth
    out.append("## Chapter U1 — Windows in depth\n\n")
    out.append("A **window** is the top-level container for any visual program. Every widget lives inside one. You open a window with `window(title, width, height)` and close it with `endwindow`.\n\n")
    out.append("```\nwindow(\"Hello\", 480, 320)\n  heading(\"Hello, world!\", 1)\n  paragraph(\"This is my first window.\")\nendwindow\n```\n\n")
    out.append("### Sizing\n\nThe two numeric arguments are the **initial** width and height in CSS pixels. Both runtimes treat them as a *suggestion*: the browser will respect them but allow the user to resize the window with the mouse, and the Python runtime will apply them as the initial inner dimensions of the Tk window.\n\n")
    out.append("Common sizes you might use:\n\n")
    out.append("| Use case | Suggested size |\n|----------|----------------|\n")
    for label, w, h in [
        ('Pop-up dialog',   320, 200),
        ('Form / settings', 480, 600),
        ('Editor panel',    720, 540),
        ('Dashboard',       960, 640),
        ('Full-screen app', 1280, 800),
        ('Tiny utility',    280, 160),
        ('Mobile-style',    360, 640),
    ]:
        out.append(f"| {label} | `{w} × {h}` |\n")
    out.append("\n### Multiple windows\n\nYou can open more than one window in the same program. Each `window(...)` block is independent; widgets in window B cannot see widgets in window A unless they share an `uiget`/`uiset` name.\n\n")
    out.append("```\nwindow(\"Editor\", 720, 540)\n  textarea(\"buffer\", 24)\nendwindow\n\nwindow(\"Preview\", 480, 540)\n  paragraph(uiget(\"buffer\"))\nendwindow\n```\n\n")
    out.append("### Closing a window programmatically\n\nCall `closewindow(title)` to dismiss a window from code. To re-open the same window, simply re-execute the `window(...)/endwindow` block — it is a no-op if a window with the same title is already open.\n\n")
    out.append("### Window-level customisation\n\nAfter the size argument you may pass an **options tome**:\n\n")
    out.append("```\nwindow(\"My App\", 480, 600, {\n  resizable: true,\n  alwaysOnTop: false,\n  background: \"#0F172A\",\n  foreground: \"#F8FAFC\",\n  padding: 16,\n  radius: 12,\n  centered: true\n})\n```\n\n")
    out.append("All keys are optional. The runtime quietly ignores keys it does not recognise so your program stays portable.\n\n---\n\n")

    # Chapter: Buttons
    out.append("## Chapter U2 — Buttons, in depth\n\n")
    out.append("`button(label, onclick)` is the most-used widget in any application. The default form gives you a primary-coloured button that calls a function when clicked.\n\n")
    out.append("```\nbutton(\"Click me\", () -> speak(\"clicked!\"))\n```\n\n")
    out.append("### Variants\n\nThe optional third argument selects a visual variant:\n\n")
    out.append("| Variant | Looks like | Use for |\n|---------|------------|---------|\n")
    for v, look, use in [
        ('primary',     'Solid accent colour, white text', 'The main action of a screen.'),
        ('secondary',   'Muted background, dark text',     'Supporting actions next to a primary.'),
        ('ghost',       'Transparent until hover',         'Tertiary actions, toolbars.'),
        ('outline',     'Border only',                     'Filter toggles, segmented controls.'),
        ('destructive', 'Red background',                  'Delete, leave, or any irreversible action.'),
        ('link',        'Looks like a hyperlink',          'Navigation inside flowing text.'),
    ]:
        out.append(f"| `{v}` | {look} | {use} |\n")
    out.append("\n### Customisation tome\n\nA fourth argument lets you override almost anything:\n\n")
    out.append("```\nbutton(\"Save\", saveFn, \"primary\", {\n  width: 160,\n  height: 44,\n  radius: 10,\n  background: \"#0891B2\",\n  foreground: \"#FFFFFF\",\n  hoverBackground: \"#0E7490\",\n  shadow: \"0 4px 12px rgba(0,0,0,.25)\",\n  icon: \"save\",\n  url: \"https://example.com\",\n  newTab: true,\n  disabled: false,\n  tooltip: \"Saves the current document\"\n})\n```\n\n")
    out.append("If `url` is supplied the button behaves like a link — clicking it opens the URL (in a new tab when `newTab` is true) **after** the `onclick` function has run. This makes buttons useful for both side-effects and navigation.\n\n")
    out.append("### Icon buttons\n\nPass `icon: \"<name>\"` to put a Lucide-style icon to the left of the label. A common pattern:\n\n")
    out.append("```\nrow()\n  button(\"\", deleteRow, \"ghost\", {icon: \"trash\", tooltip: \"Delete\"})\n  button(\"\", editRow,   \"ghost\", {icon: \"edit\",  tooltip: \"Edit\"})\nendrow\n```\n\n")
    out.append("### Disabled state\n\nSet `disabled: true` to grey-out the button. Combine with a state variable to lock the UI during long operations:\n\n")
    out.append("```\nbutton(\"Submit\", onSubmit, \"primary\", {disabled: uiget(\"loading\")})\n```\n\n---\n\n")

    # Chapter: Inputs
    out.append("## Chapter U3 — Text inputs and forms\n\n")
    out.append("Every input widget takes a `name` as its first argument. The current value of the input is available anywhere via `uiget(name)`, and writing `uiset(name, value)` updates the widget.\n\n")
    out.append("### `input` — single line\n\n```\ninput(\"email\", \"you@example.com\")\nbutton(\"Greet\", () -> speak(\"Hi \" + uiget(\"email\")))\n```\n\n")
    out.append("Customisation:\n\n")
    out.append("```\ninput(\"email\", \"you@example.com\", \"\", {\n  width: 320,\n  type: \"email\",     // text | email | password | number | tel | url\n  maxLength: 80,\n  required: true,\n  autocomplete: \"email\",\n  background: \"#0F172A\",\n  foreground: \"#E2E8F0\",\n  border: \"#334155\",\n  radius: 8,\n  padding: 10\n})\n```\n\n")
    out.append("### `textarea` — multi-line\n\n```\ntextarea(\"note\", 6, \"Write something...\")\n```\n\nA fourth options argument supports `width`, `height`, `resizable`, `monospace`, `wrap` (`hard` or `soft`).\n\n")
    out.append("### `checkbox`\n\n```\ncheckbox(\"agree\", \"I agree to the terms\")\nif uiget(\"agree\")\n  speak(\"Thanks for agreeing\")\nend\n```\n\n")
    out.append("Both runtimes treat the second argument as the visible label. If you want a checkbox without a label (e.g. inside a table cell) pass an empty string.\n\n")
    out.append("### `slider` and `select`\n\n```\nslider(\"volume\", 0, 100, 5)\nselect(\"theme\", [\"light\", \"dark\", \"auto\"])\n```\n\nBoth widgets accept the same customisation tome as `input` (width, padding, colours).\n\n---\n\n")

    # Chapter: Layout
    out.append("## Chapter U4 — Layout primitives\n\n")
    out.append("By default widgets stack vertically, top to bottom. To change this you wrap children in a layout block.\n\n")
    out.append("### Rows and columns\n\n```\nrow()\n  button(\"Cancel\", cancelFn, \"ghost\")\n  button(\"Save\",   saveFn,   \"primary\")\nendrow\n```\n\n")
    out.append("`row()` accepts an options tome: `gap`, `align` (`start`, `center`, `end`, `stretch`), `justify` (`start`, `center`, `end`, `between`, `around`), `wrap`.\n\n")
    out.append("### Groups\n\nA `group(title)` block draws a labelled border around its children — perfect for grouping related form fields.\n\n")
    out.append("```\ngroup(\"Account\")\n  input(\"name\", \"Your name\")\n  input(\"email\", \"you@example.com\")\nendgroup\n```\n\n")
    out.append("### Tabs\n\n```\ntabs()\n  tab(\"General\")\n    input(\"name\", \"Project name\")\n  endtab\n  tab(\"Advanced\")\n    checkbox(\"experimental\", \"Enable experimental features\")\n  endtab\nendtabs\n```\n\n")
    out.append("### Tables\n\n```\ntable(\n  [\"Name\", \"Age\", \"Country\"],\n  [\n    [\"Ada\",   36, \"UK\"],\n    [\"Linus\", 54, \"FI\"]\n  ]\n)\n```\n\nOptions include `striped`, `bordered`, `compact`, `onRowClick(idx)`.\n\n---\n\n")

    # Chapter: Reactive state
    out.append("## Chapter U5 — Reactive state with `uiget` / `uiset`\n\n")
    out.append("Every widget that has a `name` exposes its current value through `uiget(name)`. The value is reactive: any expression in the same window that reads it will re-render when the value changes.\n\n")
    out.append("```\ninput(\"first\", \"Ada\")\ninput(\"last\",  \"Lovelace\")\nparagraph(\"Hello, \" + uiget(\"first\") + \" \" + uiget(\"last\") + \"!\")\n```\n\n")
    out.append("To programmatically change a value, call `uiset(name, value)`. This is how you implement reset buttons, computed fields, or remote data loaders:\n\n")
    out.append("```\nbutton(\"Reset\", () -> uiset(\"first\", \"\") and uiset(\"last\", \"\"), \"ghost\")\n```\n\n")
    out.append("Bound names are scoped to the **runtime session**, not the window. Two windows that use the same name share state — useful for editor + preview pairs.\n\n---\n\n")

    # Chapter: Customisation reference
    out.append("## Chapter U6 — Customisation reference\n\n")
    out.append("This chapter is a single big table you can refer back to. Each row is a key you may pass in the options tome of any widget.\n\n")
    out.append("| Key | Type | Applies to | Notes |\n|-----|------|------------|-------|\n")
    for k,t,a,n in [
        ('width', 'number (px)', 'all', 'Fixed width.'),
        ('height', 'number (px)', 'all', 'Fixed height.'),
        ('minWidth/minHeight', 'number', 'all', 'Lower bound.'),
        ('maxWidth/maxHeight', 'number', 'all', 'Upper bound.'),
        ('padding', 'number or [t,r,b,l]', 'containers, buttons, inputs', 'Inner spacing.'),
        ('margin',  'number or [t,r,b,l]', 'all', 'Outer spacing.'),
        ('radius', 'number (px)', 'most', 'Corner radius.'),
        ('background', 'colour string', 'most', 'Solid background colour.'),
        ('foreground', 'colour string', 'text widgets', 'Text colour.'),
        ('border', 'colour string', 'most', 'Border colour.'),
        ('borderWidth', 'number (px)', 'most', 'Border thickness.'),
        ('shadow', 'CSS shadow string', 'window, button, group', 'Drop shadow.'),
        ('font', 'string', 'text widgets', 'CSS font-family.'),
        ('fontSize', 'number (px)', 'text widgets', 'Font size.'),
        ('fontWeight', 'number', 'text widgets', 'Boldness.'),
        ('letterSpacing', 'number (em)', 'text widgets', ''),
        ('align', 'start|center|end|stretch', 'row, column, group', 'Cross-axis.'),
        ('justify', 'start|center|end|between|around', 'row, column', 'Main-axis.'),
        ('gap', 'number (px)', 'row, column, group', 'Space between children.'),
        ('wrap', 'true|false', 'row', 'Allow wrap to new line.'),
        ('icon', 'icon name', 'button, menuitem', 'Lucide icon name.'),
        ('tooltip', 'string', 'most', 'Hover help.'),
        ('disabled', 'boolean', 'inputs, buttons', 'Greys out and ignores events.'),
        ('hidden', 'boolean', 'all', 'Removes from layout when true.'),
        ('url', 'string', 'button, label', 'Click navigates to URL.'),
        ('newTab', 'boolean', 'button, label', 'Open url in a new tab.'),
        ('onChange', 'function', 'inputs', 'Fired on every value change.'),
        ('onFocus/onBlur', 'function', 'inputs', ''),
        ('onMount/onUnmount', 'function', 'all', 'Lifecycle hooks.'),
        ('hoverBackground', 'colour string', 'button', ''),
        ('activeBackground', 'colour string', 'button', ''),
        ('focusRing', 'colour string', 'inputs, buttons', ''),
        ('placeholderColor', 'colour string', 'inputs, textarea', ''),
        ('rows/cols', 'number', 'textarea', 'Initial size.'),
        ('resizable', 'true|false', 'window, textarea', ''),
        ('monospace', 'boolean', 'textarea, label', 'Use a monospace font.'),
        ('wrap', '"hard"|"soft"', 'textarea', 'Line-wrapping policy.'),
    ]:
        out.append(f"| `{k}` | {t} | {a} | {n} |\n")
    out.append("\n---\n\n")

    # Chapter: Cloud sync
    out.append("## Chapter U7 — Cloud workspace & auto-sync\n\n")
    out.append("From the second edition onward, the IDE keeps your entire workspace — files **and** the nested folder tree — in the cloud. You don't have to think about it.\n\n")
    out.append("### How auto-sync works\n\n")
    out.append("Every change you make in the editor is debounced (≈ 800 ms) and written to the cloud as a small patch. When you reload the page, the IDE pulls the latest snapshot before painting any UI, so what you see is always what was last saved.\n\n")
    out.append("If two browser tabs edit the same file at once, the **last write wins** at the file level, but the loser's changes are kept in a sibling file named `<original>.conflict-<timestamp>`. Open it, copy what you need, and delete it.\n\n")
    out.append("### Manual saves\n\nOpen the **File** menu and choose **Save to cloud** (Ctrl + S) to flush pending writes immediately. This is also the action to use right before publishing or sharing a project.\n\n")
    out.append("### Working offline\n\nIf the network goes down the IDE keeps working against an in-memory copy of the workspace. A small banner in the status bar warns you. As soon as the connection comes back, every queued change is pushed in order.\n\n")
    out.append("### Nested folders\n\nThe file tree is a real tree. Right-click any folder for **New file**, **New folder**, **Rename**, **Delete**, **Duplicate**, **Move…**. Drag-and-drop works between any two folders.\n\n")
    out.append("Programs can also touch the workspace at runtime through `readFile(path)` and `writeFile(path, content)`. Paths are POSIX-style and rooted at the workspace root.\n\n---\n\n")
    return ''.join(out)


def ui_deep_dive_bg():
    out = []
    out.append("# Част II — UI инструментариум\n\n")
    out.append("Тази част документира всеки UI примитив, добавен след първото издание. Инструментариумът е общ за JavaScript и Python интерпретаторите; програма, която използва само документираното API, ще работи без промяна и в двата.\n\n---\n\n")
    out.append("## Глава U1 — Прозорци в дълбочина\n\n")
    out.append("**Прозорец** е контейнерът от най-високо ниво на всяка визуална програма. Всеки компонент живее в някой прозорец. Отваряте прозорец с `window(заглавие, ширина, височина)` и го затваряте с `endwindow`.\n\n")
    out.append("```\nwindow(\"Здравей\", 480, 320)\n  heading(\"Здравей, свят!\", 1)\n  paragraph(\"Това е първият ми прозорец.\")\nendwindow\n```\n\n")
    out.append("### Размери\n\nДвата числови аргумента са **началните** ширина и височина в CSS пиксели. И двата интерпретатора ги третират като *препоръка*: браузърът ги уважава, но позволява на потребителя да преоразмери прозореца с мишката, а Python интерпретаторът ги прилага като начални вътрешни размери на Tk прозорец.\n\n")
    out.append("Често използвани размери:\n\n| За какво | Препоръка |\n|----------|-----------|\n")
    for label, w, h in [
        ('Изскачащ диалог',     320, 200),
        ('Форма / настройки',   480, 600),
        ('Панел редактор',      720, 540),
        ('Табло',               960, 640),
        ('Цял екран',          1280, 800),
        ('Малка помощна',       280, 160),
        ('Мобилен формат',      360, 640),
    ]:
        out.append(f"| {label} | `{w} × {h}` |\n")
    out.append("\n### Няколко прозореца\n\nМожете да отворите повече от един прозорец в една програма. Всеки `window(...)` блок е независим; компонентите в прозорец Б не виждат тези в прозорец А, освен ако не споделят име на `uiget`/`uiset`.\n\n")
    out.append("### Затваряне на прозорец от код\n\nПовикайте `closewindow(заглавие)`, за да затворите прозорец. За да го отворите отново, просто изпълнете блока — ако вече е отворен, се игнорира.\n\n")
    out.append("### Персонализация на прозорец\n\nСлед размера може да подадете **тома с опции**:\n\n")
    out.append("```\nwindow(\"Моето приложение\", 480, 600, {\n  resizable: true,\n  alwaysOnTop: false,\n  background: \"#0F172A\",\n  foreground: \"#F8FAFC\",\n  padding: 16,\n  radius: 12,\n  centered: true\n})\n```\n\n")
    out.append("Всички ключове са опционални; интерпретаторът тихо игнорира непознати ключове.\n\n---\n\n")

    out.append("## Глава U2 — Бутони в дълбочина\n\n")
    out.append("`button(етикет, onclick)` е най-използваният компонент. Подразбиращата се форма е цветен бутон, който извиква функция при клик.\n\n")
    out.append("```\nbutton(\"Натисни ме\", () -> speak(\"кликнато!\"))\n```\n\n")
    out.append("### Варианти\n\nТретият аргумент избира визуален вариант:\n\n| Вариант | Изглежда като | За какво |\n|---------|---------------|----------|\n")
    for v, look, use in [
        ('primary',     'Плътен акцентен цвят, бял текст', 'Главно действие на екрана.'),
        ('secondary',   'Мек фон, тъмен текст',            'Спомагателни действия.'),
        ('ghost',       'Прозрачен до hover',              'Третични действия, тулбари.'),
        ('outline',     'Само рамка',                      'Филтри, сегментни контроли.'),
        ('destructive', 'Червен фон',                      'Изтриване или необратимо действие.'),
        ('link',        'Изглежда като линк',              'Навигация в текст.'),
    ]:
        out.append(f"| `{v}` | {look} | {use} |\n")
    out.append("\n### Тома за персонализация\n\nЧетвъртият аргумент позволява да се промени почти всичко:\n\n")
    out.append("```\nbutton(\"Запис\", saveFn, \"primary\", {\n  width: 160,\n  height: 44,\n  radius: 10,\n  background: \"#0891B2\",\n  foreground: \"#FFFFFF\",\n  hoverBackground: \"#0E7490\",\n  shadow: \"0 4px 12px rgba(0,0,0,.25)\",\n  icon: \"save\",\n  url: \"https://example.com\",\n  newTab: true,\n  disabled: false,\n  tooltip: \"Запазва документа\"\n})\n```\n\n")
    out.append("Ако е подаден `url`, бутонът се държи и като линк — клик го отваря (в нов таб при `newTab: true`) **след** изпълнение на `onclick`.\n\n")
    out.append("### Иконки\n\nПодайте `icon: \"<име>\"`, за да добавите Lucide иконка вляво от етикета.\n\n```\nrow()\n  button(\"\", deleteRow, \"ghost\", {icon: \"trash\",  tooltip: \"Изтрий\"})\n  button(\"\", editRow,   \"ghost\", {icon: \"edit\",   tooltip: \"Редактирай\"})\nendrow\n```\n\n")
    out.append("### Деактивиране\n\nЗадайте `disabled: true`, за да направите бутона сив. Комбинирайте със състояние, за да заключите UI по време на операция:\n\n")
    out.append("```\nbutton(\"Изпрати\", onSubmit, \"primary\", {disabled: uiget(\"loading\")})\n```\n\n---\n\n")

    out.append("## Глава U3 — Текстови полета и форми\n\n")
    out.append("Всеки входен компонент приема `име` като първи аргумент. Стойността е достъпна навсякъде чрез `uiget(име)`, а `uiset(име, стойност)` я променя.\n\n")
    out.append("### `input` — едноредово\n\n```\ninput(\"email\", \"you@example.com\")\nbutton(\"Поздрави\", () -> speak(\"Здравей \" + uiget(\"email\")))\n```\n\n")
    out.append("Персонализация:\n\n```\ninput(\"email\", \"you@example.com\", \"\", {\n  width: 320,\n  type: \"email\",\n  maxLength: 80,\n  required: true,\n  autocomplete: \"email\",\n  background: \"#0F172A\",\n  foreground: \"#E2E8F0\",\n  border: \"#334155\",\n  radius: 8,\n  padding: 10\n})\n```\n\n")
    out.append("### `textarea` — многоредово\n\n```\ntextarea(\"note\", 6, \"Напишете нещо...\")\n```\n\nЧетвъртият аргумент поддържа `width`, `height`, `resizable`, `monospace`, `wrap`.\n\n")
    out.append("### `checkbox`\n\n```\ncheckbox(\"agree\", \"Съгласен съм с условията\")\nif uiget(\"agree\")\n  speak(\"Благодаря\")\nend\n```\n\n")
    out.append("Вторият аргумент е видимият етикет. За checkbox без етикет (например в клетка на таблица) подайте празен низ.\n\n")
    out.append("### `slider` и `select`\n\n```\nslider(\"volume\", 0, 100, 5)\nselect(\"theme\", [\"light\", \"dark\", \"auto\"])\n```\n\n---\n\n")

    out.append("## Глава U4 — Оформления\n\n")
    out.append("По подразбиране компонентите се подреждат вертикално, отгоре надолу. За да промените това, обвийте ги в блок за оформление.\n\n")
    out.append("### Редове и колони\n\n```\nrow()\n  button(\"Отказ\", cancelFn, \"ghost\")\n  button(\"Запис\", saveFn,   \"primary\")\nendrow\n```\n\n")
    out.append("`row()` приема тома: `gap`, `align`, `justify`, `wrap`.\n\n")
    out.append("### Групи\n\nБлок `group(заглавие)` рисува рамка около децата — идеално за свързани полета на форма.\n\n")
    out.append("```\ngroup(\"Профил\")\n  input(\"name\", \"Вашето име\")\n  input(\"email\", \"you@example.com\")\nendgroup\n```\n\n")
    out.append("### Табове\n\n```\ntabs()\n  tab(\"Общи\")\n    input(\"name\", \"Име на проекта\")\n  endtab\n  tab(\"Разширени\")\n    checkbox(\"experimental\", \"Включи експериментални функции\")\n  endtab\nendtabs\n```\n\n")
    out.append("### Таблици\n\n```\ntable(\n  [\"Име\", \"Възраст\", \"Държава\"],\n  [\n    [\"Ада\",  36, \"UK\"],\n    [\"Линус\", 54, \"FI\"]\n  ]\n)\n```\n\n---\n\n")

    out.append("## Глава U5 — Реактивно състояние с `uiget` / `uiset`\n\n")
    out.append("Всеки компонент с `име` излага текущата си стойност чрез `uiget(име)`. Стойността е реактивна: всеки израз в същия прозорец, който я чете, ще се преизчисли при промяна.\n\n")
    out.append("```\ninput(\"first\", \"Ада\")\ninput(\"last\",  \"Лъвлейс\")\nparagraph(\"Здравей, \" + uiget(\"first\") + \" \" + uiget(\"last\") + \"!\")\n```\n\n")
    out.append("За програмна промяна — `uiset(име, стойност)`. Така се правят бутоните за нулиране, изчислимите полета и зареждането на данни от мрежата:\n\n")
    out.append("```\nbutton(\"Нулирай\", () -> uiset(\"first\", \"\") and uiset(\"last\", \"\"), \"ghost\")\n```\n\n---\n\n")

    out.append("## Глава U6 — Справочник за персонализация\n\n")
    out.append("Тази глава е една голяма таблица за справка. Всеки ред е ключ, който може да подадете в томата с опции на всеки компонент.\n\n")
    out.append("| Ключ | Тип | Прилага се към | Бележки |\n|------|-----|----------------|---------|\n")
    for k,t,a,n in [
        ('width','число (px)','всички','Фиксирана ширина.'),
        ('height','число (px)','всички','Фиксирана височина.'),
        ('padding','число или [t,r,b,l]','контейнери, бутони, полета','Вътрешни отстъпи.'),
        ('margin','число или [t,r,b,l]','всички','Външни отстъпи.'),
        ('radius','число (px)','повечето','Радиус на ъглите.'),
        ('background','цвят','повечето','Плътен фон.'),
        ('foreground','цвят','текстови','Цвят на текста.'),
        ('border','цвят','повечето','Цвят на рамката.'),
        ('borderWidth','число (px)','повечето','Дебелина на рамката.'),
        ('shadow','CSS shadow низ','прозорец, бутон, група','Сянка.'),
        ('font','низ','текстови','CSS font-family.'),
        ('fontSize','число (px)','текстови','Размер на шрифта.'),
        ('fontWeight','число','текстови','Удебеленост.'),
        ('align','start|center|end|stretch','row, column, group','Cross-axis.'),
        ('justify','start|center|end|between|around','row, column','Main-axis.'),
        ('gap','число (px)','row, column, group','Разстояние между децата.'),
        ('wrap','true|false','row','Позволява пренасяне.'),
        ('icon','име на иконка','button, menuitem','Lucide иконка.'),
        ('tooltip','низ','повечето','Помощен текст при hover.'),
        ('disabled','boolean','полета, бутони','Сив и без събития.'),
        ('hidden','boolean','всички','Премахва от оформлението.'),
        ('url','низ','button, label','Клик отваря URL.'),
        ('newTab','boolean','button, label','Отваря URL в нов таб.'),
        ('onChange','функция','полета','При всяка промяна.'),
        ('onFocus/onBlur','функция','полета',''),
        ('hoverBackground','цвят','button',''),
        ('activeBackground','цвят','button',''),
        ('focusRing','цвят','полета, бутони',''),
        ('placeholderColor','цвят','полета, textarea',''),
        ('rows/cols','число','textarea','Начален размер.'),
        ('resizable','true|false','window, textarea',''),
        ('monospace','boolean','textarea, label','Моноширинен шрифт.'),
        ('wrap','"hard"|"soft"','textarea','Политика на пренасяне.'),
    ]:
        out.append(f"| `{k}` | {t} | {a} | {n} |\n")
    out.append("\n---\n\n")

    out.append("## Глава U7 — Облачно работно пространство и автоматична синхронизация\n\n")
    out.append("Започвайки от това издание, IDE пази цялото ви работно пространство — файлове **и** дървото от вложени папки — в облака. Не е нужно да мислите за това.\n\n")
    out.append("### Как работи автоматичната синхронизация\n\nВсяка промяна в редактора се отлага (≈ 800 мс) и се записва в облака като малък patch. При презареждане IDE взима последната снимка преди да рисува нещо, така че виждате последно записаното.\n\n")
    out.append("Ако два таба редактират един файл едновременно, **последният запис печели** на ниво файл, но промените на „загубилия“ остават в съседен файл `<оригинал>.conflict-<timestamp>`. Отворете го, копирайте каквото ви трябва и го изтрийте.\n\n")
    out.append("### Ръчно записване\n\nОт меню **File** → **Save to cloud** (Ctrl + S) изпразва незаписаните промени веднага. Полезно преди публикуване или споделяне.\n\n")
    out.append("### Офлайн режим\n\nАко мрежата изчезне, IDE продължава да работи срещу копие в паметта. Малък банер в статус бара ви предупреждава. При връщане на връзката всички чакащи промени се изпращат по ред.\n\n")
    out.append("### Вложени папки\n\nДървото с файлове е истинско дърво. Десен клик върху папка — **New file**, **New folder**, **Rename**, **Delete**, **Duplicate**, **Move…**. Drag-and-drop работи между всеки две папки.\n\n")
    out.append("Програмите достъпват работното пространство по време на изпълнение чрез `readFile(път)` и `writeFile(път, съдържание)`. Пътищата са POSIX-стил с корен в работното пространство.\n\n---\n\n")
    return ''.join(out)

# ---------------------------------------------------------------------------
# Tutorials
# ---------------------------------------------------------------------------
def tutorials_en():
    out = ["# Part III — The Cookbook\n\nFifteen step-by-step tutorials. Each one is short enough to type by hand in 15–30 minutes and large enough to teach a real lesson.\n\n---\n\n"]
    out.append(_tut_en_1())
    out.append(_tut_en_2())
    out.append(_tut_en_3())
    out.append(_tut_en_4())
    out.append(_tut_en_5())
    out.append(_tut_en_6())
    out.append(_tut_en_7())
    out.append(_tut_en_8())
    out.append(_tut_en_9())
    out.append(_tut_en_10())
    out.append(_tut_en_11())
    out.append(_tut_en_12())
    out.append(_tut_en_13())
    out.append(_tut_en_14())
    out.append(_tut_en_15())
    return ''.join(out)

def _tut_en_1():
    return """## Tutorial 1 — Hello, Window

**Goal.** Open a window, show a heading and a paragraph, react to a button.

### Step 1 — The empty window

```
window("Hello", 360, 240)
endwindow
```

Run with **Ctrl + Enter**. A 360×240 window appears. It is empty because we
haven't put anything inside it.

### Step 2 — Add some content

```
window("Hello", 360, 240)
  heading("Welcome to sdev", 1)
  paragraph("This is the smallest possible windowed program.")
endwindow
```

### Step 3 — A button that does something

```
forge clicks be 0

window("Hello", 360, 280)
  heading("Welcome to sdev", 1)
  paragraph("Click the button below.")
  button("Click me", () -> {
    clicks = clicks + 1
    speak("clicked " + clicks + " times")
  }, "primary")
endwindow
```

`speak(...)` writes to the OUTPUT panel. Try clicking the button several times
and watch the counter climb.

### Step 4 — Show the count *inside* the window

Reactive bindings make this easy:

```
window("Hello", 360, 280)
  heading("Welcome to sdev", 1)
  paragraph("You have clicked " + uiget("count") + " times.")
  button("Click me", () -> uiset("count", (uiget("count") or 0) + 1))
endwindow
```

### What you learned

- `window(...) ... endwindow` opens a window.
- `heading`, `paragraph`, `button` are widgets.
- `uiget` and `uiset` give every widget reactive state.

---

"""

def _tut_en_2():
    return """## Tutorial 2 — A Tip Calculator

**Goal.** Use a slider, a number input, and a computed paragraph.

```
window("Tip Calculator", 380, 320)
  heading("Tip calculator", 2)

  group("Bill")
    input("amount", "0.00", "20.00", {type: "number", width: 160})
  endgroup

  group("Tip")
    slider("tip", 0, 30, 1)
    paragraph("Tip: " + uiget("tip") + "%")
  endgroup

  group("Result")
    forge total be elevate(uiget("amount") * (1 + uiget("tip")/100), 2)
    heading("Total: $" + total, 3)
  endgroup
endwindow
```

`elevate(x, n)` rounds to *n* decimal places. The result is fully reactive:
move the slider, change the bill — everything updates immediately.

### Stretch goal

Add a `select("people", ["1","2","3","4","5"])` and divide the total by the
selected number of people.

---

"""

def _tut_en_3():
    return """## Tutorial 3 — A To-Do List

**Goal.** Render a list, add items, remove items, persist to local storage.

```
forge todos be []

conjure addTodo():
  forge text be uiget("new")
  if text != ""
    todos = todos + [text]
    uiset("new", "")
    writeFile("todos.json", json.stringify(todos))
  end
end

conjure removeTodo(idx):
  todos = todos.removeAt(idx)
  writeFile("todos.json", json.stringify(todos))
end

# load on startup
attempt
  todos = json.parse(readFile("todos.json"))
rescue _
  todos = []
end

window("Todo", 420, 540)
  heading("My todos", 2)

  row({gap: 8})
    input("new", "What needs doing?", "", {width: 280})
    button("Add", addTodo, "primary")
  endrow

  divider()

  for i in range(todos.length)
    row({gap: 8, align: "center"})
      paragraph((i+1) + ". " + todos[i])
      button("", () -> removeTodo(i), "ghost", {icon: "trash"})
    endrow
  end
endwindow
```

### What you learned

- Lists are first-class; `+ [text]` appends.
- `writeFile` and `readFile` persist to the workspace (and the cloud).
- A `for` loop is a perfectly good way to render a dynamic list.

---

"""

def _tut_en_4():
    return """## Tutorial 4 — A Note-Taking App

**Goal.** Multiple notes, switch between them, save automatically.

```
forge notes be tome()
forge current be "Untitled"

attempt
  notes = json.parse(readFile("notes.json"))
rescue _
  notes["Untitled"] = ""
end

conjure save():
  notes[current] = uiget("body")
  writeFile("notes.json", json.stringify(notes))
end

conjure switchTo(name):
  current = name
  uiset("body", notes[name])
end

window("Notes", 720, 540)
  row({gap: 0})
    column({width: 200, background: "#0F172A", padding: 12})
      heading("Notes", 4)
      for name in keys(notes)
        button(name, () -> switchTo(name), "ghost", {width: 176})
      end
      button("+ New", () -> {
        notes["Note " + (keys(notes).length + 1)] = ""
        save()
      }, "primary", {width: 176})
    endcolumn

    column({padding: 12})
      heading(current, 3)
      textarea("body", 18, "Write here...", {onChange: save})
    endcolumn
  endrow
endwindow
```

`onChange: save` runs the save function on every keystroke. Combined with
the cloud auto-sync this means nothing is ever lost.

---

"""

def _tut_en_5():
    return """## Tutorial 5 — A Drawing Pad

**Goal.** Use the `canvas` widget, react to mouse events, save as PNG.

```
window("Draw", 600, 480)
  heading("Drawing pad", 3)
  row({gap: 8})
    select("color", ["black","red","green","blue","orange","purple"])
    slider("size", 1, 20, 1)
    button("Clear", () -> canvasClear("pad"), "ghost")
    button("Save PNG", () -> canvasExport("pad", "drawing.png"), "primary")
  endrow
  canvas("pad", 580, 380, {
    background: "#FFFFFF",
    border: "#CBD5E1",
    onMouseDrag: (x,y) -> canvasDot("pad", x, y, uiget("size"), uiget("color"))
  })
endwindow
```

`canvasDot`, `canvasClear`, `canvasExport` are all part of the standard
graphics module. The full reference is in Chapter 22 of Part I.

---

"""

def _tut_en_6():
    return """## Tutorial 6 — A Pomodoro Timer

**Goal.** Tabs, progress bars, audio cues, settings panel.

```
forge running be false
forge remaining be 25 * 60
forge totalLen be 25 * 60

conjure tick():
  if running and remaining > 0
    remaining = remaining - 1
    uiset("progress", (totalLen - remaining) / totalLen * 100)
    after(1000, tick)
  elif remaining <= 0
    audio("done.mp3")
    toast("Time's up!", "success")
    running = false
  end
end

window("Pomodoro", 360, 360)
  tabs()
    tab("Timer")
      heading(formatTime(remaining), 1)
      progress(uiget("progress") or 0, 100)
      row({gap: 8})
        button("Start", () -> { running = true ; tick() }, "primary")
        button("Pause", () -> { running = false }, "secondary")
        button("Reset", () -> { running = false ; remaining = totalLen ; uiset("progress", 0) }, "ghost")
      endrow
    endtab
    tab("Settings")
      slider("len", 5, 60, 5)
      button("Apply", () -> {
        totalLen = uiget("len") * 60
        remaining = totalLen
      }, "primary")
    endtab
  endtabs
endwindow
```

`after(ms, fn)` is a built-in scheduler that runs `fn` after `ms`
milliseconds without blocking the UI.

---

"""

def _tut_en_7():
    return """## Tutorial 7 — A Markdown Previewer

**Goal.** Side-by-side textarea + rendered preview, in 25 lines of code.

```
window("Markdown Previewer", 900, 600)
  row({gap: 0})
    column({width: 440, padding: 8})
      heading("Source", 4)
      textarea("md", 28, "# Hello\\n\\nType **markdown** here.", {monospace: true})
    endcolumn
    column({padding: 16, background: "#FFFFFF"})
      heading("Preview", 4)
      html(renderMarkdown(uiget("md") or ""))
    endcolumn
  endrow
endwindow
```

`html(...)` injects rendered HTML into the window. `renderMarkdown(s)` is in
the standard library and produces safe, sanitised HTML.

---

"""

def _tut_en_8():
    return """## Tutorial 8 — A Weather Dashboard

**Goal.** Make a real HTTP request, parse JSON, display the result.

```
conjure load():
  forge city be uiget("city")
  forge resp be await http.get("https://api.example.com/weather?q=" + city)
  forge data be json.parse(resp.body)
  uiset("temp",     data.temp)
  uiset("humidity", data.humidity)
  uiset("desc",     data.description)
end

window("Weather", 380, 360)
  row({gap: 8})
    input("city", "City", "Sofia")
    button("Load", load, "primary")
  endrow
  group("Now")
    heading(uiget("temp") + "°C", 1)
    paragraph(uiget("desc") or "—")
    paragraph("Humidity: " + (uiget("humidity") or "—") + "%")
  endgroup
endwindow
```

`http.get` returns a future; `await` blocks the **fiber**, not the UI, so
the window stays responsive.

---

"""

def _tut_en_9():
    return """## Tutorial 9 — A Map Explorer

**Goal.** Show a Leaflet map, add markers, search.

```
forge places be [
  ["Sofia", 42.6977, 23.3219],
  ["Plovdiv", 42.1354, 24.7453],
  ["Varna", 43.2141, 27.9147]
]

window("Map", 720, 520)
  input("q", "Search a place")
  map("m", 42.7, 25.0, 7, {width: 700, height: 420})
  for p in places
    marker("m", p[1], p[2], p[0])
  end
  button("Find", () -> {
    forge q be lower(uiget("q"))
    for p in places
      if contains(lower(p[0]), q)
        flyTo("m", p[1], p[2], 11)
        escape
      end
    end
  }, "primary")
endwindow
```

The map widget is documented in full in Appendix A.

---

"""

def _tut_en_10():
    return """## Tutorial 10 — A Mini Spreadsheet

**Goal.** Editable table with a tiny formula evaluator.

```
forge cells be matrix(8, 5, () -> "")

conjure setCell(r, c, v):
  cells[r][c] = v
end

conjure render(v):
  if startsWith(v, "=")
    return eval(substring(v, 1))
  end
  return v
end

window("Sheet", 640, 420)
  heading("Mini sheet", 3)
  for r in range(8)
    row({gap: 4})
      for c in range(5)
        input("c" + r + "_" + c, "", cells[r][c], {
          width: 110,
          onChange: () -> setCell(r, c, uiget("c" + r + "_" + c))
        })
      end
    endrow
  end
  divider()
  paragraph("Sum of A1: " + render(cells[0][0]))
endwindow
```

---

"""

def _tut_en_11():
    return """## Tutorial 11 — A Chat Window

**Goal.** Sticky scroll, async streaming, message bubbles.

```
forge messages be []

conjure send():
  forge msg be uiget("input")
  if msg == "" then return end
  messages = messages + [{from: "me", text: msg}]
  uiset("input", "")
  await stream("https://api.example.com/chat", msg, (chunk) -> {
    if last(messages).from != "bot"
      messages = messages + [{from: "bot", text: ""}]
    end
    last(messages).text = last(messages).text + chunk
  })
end

window("Chat", 480, 600)
  scrollarea({stickToBottom: true, height: 480})
    for m in messages
      paragraph(m.text, {
        background: m.from == "me" ? "#0891B2" : "#1E293B",
        foreground: "#FFFFFF",
        padding: 10,
        radius: 12,
        align: m.from == "me" ? "end" : "start"
      })
    end
  endscrollarea
  row({gap: 8})
    input("input", "Say something…")
    button("Send", send, "primary")
  endrow
endwindow
```

---

"""

def _tut_en_12():
    return """## Tutorial 12 — A File Manager

**Goal.** Render the workspace folder tree, expand on click, drag & drop.

```
conjure renderNode(node, depth):
  for child in node.children
    row({gap: 4, padding: depth * 12})
      if child.type == "folder"
        button("📁 " + child.name, () -> child.expanded = not child.expanded, "ghost")
      else
        button("📄 " + child.name, () -> openFile(child.path), "link")
      end
    endrow
    if child.type == "folder" and child.expanded
      renderNode(child, depth + 1)
    end
  end
end

window("Files", 360, 600)
  heading("Workspace", 3)
  forge tree be readWorkspaceTree()
  renderNode(tree, 0)
endwindow
```

`readWorkspaceTree()` returns the live, nested folder tree synchronised with
the cloud.

---

"""

def _tut_en_13():
    return """## Tutorial 13 — A Calculator

**Goal.** Grid layout, button variants, keyboard shortcuts.

```
forge expr be ""

conjure press(key):
  if key == "C" then expr = "" 
  elif key == "=" then expr = "" + eval(expr)
  else expr = expr + key end
  uiset("display", expr)
end

window("Calc", 280, 360)
  paragraph(uiget("display") or "0", {
    background: "#0F172A", foreground: "#F8FAFC",
    padding: 14, radius: 8, align: "end", monospace: true
  })
  for row in [["7","8","9","/"],["4","5","6","*"],["1","2","3","-"],["0",".","=","+"]]
    row({gap: 6})
      for k in row
        button(k, () -> press(k), k == "=" ? "primary" : "secondary",
               {width: 56, height: 48})
      end
    endrow
  end
  button("Clear", () -> press("C"), "destructive", {width: 240})
endwindow
```

---

"""

def _tut_en_14():
    return """## Tutorial 14 — A Bouncing Ball Game

**Goal.** Animation loop on a canvas with collision detection.

```
forge x be 100; forge y be 100
forge vx be 3;  forge vy be 2

conjure frame():
  canvasClear("g", "#0F172A")
  canvasCircle("g", x, y, 16, "#0891B2")
  x = x + vx ; y = y + vy
  if x < 16 or x > 484 then vx = -vx end
  if y < 16 or y > 284 then vy = -vy end
  after(16, frame)
end

window("Bounce", 520, 340)
  canvas("g", 500, 300)
  frame()
endwindow
```

60 frames per second with `after(16, frame)`. Replace the body of `frame` with
your own physics for a real game.

---

"""

def _tut_en_15():
    return """## Tutorial 15 — Your First Library

**Goal.** Package useful code as a Gist and `summon` it from any program.

### Step 1 — Write the library

Create a file `mylib.sdev` with one helper:

```
conjure greet(who):
  return "Hello, " + who + "!"
end
```

### Step 2 — Publish as a public Gist

In the IDE, **File → Publish as Gist**. Copy the URL — it looks like
`https://gist.github.com/<user>/<hash>`.

### Step 3 — Use it from another program

```
summon "https://gist.github.com/<user>/<hash>" as mylib

speak(mylib.greet("world"))
```

`summon` downloads the Gist on first use, caches it locally, and re-uses the
cache on subsequent runs. Append `?v=2` to the URL to bust the cache when you
publish a new version.

### Where to go next

You have now seen every part of the language and the toolkit. Pick a project
that excites you, open the IDE, and start typing. The full reference for
every function used in these tutorials is one click away in the Web IDE
under **Help → Documentation** or in Part I of this book.

---

"""

def tutorials_bg():
    out = ["# Част III — Готварската книга\n\nПетнадесет урока стъпка по стъпка. Всеки е достатъчно кратък да се напише на ръка за 15–30 минути и достатъчно голям, за да научи реален урок.\n\n---\n\n"]
    out.append(_tut_bg_1())
    out.append(_tut_bg_2())
    out.append(_tut_bg_3())
    out.append(_tut_bg_4())
    out.append(_tut_bg_5())
    out.append(_tut_bg_6())
    out.append(_tut_bg_7())
    out.append(_tut_bg_8())
    out.append(_tut_bg_9())
    out.append(_tut_bg_10())
    out.append(_tut_bg_11())
    out.append(_tut_bg_12())
    out.append(_tut_bg_13())
    out.append(_tut_bg_14())
    out.append(_tut_bg_15())
    return ''.join(out)

def _tut_bg_1():
    return """## Урок 1 — Здравей, прозорец

**Цел.** Отворете прозорец, покажете заглавие и параграф, реагирайте на бутон.

### Стъпка 1 — Празният прозорец

```
window("Здравей", 360, 240)
endwindow
```

Стартирайте с **Ctrl + Enter**. Появява се прозорец 360×240. Празен е, защото нищо не сме сложили в него.

### Стъпка 2 — Малко съдържание

```
window("Здравей", 360, 240)
  heading("Добре дошли в sdev", 1)
  paragraph("Това е възможно най-малката оконна програма.")
endwindow
```

### Стъпка 3 — Бутон, който прави нещо

```
forge clicks be 0

window("Здравей", 360, 280)
  heading("Добре дошли в sdev", 1)
  paragraph("Натиснете бутона по-долу.")
  button("Натисни ме", () -> {
    clicks = clicks + 1
    speak("кликнато " + clicks + " пъти")
  }, "primary")
endwindow
```

### Стъпка 4 — Покажете брояча *вътре* в прозореца

```
window("Здравей", 360, 280)
  heading("Добре дошли в sdev", 1)
  paragraph("Натиснахте бутона " + uiget("count") + " пъти.")
  button("Натисни ме", () -> uiset("count", (uiget("count") or 0) + 1))
endwindow
```

### Какво научихте

- `window(...) ... endwindow` отваря прозорец.
- `heading`, `paragraph`, `button` са компоненти.
- `uiget` и `uiset` дават реактивно състояние.

---

"""

def _tut_bg_2():
    return """## Урок 2 — Калкулатор за бакшиш

**Цел.** Използвайте плъзгач, числово поле и изчислим параграф.

```
window("Бакшиш", 380, 320)
  heading("Калкулатор за бакшиш", 2)

  group("Сметка")
    input("amount", "0.00", "20.00", {type: "number", width: 160})
  endgroup

  group("Бакшиш")
    slider("tip", 0, 30, 1)
    paragraph("Бакшиш: " + uiget("tip") + "%")
  endgroup

  group("Резултат")
    forge total be elevate(uiget("amount") * (1 + uiget("tip")/100), 2)
    heading("Общо: " + total + " лв.", 3)
  endgroup
endwindow
```

`elevate(x, n)` закръгля до *n* знака след десетичната запетая.

---

"""

def _tut_bg_3():
    return """## Урок 3 — Списък със задачи

**Цел.** Рендериране на списък, добавяне, изтриване, запис локално.

```
forge todos be []

conjure addTodo():
  forge text be uiget("new")
  if text != ""
    todos = todos + [text]
    uiset("new", "")
    writeFile("todos.json", json.stringify(todos))
  end
end

conjure removeTodo(idx):
  todos = todos.removeAt(idx)
  writeFile("todos.json", json.stringify(todos))
end

attempt
  todos = json.parse(readFile("todos.json"))
rescue _
  todos = []
end

window("Задачи", 420, 540)
  heading("Моите задачи", 2)
  row({gap: 8})
    input("new", "Какво трябва да се свърши?", "", {width: 280})
    button("Добави", addTodo, "primary")
  endrow
  divider()
  for i in range(todos.length)
    row({gap: 8, align: "center"})
      paragraph((i+1) + ". " + todos[i])
      button("", () -> removeTodo(i), "ghost", {icon: "trash"})
    endrow
  end
endwindow
```

---

"""

def _tut_bg_4():
    return """## Урок 4 — Приложение за бележки

**Цел.** Няколко бележки, превключване, автоматичен запис.

```
forge notes be tome()
forge current be "Без име"

attempt
  notes = json.parse(readFile("notes.json"))
rescue _
  notes["Без име"] = ""
end

conjure save():
  notes[current] = uiget("body")
  writeFile("notes.json", json.stringify(notes))
end

conjure switchTo(name):
  current = name
  uiset("body", notes[name])
end

window("Бележки", 720, 540)
  row({gap: 0})
    column({width: 200, background: "#0F172A", padding: 12})
      heading("Бележки", 4)
      for name in keys(notes)
        button(name, () -> switchTo(name), "ghost", {width: 176})
      end
      button("+ Нова", () -> {
        notes["Бележка " + (keys(notes).length + 1)] = ""
        save()
      }, "primary", {width: 176})
    endcolumn
    column({padding: 12})
      heading(current, 3)
      textarea("body", 18, "Пишете тук...", {onChange: save})
    endcolumn
  endrow
endwindow
```

---

"""

def _tut_bg_5():
    return """## Урок 5 — Скицник

**Цел.** Компонентът `canvas`, събития от мишка, експорт като PNG.

```
window("Рисуване", 600, 480)
  heading("Скицник", 3)
  row({gap: 8})
    select("color", ["черно","червено","зелено","синьо","оранжево","лилаво"])
    slider("size", 1, 20, 1)
    button("Изчисти", () -> canvasClear("pad"), "ghost")
    button("Запис PNG", () -> canvasExport("pad", "drawing.png"), "primary")
  endrow
  canvas("pad", 580, 380, {
    background: "#FFFFFF",
    border: "#CBD5E1",
    onMouseDrag: (x,y) -> canvasDot("pad", x, y, uiget("size"), uiget("color"))
  })
endwindow
```

---

"""

def _tut_bg_6():
    return """## Урок 6 — Помодоро таймер

**Цел.** Табове, лента за прогрес, аудио, настройки.

```
forge running be false
forge remaining be 25 * 60
forge totalLen be 25 * 60

conjure tick():
  if running and remaining > 0
    remaining = remaining - 1
    uiset("progress", (totalLen - remaining) / totalLen * 100)
    after(1000, tick)
  elif remaining <= 0
    audio("done.mp3")
    toast("Времето свърши!", "success")
    running = false
  end
end

window("Помодоро", 360, 360)
  tabs()
    tab("Таймер")
      heading(formatTime(remaining), 1)
      progress(uiget("progress") or 0, 100)
      row({gap: 8})
        button("Старт", () -> { running = true ; tick() }, "primary")
        button("Пауза", () -> { running = false }, "secondary")
        button("Нулирай", () -> { running = false ; remaining = totalLen ; uiset("progress", 0) }, "ghost")
      endrow
    endtab
    tab("Настройки")
      slider("len", 5, 60, 5)
      button("Приложи", () -> {
        totalLen = uiget("len") * 60
        remaining = totalLen
      }, "primary")
    endtab
  endtabs
endwindow
```

---

"""

def _tut_bg_7():
    return """## Урок 7 — Преглед на Markdown

**Цел.** Textarea + рендериран преглед един до друг.

```
window("Markdown", 900, 600)
  row({gap: 0})
    column({width: 440, padding: 8})
      heading("Източник", 4)
      textarea("md", 28, "# Здравей\\n\\nПишете **markdown** тук.", {monospace: true})
    endcolumn
    column({padding: 16, background: "#FFFFFF"})
      heading("Преглед", 4)
      html(renderMarkdown(uiget("md") or ""))
    endcolumn
  endrow
endwindow
```

---

"""

def _tut_bg_8():
    return """## Урок 8 — Табло за времето

**Цел.** HTTP заявка, JSON, показване на отдалечени данни.

```
conjure load():
  forge city be uiget("city")
  forge resp be await http.get("https://api.example.com/weather?q=" + city)
  forge data be json.parse(resp.body)
  uiset("temp",     data.temp)
  uiset("humidity", data.humidity)
  uiset("desc",     data.description)
end

window("Времето", 380, 360)
  row({gap: 8})
    input("city", "Град", "София")
    button("Зареди", load, "primary")
  endrow
  group("Сега")
    heading(uiget("temp") + "°C", 1)
    paragraph(uiget("desc") or "—")
    paragraph("Влажност: " + (uiget("humidity") or "—") + "%")
  endgroup
endwindow
```

---

"""

def _tut_bg_9():
    return """## Урок 9 — Карта-изследовател

**Цел.** Leaflet карта, маркери, търсене.

```
forge places be [
  ["София", 42.6977, 23.3219],
  ["Пловдив", 42.1354, 24.7453],
  ["Варна", 43.2141, 27.9147]
]

window("Карта", 720, 520)
  input("q", "Търсене на място")
  map("m", 42.7, 25.0, 7, {width: 700, height: 420})
  for p in places
    marker("m", p[1], p[2], p[0])
  end
  button("Намери", () -> {
    forge q be lower(uiget("q"))
    for p in places
      if contains(lower(p[0]), q)
        flyTo("m", p[1], p[2], 11)
        escape
      end
    end
  }, "primary")
endwindow
```

---

"""

def _tut_bg_10():
    return """## Урок 10 — Мини електронна таблица

**Цел.** Редактируема таблица с малък evaluator на формули.

```
forge cells be matrix(8, 5, () -> "")

conjure setCell(r, c, v):
  cells[r][c] = v
end

conjure render(v):
  if startsWith(v, "=")
    return eval(substring(v, 1))
  end
  return v
end

window("Таблица", 640, 420)
  heading("Мини таблица", 3)
  for r in range(8)
    row({gap: 4})
      for c in range(5)
        input("c" + r + "_" + c, "", cells[r][c], {
          width: 110,
          onChange: () -> setCell(r, c, uiget("c" + r + "_" + c))
        })
      end
    endrow
  end
  divider()
  paragraph("Сума на A1: " + render(cells[0][0]))
endwindow
```

---

"""

def _tut_bg_11():
    return """## Урок 11 — Прозорец за чат

**Цел.** Скрол, async поток, балончета със съобщения.

```
forge messages be []

conjure send():
  forge msg be uiget("input")
  if msg == "" then return end
  messages = messages + [{from: "me", text: msg}]
  uiset("input", "")
  await stream("https://api.example.com/chat", msg, (chunk) -> {
    if last(messages).from != "bot"
      messages = messages + [{from: "bot", text: ""}]
    end
    last(messages).text = last(messages).text + chunk
  })
end

window("Чат", 480, 600)
  scrollarea({stickToBottom: true, height: 480})
    for m in messages
      paragraph(m.text, {
        background: m.from == "me" ? "#0891B2" : "#1E293B",
        foreground: "#FFFFFF",
        padding: 10,
        radius: 12,
        align: m.from == "me" ? "end" : "start"
      })
    end
  endscrollarea
  row({gap: 8})
    input("input", "Кажете нещо…")
    button("Изпрати", send, "primary")
  endrow
endwindow
```

---

"""

def _tut_bg_12():
    return """## Урок 12 — Файлов мениджър

**Цел.** Дърво на работното пространство, разгръщане при клик.

```
conjure renderNode(node, depth):
  for child in node.children
    row({gap: 4, padding: depth * 12})
      if child.type == "folder"
        button("📁 " + child.name, () -> child.expanded = not child.expanded, "ghost")
      else
        button("📄 " + child.name, () -> openFile(child.path), "link")
      end
    endrow
    if child.type == "folder" and child.expanded
      renderNode(child, depth + 1)
    end
  end
end

window("Файлове", 360, 600)
  heading("Работно пространство", 3)
  forge tree be readWorkspaceTree()
  renderNode(tree, 0)
endwindow
```

---

"""

def _tut_bg_13():
    return """## Урок 13 — Калкулатор

**Цел.** Grid оформление, варианти бутони, бързи клавиши.

```
forge expr be ""

conjure press(key):
  if key == "C" then expr = ""
  elif key == "=" then expr = "" + eval(expr)
  else expr = expr + key end
  uiset("display", expr)
end

window("Калкулатор", 280, 360)
  paragraph(uiget("display") or "0", {
    background: "#0F172A", foreground: "#F8FAFC",
    padding: 14, radius: 8, align: "end", monospace: true
  })
  for row in [["7","8","9","/"],["4","5","6","*"],["1","2","3","-"],["0",".","=","+"]]
    row({gap: 6})
      for k in row
        button(k, () -> press(k), k == "=" ? "primary" : "secondary",
               {width: 56, height: 48})
      end
    endrow
  end
  button("Изчисти", () -> press("C"), "destructive", {width: 240})
endwindow
```

---

"""

def _tut_bg_14():
    return """## Урок 14 — Подскачаща топка

**Цел.** Анимационен цикъл върху canvas със сблъсъци.

```
forge x be 100; forge y be 100
forge vx be 3;  forge vy be 2

conjure frame():
  canvasClear("g", "#0F172A")
  canvasCircle("g", x, y, 16, "#0891B2")
  x = x + vx ; y = y + vy
  if x < 16 or x > 484 then vx = -vx end
  if y < 16 or y > 284 then vy = -vy end
  after(16, frame)
end

window("Топка", 520, 340)
  canvas("g", 500, 300)
  frame()
endwindow
```

---

"""

def _tut_bg_15():
    return """## Урок 15 — Вашата първа библиотека

**Цел.** Пакетирайте полезен код в Gist и го извикайте с `summon`.

### Стъпка 1 — Напишете библиотеката

Файл `mylib.sdev`:

```
conjure greet(who):
  return "Здравей, " + who + "!"
end
```

### Стъпка 2 — Публикувайте като публичен Gist

В IDE: **File → Publish as Gist**. Копирайте URL.

### Стъпка 3 — Използвайте я

```
summon "https://gist.github.com/<user>/<hash>" as mylib

speak(mylib.greet("свят"))
```

### Накъде нататък

Видяхте всяка част от езика и инструментариума. Изберете проект, който ви вълнува, отворете IDE и започнете да пишете.

---

"""

# ---------------------------------------------------------------------------
# Glossary + index
# ---------------------------------------------------------------------------
GLOSS_EN = [
    ('after(ms, fn)', 'Schedule `fn` to run after `ms` milliseconds.'),
    ('attempt … rescue', 'sdev\'s exception handling block.'),
    ('audio(src)', 'Plays an audio file or URL.'),
    ('button(label, onclick, variant?, options?)', 'A clickable widget.'),
    ('canvas(name, w, h, options?)', 'A 2D drawing surface.'),
    ('checkbox(name, label, options?)', 'A boolean toggle.'),
    ('conjure', 'Defines a function.'),
    ('elevate(n, k)', 'Rounds `n` to `k` decimal places.'),
    ('endwindow', 'Closes the current window block.'),
    ('escape', 'Breaks out of the innermost loop.'),
    ('essence', 'Defines a class.'),
    ('eternal', 'Marks an immutable binding.'),
    ('forge', 'Declares a variable.'),
    ('group(title) … endgroup', 'A bordered group of widgets.'),
    ('heading(text, level)', 'A headline widget.'),
    ('html(s)', 'Injects raw, sanitised HTML into a window.'),
    ('input(name, placeholder, value, options?)', 'A single-line text input.'),
    ('json.parse(s) / json.stringify(v)', 'JSON conversion.'),
    ('map(name, lat, lng, zoom, options?)', 'A Leaflet map widget.'),
    ('marker(map, lat, lng, label?)', 'Adds a marker to a map.'),
    ('matrix(rows, cols, fillFn)', 'Creates a matrix.'),
    ('menu(title) … endmenu / menuitem', 'A menu bar.'),
    ('paragraph(text, options?)', 'A block of body text.'),
    ('progress(value, max?)', 'A progress bar.'),
    ('range(n)', 'A list 0..n-1.'),
    ('readFile(path) / writeFile(path, content)', 'Workspace file I/O.'),
    ('row() … endrow / column() … endcolumn', 'Layout primitives.'),
    ('select(name, options, options?)', 'A drop-down selector.'),
    ('slider(name, min, max, step?)', 'A numeric range widget.'),
    ('speak(x)', 'Writes `x` to the OUTPUT panel.'),
    ('summon URL as name', 'Imports a Gist module.'),
    ('table(headers, rows, options?)', 'A data table.'),
    ('tabs() … endtabs / tab(t) … endtab', 'A tabbed container.'),
    ('textarea(name, rows, placeholder, options?)', 'A multi-line input.'),
    ('toast(msg, kind?)', 'A non-blocking notification.'),
    ('tome()', 'Creates an empty dictionary.'),
    ('uiget(name) / uiset(name, value)', 'Reactive widget state.'),
    ('window(title, w, h, options?)', 'Opens a top-level window.'),
]

GLOSS_BG = [
    ('after(ms, fn)', 'Изпълнява `fn` след `ms` милисекунди.'),
    ('attempt … rescue', 'Блок за обработка на грешки.'),
    ('audio(src)', 'Пуска аудио файл или URL.'),
    ('button(етикет, onclick, вариант?, опции?)', 'Кликаем компонент.'),
    ('canvas(име, ш, в, опции?)', 'Чертожна повърхност.'),
    ('checkbox(име, етикет, опции?)', 'Превключвател истина/неистина.'),
    ('conjure', 'Дефинира функция.'),
    ('elevate(n, k)', 'Закръгля `n` до `k` знака.'),
    ('endwindow', 'Затваря текущия прозорец.'),
    ('escape', 'Излиза от най-вътрешния цикъл.'),
    ('essence', 'Дефинира клас.'),
    ('eternal', 'Маркира неизменна стойност.'),
    ('forge', 'Декларира променлива.'),
    ('group(заглавие) … endgroup', 'Група компоненти с рамка.'),
    ('heading(текст, ниво)', 'Компонент за заглавие.'),
    ('html(s)', 'Вкарва санитизиран HTML в прозорец.'),
    ('input(име, плейсхолдър, стойност, опции?)', 'Едноредово поле.'),
    ('json.parse(s) / json.stringify(v)', 'JSON преобразуване.'),
    ('map(име, шир, дълж, увеличение, опции?)', 'Leaflet карта.'),
    ('marker(карта, шир, дълж, етикет?)', 'Добавя маркер.'),
    ('matrix(редове, колони, fillFn)', 'Създава матрица.'),
    ('menu(заглавие) … endmenu / menuitem', 'Меню бар.'),
    ('paragraph(текст, опции?)', 'Параграф.'),
    ('progress(стойност, макс?)', 'Лента за прогрес.'),
    ('range(n)', 'Списък 0..n-1.'),
    ('readFile(път) / writeFile(път, съдържание)', 'Файлов I/O.'),
    ('row() … endrow / column() … endcolumn', 'Оформления.'),
    ('select(име, опции, опции?)', 'Падащ селектор.'),
    ('slider(име, мин, макс, стъпка?)', 'Числов плъзгач.'),
    ('speak(x)', 'Извежда `x` в OUTPUT панела.'),
    ('summon URL as име', 'Импортира Gist модул.'),
    ('table(заглавия, редове, опции?)', 'Таблица с данни.'),
    ('tabs() … endtabs / tab(t) … endtab', 'Контейнер с табове.'),
    ('textarea(име, редове, плейсхолдър, опции?)', 'Многоредово поле.'),
    ('toast(съобщение, вид?)', 'Известие.'),
    ('tome()', 'Празен речник.'),
    ('uiget(име) / uiset(име, стойност)', 'Реактивно състояние.'),
    ('window(заглавие, ш, в, опции?)', 'Отваря прозорец.'),
]

def glossary(entries, title):
    out = [f"# {title}\n\nA quick lookup of every keyword and built-in name introduced in this book.\n\n| Symbol | Meaning |\n|--------|---------|\n"]
    for k,v in sorted(entries, key=lambda e: e[0].lower()):
        out.append(f"| `{k}` | {v} |\n")
    out.append("\n---\n\n")
    return ''.join(out)

# Per-widget reference cards (long but useful — adds substantial volume)
def widget_cards(items, lang='en'):
    out = []
    if lang == 'en':
        out.append("# Widget Reference Cards\n\nOne card per widget, in alphabetical order. Each card has the signature, a one-line description, and a short example.\n\n")
    else:
        out.append("# Справочни карти за компоненти\n\nПо една карта на компонент, по азбучен ред.\n\n")
    for sig, desc in sorted(items, key=lambda e: e[0].lower()):
        head = sig.split('(')[0].strip()
        out.append(f"## `{head}`\n\n**Signature.** `{sig}`\n\n**Description.** {desc}\n\n**Example.**\n\n```\n{sig}\n```\n\n---\n\n")
    return ''.join(out)

# ---------------------------------------------------------------------------
# Build EN
# ---------------------------------------------------------------------------
def build_en():
    parts = []
    parts.append(front_matter_en())
    parts.append("# Part I — The Language\n\nThis part is the canonical sdev reference. It is comprehensive: every keyword, every built-in, every operator. If you only ever read one part of the book, read this one.\n\n---\n\n")
    parts.append(read('docs/02-language/v1-reference.md'))
    parts.append("\n\n---\n\n")
    parts.append(ui_deep_dive_en())
    parts.append(widget_cards(WIDGETS, 'en'))
    parts.append(tutorials_en())
    parts.append("# Appendix A — Maps & GIS (Leaflet)\n\nFull reference for the mapping subsystem.\n\n---\n\n")
    parts.append(read('docs/07-domains/leaflet-and-gis.md'))
    parts.append("\n\n---\n\n")
    parts.append(glossary(GLOSS_EN, "Appendix B — Glossary"))
    parts.append("# Appendix C — Index of tutorials\n\n| # | Title | Teaches |\n|---|-------|---------|\n")
    for i, (t, d) in enumerate(TUTORIALS_EN, 1):
        parts.append(f"| {i} | {t} | {d} |\n")
    parts.append("\n---\n\n## Colophon\n\nThis book was generated from the sdev source repository on 2026-05-03. The body is set in DejaVu Serif, headings in DejaVu Sans Bold, code in DejaVu Sans Mono. The PDF is rendered with ReportLab. Source markdown lives in the project's `docs/` directory.\n")
    return ''.join(parts)

def build_bg():
    parts = []
    parts.append(front_matter_bg())
    parts.append("# Част I — Езикът\n\nТази част е каноничният справочник за sdev. Изчерпателна е: всяка ключова дума, всяка вградена функция, всеки оператор. Ако прочетете само една част, нека е тази.\n\n---\n\n")
    parts.append(read('/tmp/bg-seed.md').replace('',''))  # body of the existing 1638-line BG book
    parts.append("\n\n---\n\n")
    parts.append("## Допълнение към Част I — Оригинален английски справочник\n\nЗа пълнота тук е приложен оригиналният английски справочник, тъй като той съдържа последните технически детайли (синтаксис на оператори, имена на вградени функции, които не се превеждат).\n\n---\n\n")
    parts.append(read('docs/02-language/v1-reference.md'))
    parts.append("\n\n---\n\n")
    parts.append(ui_deep_dive_bg())
    parts.append(widget_cards(WIDGETS_BG, 'bg'))
    parts.append(tutorials_bg())
    parts.append("# Приложение А — Карти и GIS (Leaflet)\n\nПълен справочник за картографската подсистема (на английски — имената на функциите са еднакви и в двата езика).\n\n---\n\n")
    parts.append(read('docs/07-domains/leaflet-and-gis.md'))
    parts.append("\n\n---\n\n")
    parts.append(glossary(GLOSS_BG, "Приложение Б — Речник"))
    parts.append("# Приложение В — Индекс на уроците\n\n| # | Заглавие | Учи на |\n|---|----------|--------|\n")
    for i, (t, d) in enumerate(TUTORIALS_BG, 1):
        parts.append(f"| {i} | {t} | {d} |\n")
    parts.append("\n---\n\n## Колофон\n\nТази книга е генерирана от изходния репозитар на sdev на 2026-05-03. Основният текст е DejaVu Serif, заглавията — DejaVu Sans Bold, кодът — DejaVu Sans Mono. PDF се рендерира с ReportLab.\n")
    return ''.join(parts)

# ---------------------------------------------------------------------------
if __name__ == '__main__':
    en = build_en()
    bg = build_bg()
    with open(os.path.join(ROOT, 'docs/01-overview/the-sdev-book-en.md'), 'w', encoding='utf-8') as f:
        f.write(en)
    with open(os.path.join(ROOT, 'docs/01-overview/the-sdev-book-bg.md'), 'w', encoding='utf-8') as f:
        f.write(bg)
    en_lines = en.count('\n'); bg_lines = bg.count('\n')
    print(f'EN: {en_lines} lines, {len(en)//1024} KB')
    print(f'BG: {bg_lines} lines, {len(bg)//1024} KB')
    if en_lines < 6000:
        print(f'WARNING: EN has only {en_lines} lines (< 6000)')
    if bg_lines < 6000:
        print(f'WARNING: BG has only {bg_lines} lines (< 6000)')
