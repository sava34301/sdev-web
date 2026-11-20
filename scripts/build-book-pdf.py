#!/usr/bin/env python3
"""Build a designed PDF book from the sdev markdown sources."""
import re, os, sys, html
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Preformatted, KeepTogether, Table, TableStyle, NextPageTemplate,
    Image as RLImage,
)
from reportlab.platypus.tableofcontents import TableOfContents

FONT_DIR = '/tmp/fonts'
pdfmetrics.registerFont(TTFont('Body',       f'{FONT_DIR}/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('Body-Bold',  f'{FONT_DIR}/DejaVuSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Body-Italic',f'{FONT_DIR}/DejaVuSerif-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Body-BoldItalic',f'{FONT_DIR}/DejaVuSerif-BoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('Display',    f'{FONT_DIR}/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Sans',       f'{FONT_DIR}/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('Mono',       f'{FONT_DIR}/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('Mono-Bold',  f'{FONT_DIR}/DejaVuSansMono-Bold.ttf'))

from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('Body', normal='Body', bold='Body-Bold',
                   italic='Body-Italic', boldItalic='Body-BoldItalic')

# Brand
INK     = HexColor('#0F172A')
ACCENT  = HexColor('#0891B2')   # cyan-700
PURPLE  = HexColor('#6D28D9')
MUTED   = HexColor('#475569')
LINE    = HexColor('#CBD5E1')
CODE_BG = HexColor('#F1F5F9')
CODE_FG = HexColor('#0F172A')

PAGE_W, PAGE_H = A5
MARGIN_OUT = 16*mm
MARGIN_IN  = 22*mm
MARGIN_TOP = 22*mm
MARGIN_BOT = 22*mm

styles = {
    'body': ParagraphStyle('body', fontName='Body', fontSize=10.5, leading=15,
                           textColor=INK, alignment=TA_JUSTIFY, spaceAfter=6),
    'h1':   ParagraphStyle('h1', fontName='Display', fontSize=26, leading=30,
                           textColor=INK, spaceBefore=0, spaceAfter=14),
    'h2':   ParagraphStyle('h2', fontName='Display', fontSize=18, leading=22,
                           textColor=ACCENT, spaceBefore=18, spaceAfter=8),
    'h3':   ParagraphStyle('h3', fontName='Display', fontSize=13.5, leading=17,
                           textColor=PURPLE, spaceBefore=12, spaceAfter=4),
    'h4':   ParagraphStyle('h4', fontName='Body-Bold', fontSize=11.5, leading=15,
                           textColor=INK, spaceBefore=8, spaceAfter=3),
    'list': ParagraphStyle('list', fontName='Body', fontSize=10.5, leading=15,
                           leftIndent=14, bulletIndent=4, textColor=INK, spaceAfter=2),
    'code': ParagraphStyle('code', fontName='Mono', fontSize=8.6, leading=11.5,
                           textColor=CODE_FG, leftIndent=8, rightIndent=8,
                           spaceBefore=4, spaceAfter=8, backColor=CODE_BG,
                           borderPadding=(6,8,6,8), borderRadius=3),
    'quote':ParagraphStyle('quote', fontName='Body-Italic', fontSize=10.5,
                           leading=15, leftIndent=14, rightIndent=14,
                           textColor=MUTED, spaceAfter=8),
    'caption': ParagraphStyle('cap', fontName='Sans', fontSize=8, leading=10,
                              textColor=MUTED, alignment=TA_CENTER),
    'chapter_eyebrow': ParagraphStyle('eb', fontName='Sans', fontSize=9, leading=12,
                                      textColor=ACCENT, alignment=TA_LEFT,
                                      spaceAfter=4, spaceBefore=0),
    'chapter_title':   ParagraphStyle('ct', fontName='Display', fontSize=34, leading=40,
                                      textColor=INK, alignment=TA_LEFT, spaceAfter=12),
    'cover_title': ParagraphStyle('cv', fontName='Display', fontSize=58, leading=62,
                                  textColor=INK, alignment=TA_LEFT),
    'cover_sub':   ParagraphStyle('cs', fontName='Body-Italic', fontSize=14, leading=18,
                                  textColor=MUTED, alignment=TA_LEFT),
    'toc1': ParagraphStyle('toc1', fontName='Body-Bold', fontSize=11, leading=15,
                           textColor=INK, leftIndent=0, spaceBefore=4),
    'toc2': ParagraphStyle('toc2', fontName='Body', fontSize=10, leading=14,
                           textColor=MUTED, leftIndent=14),
    'toc3': ParagraphStyle('toc3', fontName='Body', fontSize=9.5, leading=13,
                           textColor=MUTED, leftIndent=28),
}

# ---------- markdown helpers ----------
INLINE_CODE = re.compile(r'`([^`]+)`')
BOLD = re.compile(r'\*\*([^\*]+)\*\*')
ITAL = re.compile(r'(?<!\*)\*([^\*]+)\*(?!\*)')
LINK = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')

def inline(text):
    # Extract inline code spans first as placeholders so other regex can't run inside them
    placeholders = []
    def _stash_code(m):
        placeholders.append(m.group(1))
        return f'\x00CODE{len(placeholders)-1}\x00'
    text = INLINE_CODE.sub(_stash_code, text)
    link_phs = []
    def _stash_link(m):
        link_phs.append((m.group(1), m.group(2)))
        return f'\x00LINK{len(link_phs)-1}\x00'
    text = LINK.sub(_stash_link, text)

    text = html.escape(text, quote=False)
    text = BOLD.sub(r'<b>\1</b>', text)
    text = ITAL.sub(r'<i>\1</i>', text)

    def _restore_code(m):
        idx = int(m.group(1)); raw = placeholders[idx]
        return f'<font face="Mono" size="9" color="#6D28D9">{html.escape(raw, quote=False)}</font>'
    text = re.sub(r'\x00CODE(\d+)\x00', _restore_code, text)
    def _restore_link(m):
        idx = int(m.group(1)); label, url = link_phs[idx]
        return f'<font color="#0891B2"><u>{html.escape(label, quote=False)}</u></font>'
    text = re.sub(r'\x00LINK(\d+)\x00', _restore_link, text)
    return text

def code_escape(text):
    return text.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

# ---------- doc template ----------
class BookDoc(BaseDocTemplate):
    def __init__(self, filename, title, **kw):
        super().__init__(filename, pagesize=A5, leftMargin=MARGIN_IN, rightMargin=MARGIN_OUT,
                         topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOT, title=title, **kw)
        self.book_title = title
        self.current_chapter = ''

        cover_frame = Frame(0, 0, PAGE_W, PAGE_H, leftPadding=0, rightPadding=0,
                            topPadding=0, bottomPadding=0, id='cover')
        body_frame = Frame(MARGIN_IN, MARGIN_BOT, PAGE_W - MARGIN_IN - MARGIN_OUT,
                           PAGE_H - MARGIN_TOP - MARGIN_BOT, id='body')
        chap_frame = Frame(MARGIN_IN, MARGIN_BOT, PAGE_W - MARGIN_IN - MARGIN_OUT,
                           PAGE_H - MARGIN_TOP - MARGIN_BOT - 60, id='chap')

        self.addPageTemplates([
            PageTemplate(id='Cover',   frames=[cover_frame], onPage=self._draw_cover_bg),
            PageTemplate(id='Body',    frames=[body_frame],  onPage=self._draw_body_chrome),
            PageTemplate(id='Chapter', frames=[chap_frame],  onPage=self._draw_chapter_chrome),
        ])

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph):
            style = flowable.style.name
            txt = flowable.getPlainText()
            if style == 'h1':
                self.current_chapter = txt
                self.notify('TOCEntry', (0, txt, self.page))
            elif style == 'h2':
                self.notify('TOCEntry', (1, txt, self.page))
            elif style == 'h3':
                self.notify('TOCEntry', (2, txt, self.page))

    def _draw_cover_bg(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(HexColor('#F8FAFC'))
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        # accent bar
        canvas.setFillColor(ACCENT)
        canvas.rect(0, PAGE_H - 80*mm, 28*mm, 12*mm, fill=1, stroke=0)
        canvas.setFillColor(PURPLE)
        canvas.rect(28*mm, PAGE_H - 80*mm, 12*mm, 12*mm, fill=1, stroke=0)
        # tiny grid
        canvas.setStrokeColor(HexColor('#E2E8F0'))
        canvas.setLineWidth(0.3)
        for x in range(0, int(PAGE_W), int(6*mm)):
            canvas.line(x, 0, x, 30*mm)
        canvas.restoreState()

    def _draw_body_chrome(self, canvas, doc):
        canvas.saveState()
        # running header
        canvas.setFont('Sans', 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN_IN, PAGE_H - 12*mm, self.book_title.upper())
        canvas.drawRightString(PAGE_W - MARGIN_OUT, PAGE_H - 12*mm,
                               (self.current_chapter or '').upper()[:60])
        canvas.setStrokeColor(LINE); canvas.setLineWidth(0.4)
        canvas.line(MARGIN_IN, PAGE_H - 13.5*mm, PAGE_W - MARGIN_OUT, PAGE_H - 13.5*mm)
        # page number
        canvas.setFont('Sans', 9); canvas.setFillColor(INK)
        canvas.drawCentredString(PAGE_W/2, 10*mm, str(doc.page))
        canvas.restoreState()

    def _draw_chapter_chrome(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(ACCENT)
        canvas.rect(0, PAGE_H - 8*mm, PAGE_W, 4*mm, fill=1, stroke=0)
        canvas.setFont('Sans', 9); canvas.setFillColor(INK)
        canvas.drawCentredString(PAGE_W/2, 10*mm, str(doc.page))
        canvas.restoreState()

# ---------- markdown parser → flowables ----------
def parse_markdown(md_text, lang='en'):
    flows = []
    lines = md_text.split('\n')
    i = 0
    in_code = False
    code_buf = []
    chapter_idx = 0

    while i < len(lines):
        ln = lines[i]
        if ln.startswith('```'):
            if in_code:
                src = '\n'.join(code_buf)
                flows.append(Preformatted(code_escape(src), styles['code']))
                code_buf = []; in_code = False
            else:
                in_code = True
            i += 1; continue
        if in_code:
            code_buf.append(ln); i += 1; continue

        if ln.startswith('# '):
            chapter_idx += 1
            title = ln[2:].strip()
            flows.append(NextPageTemplate('Chapter'))
            flows.append(PageBreak())
            eyebrow = 'CHAPTER' if lang == 'en' else 'ГЛАВА'
            flows.append(Spacer(1, 60*mm))
            flows.append(Paragraph(f'{eyebrow} {chapter_idx:02d}', styles['chapter_eyebrow']))
            flows.append(Paragraph(inline(title), styles['chapter_title']))
            # divider
            flows.append(Spacer(1, 4*mm))
            flows.append(NextPageTemplate('Body'))
            flows.append(PageBreak())
            # also mark for TOC
            p = Paragraph(inline(title), styles['h1'])
            p._bookmarkName = f'ch{chapter_idx}'
            flows.append(p)
        elif ln.startswith('## '):
            flows.append(Paragraph(inline(ln[3:].strip()), styles['h2']))
        elif ln.startswith('### '):
            flows.append(Paragraph(inline(ln[4:].strip()), styles['h3']))
        elif ln.startswith('#### '):
            flows.append(Paragraph(inline(ln[5:].strip()), styles['h4']))
        elif ln.startswith('> '):
            flows.append(Paragraph(inline(ln[2:].strip()), styles['quote']))
        elif re.match(r'^[\-\*] ', ln):
            flows.append(Paragraph(inline(ln[2:].strip()), styles['list'], bulletText='•'))
        elif re.match(r'^\d+\. ', ln):
            num, rest = ln.split('. ', 1)
            flows.append(Paragraph(inline(rest.strip()), styles['list'], bulletText=f'{num}.'))
        elif ln.strip() == '---':
            flows.append(Spacer(1, 4))
        elif ln.strip() == '':
            flows.append(Spacer(1, 3))
        else:
            # accumulate paragraph
            buf = [ln]
            while i+1 < len(lines) and lines[i+1].strip() and not re.match(r'^(#{1,4} |```|> |[\-\*] |\d+\. |---)', lines[i+1]):
                i += 1; buf.append(lines[i])
            flows.append(Paragraph(inline(' '.join(buf).strip()), styles['body']))
        i += 1
    return flows

# ---------- cover ----------
def build_cover(title, subtitle, edition_label):
    out = []
    out.append(NextPageTemplate('Cover'))
    out.append(Spacer(1, 30*mm))
    # Big title with custom frame using a Table for layout control? simpler: spacers
    tbl = Table([[Paragraph(title, styles['cover_title'])]],
                colWidths=[PAGE_W - 2*MARGIN_IN])
    tbl.setStyle(TableStyle([('LEFTPADDING',(0,0),(-1,-1),MARGIN_IN),
                             ('RIGHTPADDING',(0,0),(-1,-1),MARGIN_OUT),
                             ('TOPPADDING',(0,0),(-1,-1),0),
                             ('BOTTOMPADDING',(0,0),(-1,-1),0)]))
    out.append(Spacer(1, 60*mm))
    out.append(tbl)
    sub_tbl = Table([[Paragraph(subtitle, styles['cover_sub'])]],
                    colWidths=[PAGE_W - 2*MARGIN_IN])
    sub_tbl.setStyle(TableStyle([('LEFTPADDING',(0,0),(-1,-1),MARGIN_IN),
                                 ('RIGHTPADDING',(0,0),(-1,-1),MARGIN_OUT),
                                 ('TOPPADDING',(0,0),(-1,-1),8)]))
    out.append(sub_tbl)
    # bottom edition label
    out.append(Spacer(1, 60*mm))
    edition_tbl = Table([[Paragraph(f'<font face="Sans" size="9" color="#475569">{edition_label}</font>',
                                    ParagraphStyle('e', fontName='Sans', fontSize=9))]],
                        colWidths=[PAGE_W - 2*MARGIN_IN])
    edition_tbl.setStyle(TableStyle([('LEFTPADDING',(0,0),(-1,-1),MARGIN_IN)]))
    out.append(edition_tbl)
    out.append(NextPageTemplate('Body'))
    out.append(PageBreak())
    return out

def build_toc(label):
    out = []
    out.append(Paragraph(label, styles['h1']))
    toc = TableOfContents()
    toc.levelStyles = [styles['toc1'], styles['toc2'], styles['toc3']]
    out.append(toc)
    out.append(PageBreak())
    return out

# ---------- main ----------
def build(md_path, out_path, title, subtitle, lang, toc_label, edition_label, extra_md_paths=None):
    with open(md_path, 'r', encoding='utf-8') as f:
        md = f.read()
    if extra_md_paths:
        for p in extra_md_paths:
            with open(p, 'r', encoding='utf-8') as f:
                md += '\n\n' + f.read()

    doc = BookDoc(out_path, title=title)
    story = []
    story += build_cover(title, subtitle, edition_label)
    story += build_toc(toc_label)
    story += parse_markdown(md, lang=lang)
    # multi-build for TOC
    doc.multiBuild(story)
    print(f'wrote {out_path} ({os.path.getsize(out_path)//1024} KB)')

if __name__ == '__main__':
    os.makedirs('/mnt/documents', exist_ok=True)
    build('docs/01-overview/the-sdev-book-en.md', '/mnt/documents/sdev-book-en.pdf',
          title='The sdev Book',
          subtitle='A Complete Guide to the sdev Programming Language',
          lang='en', toc_label='Table of Contents',
          edition_label='First Edition · 2026',
          extra_md_paths=['docs/02-language/v1-reference.md'])
    build('docs/01-overview/the-sdev-book-bg.md', '/mnt/documents/sdev-book-bg.pdf',
          title='Книгата за sdev',
          subtitle='Пълно ръководство за програмния език sdev',
          lang='bg', toc_label='Съдържание',
          edition_label='Първо издание · 2026')
