const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Header, Footer,
  PageNumber, TableOfContents, PageBreak, LevelFormat, ImageRun,
} = require('docx');

const ROOT = path.join(__dirname, '..');
const FONT = 'Times New Roman';
const STUDENT_NAME = 'Duong Hoang Long';
const STUDENT_ID = '105997178';
const TOPIC = 'What is the effectiveness of ethics guidelines and principles in practice?';

// Body of a draft file: from the first "## " heading, minus draft-only notes.
function body(file) {
  const lines = fs.readFileSync(path.join(ROOT, 'report', file), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.startsWith('## '));
  return lines.slice(start).filter((l) =>
    l.trim() !== '---' && !l.startsWith('*Word count') && !l.startsWith('*See [') && !l.startsWith('**Source types:**'));
}

function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m;
  const clean = text.replace(/`/g, '');
  while ((m = re.exec(clean))) {
    if (m.index > last) out.push(new TextRun({ text: clean.slice(last, m.index), ...base }));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(new TextRun({ text: tok.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: tok.slice(1, -1), italics: true, ...base }));
    last = m.index + tok.length;
  }
  if (last < clean.length) out.push(new TextRun({ text: clean.slice(last), ...base }));
  return out;
}

const BODY_SPACING = { line: 360, after: 160 };
const FIGURE_WORDS = 50; // the brief counts each figure as 50 words
const TEXT_WIDTH_PX = 576; // 6 inches at 96 dpi, inside 1-inch A4 margins
let wordCount = 0;

// Width and height of a PNG, read from its IHDR chunk.
function pngSize(buf) { return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }; }
const count = (t) => { wordCount += t.replace(/[*`]/g, '').split(/\s+/).filter(Boolean).length; };

function render(lines, { counted = false, hanging = false, pageBreakH1 = true } = {}) {
  const out = [];
  let firstH1 = true;
  let inFigure = false;
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    const img = l.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
    if (img) {
      const data = fs.readFileSync(path.join(ROOT, 'report', img[1]));
      const { width, height } = pngSize(data);
      if (counted) wordCount += FIGURE_WORDS;
      out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [
        new ImageRun({ type: 'png', data, transformation: { width: TEXT_WIDTH_PX, height: Math.round(TEXT_WIDTH_PX * height / width) } }),
      ] }));
      continue;
    }
    if (/^\*\*Figure \d+\*\*$/.test(l)) inFigure = true;
    if (inFigure) {
      // APA 7 figure block: bold number, italic title, image, then a note.
      const isNote = l.startsWith('*Note.*');
      if (counted) count(l);
      out.push(new Paragraph({ keepNext: !isNote, spacing: { before: /^\*\*Figure/.test(l) ? 240 : 0, after: isNote ? 240 : 120 },
        children: runs(l, isNote ? { size: 20 } : {}) }));
      if (isNote) inFigure = false;
      continue;
    }
    if (l.startsWith('### ')) {
      if (counted) count(l.slice(4));
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(l.slice(4))] }));
    } else if (l.startsWith('## ')) {
      if (counted) count(l.slice(3));
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreakH1 && firstH1, children: [new TextRun(l.slice(3))] }));
      firstH1 = false;
    } else if (/^\d+\.\s/.test(l)) {
      const t = l.replace(/^\d+\.\s/, '');
      if (counted) count(t);
      out.push(new Paragraph({ numbering: { reference: 'num-' + lines.id, level: 0 }, spacing: BODY_SPACING, children: runs(t) }));
    } else if (l.startsWith('- ')) {
      if (counted) count(l.slice(2));
      out.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: BODY_SPACING, children: runs(l.slice(2)) }));
    } else {
      if (counted) count(l);
      out.push(new Paragraph({
        spacing: BODY_SPACING,
        alignment: hanging ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
        indent: hanging ? { left: 720, hanging: 720 } : undefined,
        children: runs(l),
      }));
    }
  }
  return out;
}

const tag = (lines, id) => { lines.id = id; return lines; };
const exec = render(tag(body('00-executive-summary.md'), 'exec'));
const intro = render(tag(body('01-introduction.md'), 'intro'), { counted: true });
const findings = render(tag(body('02-findings.md'), 'findings'), { counted: true, pageBreakH1: false });
const concl = render(tag(body('03-conclusion.md'), 'concl'), { counted: true, pageBreakH1: false });
const ack = render(tag(body('04-acknowledgements.md'), 'ack'));
const refLines = fs.readFileSync(path.join(ROOT, 'report', 'references.md'), 'utf8').split('\n')
  .filter((l) => l.trim() && !l.startsWith('# ') && l.trim() !== '---' && !l.startsWith('**Source types:**'));
const refs = [new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun('References')] }),
  ...render(refLines, { hanging: true })];

const center = (text, opts = {}, after = 240) => new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after }, children: [new TextRun({ text, ...opts })],
});
const cover = [
  new Paragraph({ spacing: { before: 2400 }, children: [] }),
  center('COS30019 Introduction to AI', { size: 32 }),
  center('Assignment 1: Research into AI Ethics and Responsible AI', { size: 28 }, 960),
  center('The Effectiveness of AI Ethics Guidelines and Principles in Practice', { size: 44, bold: true }, 480),
  center('Topic 6: ' + TOPIC, { size: 24, italics: true }, 1920),
  center('Student name: ' + STUDENT_NAME, { size: 26 }),
  center('Student ID: ' + STUDENT_ID, { size: 26 }),
  center('Due date: 18 October 2026', { size: 26 }),
  center('Drafts and progress (GitHub): https://github.com/longduongnc/COS30019-Assignment1', { size: 22 }),
  center(`Word count (main report, Figure 1 counted as 50 words): ${wordCount.toLocaleString('en-AU')}`, { size: 26 }),
  new Paragraph({ children: [new PageBreak()] }),
];

const toc = [
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: 'Table of Contents', bold: true, size: 32 })] }),
  new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' }),
];

const numbered = (id) => ({
  reference: 'num-' + id,
  levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
});

const doc = new Document({
  features: { updateFields: true },
  creator: STUDENT_NAME,
  title: 'The Effectiveness of AI Ethics Guidelines and Principles in Practice',
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 32, bold: true, color: '000000' }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 26, bold: true, color: '000000' }, paragraph: { spacing: { before: 280, after: 140 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ...['exec', 'intro', 'findings', 'concl', 'ack'].map(numbered),
    ],
  },
  sections: [
    { properties: { titlePage: true, page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `COS30019 Assignment 1  |  ${STUDENT_NAME}  |  ${STUDENT_ID}`, size: 18, color: '555555' })] })] }),
        first: new Header({ children: [new Paragraph({ children: [] })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: 'Page ', size: 18, color: '555555' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '555555' }),
          new TextRun({ text: ' of ', size: 18, color: '555555' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '555555' }),
        ] })] }),
        first: new Footer({ children: [new Paragraph({ children: [] })] }),
      },
      children: [...cover, ...toc, ...exec, ...intro, ...findings, ...concl, ...ack, ...refs],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(ROOT, process.argv[2] || STUDENT_ID + '.docx');
  fs.writeFileSync(out, buf);
  console.log('wrote', out, '| main report words:', wordCount);
});
