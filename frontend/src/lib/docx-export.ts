// Export one lesson to Word (.docx) or PDF (browser print dialog). No dependencies: a minimal
// OOXML package inside a store-only ZIP (CRC-32 written here), and a styled print page for
// "Save as PDF". Both formats share one flat list of blocks, so they always say the same thing.
// ponytail: store-only ZIP and plain styles, no images or tables; a teacher gets a clean outline to edit.

export const EXPORT_DISCLAIMER = 'Nội dung minh họa, chưa được chuyên gia duyệt';

export type ExportLesson = {
  id?: string;
  title?: string;
  subtitle?: string;
  date?: string;
  status?: string;
  subject?: string;
  class?: string;
  disclaimer?: string;
  objectives?: string;
  introSummary?: string;
  sections?: {
    title?: string;
    timeLabel?: string;
    narration?: string;
    caption?: string;
    source?: { book?: string; chapter?: string; quote?: string; note?: string };
  }[];
  keyNotes?: string[];
  questions?: { text?: string; guide?: string; options?: { text?: string; isCorrect?: boolean }[] }[];
};

export type Block = { kind: 'title' | 'subtitle' | 'meta' | 'h1' | 'h2' | 'p' | 'quote' | 'li' | 'note'; text: string };

const str = (value: unknown) => String(value ?? '').normalize('NFC');

/** Lesson → flat list of blocks, shared by Word and PDF. */
export function buildBlocks(lesson: ExportLesson): Block[] {
  const blocks: Block[] = [];
  const add = (kind: Block['kind'], text: unknown) => {
    const t = str(text).trim();
    if (t) blocks.push({ kind, text: t });
  };

  add('title', lesson.title || 'Bài học');
  add('subtitle', lesson.subtitle);
  add('meta', `Ngày: ${lesson.date || '(chưa đặt)'}`);
  add('meta', `Trạng thái: ${lesson.status || '(chưa đặt)'}`);
  if (lesson.class || lesson.subject) add('meta', `Môn / Lớp: ${[lesson.subject, lesson.class].filter(Boolean).join(' · ')}`);
  add('note', lesson.disclaimer || EXPORT_DISCLAIMER);
  if (lesson.objectives) {
    add('h1', 'Mục tiêu bài học');
    add('p', lesson.objectives);
  }
  if (lesson.introSummary) {
    add('h1', 'Tóm tắt');
    add('p', lesson.introSummary);
  }

  const sections = lesson.sections ?? [];
  if (sections.length) {
    add('h1', 'Các giai đoạn');
    sections.forEach((sec, i) => {
      add('h2', `${i + 1}. ${sec.title || 'Giai đoạn'}${sec.timeLabel ? ` (${sec.timeLabel})` : ''}`);
      add('p', sec.narration);
      if (sec.caption) add('p', `Chú thích: ${sec.caption}`);
      const src = sec.source ?? {};
      if (src.book || src.chapter) add('p', `Nguồn: ${[src.book, src.chapter].filter(Boolean).join(' - ')}`);
      if (src.quote) add('quote', src.quote);
      if (src.note) add('p', `Ghi chú nguồn: ${src.note}`);
    });
  }

  const notes = lesson.keyNotes ?? [];
  if (notes.length) {
    add('h1', 'Ghi chú cốt lõi');
    notes.forEach((n) => add('li', n));
  }

  const questions = lesson.questions ?? [];
  if (questions.length) {
    add('h1', 'Câu hỏi');
    questions.forEach((q, i) => {
      add('h2', `Câu ${i + 1}: ${q.text || ''}`);
      (q.options ?? []).forEach((opt, k) => add('li', `${String.fromCharCode(65 + (k % 26))}. ${opt.text || ''}${opt.isCorrect ? ' (đáp án đúng)' : ''}`));
      if (q.guide) add('p', `Gợi ý: ${q.guide}`);
    });
  }

  add('note', EXPORT_DISCLAIMER);
  return blocks;
}

// --- XML helpers ---------------------------------------------------------------------------

export function escapeXml(value: unknown): string {
  return str(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '') // not allowed in XML 1.0
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const escapeHtml = (value: unknown) => escapeXml(value).replace(/&apos;/g, '&#39;');
const utf8 = (text: string) => new TextEncoder().encode(text);

// --- CRC-32 and a store-only ZIP writer ---------------------------------------------------

let crcTable: Uint32Array | null = null;
export function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const u16 = (v: number) => [v & 0xff, (v >>> 8) & 0xff];
const u32 = (v: number) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

/** ZIP archive with method 0 (stored, no compression). */
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const DOS_DATE = (1 << 5) | 1; // 1980-01-01
  const chunks: Uint8Array[] = [];
  const central: { name: Uint8Array; crc: number; size: number; offset: number }[] = [];
  let offset = 0;

  for (const file of files) {
    const name = utf8(file.name);
    const crc = crc32(file.data);
    const local = Uint8Array.from([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(DOS_DATE),
      ...u32(crc), ...u32(file.data.length), ...u32(file.data.length), ...u16(name.length), ...u16(0)
    ]);
    chunks.push(local, name, file.data);
    central.push({ name, crc, size: file.data.length, offset });
    offset += local.length + name.length + file.data.length;
  }

  const centralStart = offset;
  for (const c of central) {
    const header = Uint8Array.from([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(DOS_DATE),
      ...u32(c.crc), ...u32(c.size), ...u32(c.size), ...u16(c.name.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(c.offset)
    ]);
    chunks.push(header, c.name);
    offset += header.length + c.name.length;
  }
  chunks.push(Uint8Array.from([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(offset - centralStart), ...u32(centralStart), ...u16(0)
  ]));

  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

// --- OOXML ---------------------------------------------------------------------------------

type RunStyle = { bold?: boolean; italic?: boolean; size: number; color?: string; align?: string; before?: number; indent?: number };
const RUN_STYLE: Record<Block['kind'], RunStyle> = {
  title: { bold: true, size: 40, color: '8B181C', align: 'center' },
  subtitle: { italic: true, size: 26, align: 'center' },
  meta: { size: 22 },
  h1: { bold: true, size: 30, color: '8B181C', before: 280 },
  h2: { bold: true, size: 26, before: 200 },
  p: { size: 24 },
  quote: { italic: true, size: 24, indent: 567 },
  li: { size: 24, indent: 360 },
  note: { italic: true, bold: true, size: 22, color: '9D3026', align: 'center' }
};

function paragraphXml(block: Block): string {
  const st = RUN_STYLE[block.kind];
  // OOXML schema order inside pPr: spacing, ind, jc (strict consumers reject any other order).
  const pPr = `<w:pPr><w:spacing w:before="${st.before ?? 60}" w:after="100"/>${st.indent ? `<w:ind w:left="${st.indent}"/>` : ''}${st.align ? `<w:jc w:val="${st.align}"/>` : ''}</w:pPr>`;
  const rPr = `<w:rPr>${st.bold ? '<w:b/>' : ''}${st.italic ? '<w:i/>' : ''}${st.color ? `<w:color w:val="${st.color}"/>` : ''}<w:sz w:val="${st.size}"/></w:rPr>`;
  const lines = `${block.kind === 'li' ? '• ' : ''}${block.text}`.split(/\r?\n/);
  const runs = lines.map((line, i) => `<w:r>${rPr}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`).join('');
  return `<w:p>${pPr}${runs}</w:p>`;
}

export function buildDocumentXml(lesson: ExportLesson): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${buildBlocks(lesson).map(paragraphXml).join('')}` +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>' +
    '</w:body></w:document>'
  );
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const CONTENT_TYPES =
  `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '</Types>';
const ROOT_RELS =
  `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>';
const DOC_RELS = `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

/** The .docx file bytes. */
export function buildDocxBytes(lesson: ExportLesson): Uint8Array<ArrayBuffer> {
  return zipStore([
    { name: '[Content_Types].xml', data: utf8(CONTENT_TYPES) },
    { name: '_rels/.rels', data: utf8(ROOT_RELS) },
    { name: 'word/document.xml', data: utf8(buildDocumentXml(lesson)) },
    { name: 'word/_rels/document.xml.rels', data: utf8(DOC_RELS) }
  ]);
}

// --- Print page (PDF) ----------------------------------------------------------------------

const PRINT_CSS =
  'body{font-family:"Noto Serif","Times New Roman",serif;color:#1a1a1a;line-height:1.6;margin:24px;}' +
  'h1{font-size:24pt;text-align:center;color:#8b181c;margin:0 0 6px;}' +
  'h2.sub{font-size:13pt;font-style:italic;font-weight:normal;text-align:center;margin:0 0 12px;}' +
  'h2{font-size:15pt;color:#8b181c;margin:22px 0 6px;border-bottom:1px solid #c9b79c;}' +
  'h3{font-size:12.5pt;margin:14px 0 4px;}' +
  'p{margin:4px 0;font-size:11.5pt;}.meta{font-size:11pt;margin:2px 0;}' +
  'blockquote{margin:6px 0 6px 18px;font-style:italic;font-size:11.5pt;}' +
  'ul{margin:4px 0 4px 20px;padding:0;font-size:11.5pt;}' +
  '.note{text-align:center;font-weight:bold;font-style:italic;color:#9d3026;margin:10px 0;font-size:11pt;}' +
  '@media print{body{margin:0;}h2,h3{page-break-after:avoid;}blockquote,li{page-break-inside:avoid;}@page{margin:18mm;}}';

export function buildLessonHtml(lesson: ExportLesson): string {
  let html = '';
  let inList = false;
  for (const b of buildBlocks(lesson)) {
    if (b.kind !== 'li' && inList) {
      html += '</ul>';
      inList = false;
    }
    const t = escapeHtml(b.text).replace(/\n/g, '<br>');
    switch (b.kind) {
      case 'title': html += `<h1>${t}</h1>`; break;
      case 'subtitle': html += `<h2 class="sub">${t}</h2>`; break;
      case 'meta': html += `<p class="meta">${t}</p>`; break;
      case 'h1': html += `<h2>${t}</h2>`; break;
      case 'h2': html += `<h3>${t}</h3>`; break;
      case 'quote': html += `<blockquote>${t}</blockquote>`; break;
      case 'li':
        if (!inList) {
          html += '<ul>';
          inList = true;
        }
        html += `<li>${t}</li>`;
        break;
      case 'note': html += `<p class="note">${t}</p>`; break;
      default: html += `<p>${t}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(lesson.title || 'Bài học')}</title><style>${PRINT_CSS}</style></head><body>${html}</body></html>`;
}

// --- Browser actions -----------------------------------------------------------------------

export function exportFileBase(lesson: ExportLesson): string {
  const raw = str(lesson.id || lesson.title || 'bai-hoc');
  return raw.toLowerCase().replace(/[^a-z0-9À-ỹ]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'bai-hoc';
}

export function exportLessonDocx(lesson: ExportLesson) {
  const blob = new Blob([buildDocxBytes(lesson)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${exportFileBase(lesson)}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the browser print dialog; the teacher picks "Save as PDF" there. */
export function exportLessonPdf(lesson: ExportLesson) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  const cleanup = () => iframe.remove();
  const frame = iframe.contentWindow;
  if (!frame) return cleanup();
  frame.document.open();
  frame.document.write(buildLessonHtml(lesson));
  frame.document.close();
  // Print once the document and its fonts are ready (250 ms fallback); remove the frame on
  // `afterprint`, with a long fallback because some browsers' print() does not block.
  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      frame.focus();
      frame.addEventListener('afterprint', cleanup);
      frame.print();
    } catch {
      cleanup();
      return;
    }
    setTimeout(cleanup, 10 * 60 * 1000);
  };
  const fonts = (frame.document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
  (fonts ? Promise.race([fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : new Promise((r) => setTimeout(r, 250))).then(doPrint, doPrint);
}
