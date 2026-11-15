/**
 * docx-export.js - Export one lesson to Word (.docx) or PDF (print dialog).
 * No external dependencies: a minimal OOXML package inside a store-only ZIP
 * (CRC-32 written here), and a styled print page for "Save as PDF".
 * Exposes window.DocxExport.
 */
(function (window) {
  'use strict';

  const DISCLAIMER = 'Nội dung minh họa, chưa được chuyên gia duyệt';

  /* ------------------------------------------------------------------ */
  /* Content model shared by Word and PDF                                */
  /* ------------------------------------------------------------------ */

  function str(value) {
    const text = String(value == null ? '' : value);
    return text.normalize ? text.normalize('NFC') : text;
  }

  /**
   * Turn a lesson into a flat list of blocks: { kind, text }.
   * kinds: title, subtitle, meta, h1, h2, p, quote, li, note
   */
  function buildBlocks(lesson) {
    const l = lesson || {};
    const blocks = [];
    const add = (kind, text) => {
      const t = str(text).trim();
      if (t) blocks.push({ kind, text: t });
    };

    add('title', l.title || 'Bài học');
    add('subtitle', l.subtitle);
    add('meta', `Ngày: ${l.date || '(chưa đặt)'}`);
    add('meta', `Trạng thái: ${l.status || '(chưa đặt)'}`);
    if (l.class || l.subject) add('meta', `Môn / Lớp: ${[l.subject, l.class].filter(Boolean).join(' · ')}`);
    add('note', l.disclaimer || DISCLAIMER);
    if (l.objectives) {
      add('h1', 'Mục tiêu bài học');
      add('p', l.objectives);
    }
    if (l.introSummary) {
      add('h1', 'Tóm tắt');
      add('p', l.introSummary);
    }

    const sections = Array.isArray(l.sections) ? l.sections : [];
    if (sections.length) {
      add('h1', 'Các giai đoạn');
      sections.forEach((sec, i) => {
        add('h2', `${i + 1}. ${sec.title || 'Giai đoạn'}${sec.timeLabel ? ` (${sec.timeLabel})` : ''}`);
        add('p', sec.narration);
        if (sec.caption) add('p', `Chú thích: ${sec.caption}`);
        const src = sec.source || {};
        if (src.book || src.chapter) add('p', `Nguồn: ${[src.book, src.chapter].filter(Boolean).join(' - ')}`);
        if (src.quote) add('quote', src.quote);
        if (src.note) add('p', `Ghi chú nguồn: ${src.note}`);
      });
    }

    const notes = Array.isArray(l.keyNotes) ? l.keyNotes : [];
    if (notes.length) {
      add('h1', 'Ghi chú cốt lõi');
      notes.forEach((n) => add('li', n));
    }

    const questions = Array.isArray(l.questions) ? l.questions : [];
    if (questions.length) {
      add('h1', 'Câu hỏi');
      questions.forEach((q, i) => {
        add('h2', `Câu ${i + 1}: ${q.text || ''}`);
        (q.options || []).forEach((opt, k) => {
          const letter = String.fromCharCode(65 + (k % 26));
          add('li', `${letter}. ${opt.text || ''}${opt.isCorrect ? ' (đáp án đúng)' : ''}`);
        });
        if (q.guide) add('p', `Gợi ý: ${q.guide}`);
      });
    }

    add('note', DISCLAIMER);
    return blocks;
  }

  /* ------------------------------------------------------------------ */
  /* XML / UTF-8 helpers                                                 */
  /* ------------------------------------------------------------------ */

  function escapeXml(value) {
    return str(value)
      // characters not allowed in XML 1.0
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function escapeHtml(value) {
    return escapeXml(value).replace(/&apos;/g, '&#39;');
  }

  function utf8Encode(text) {
    const s = String(text);
    const out = [];
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        const d = s.charCodeAt(i + 1);
        if (d >= 0xdc00 && d <= 0xdfff) {
          c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
          i++;
        }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return Uint8Array.from(out);
  }

  /* ------------------------------------------------------------------ */
  /* CRC-32 + store-only ZIP writer                                      */
  /* ------------------------------------------------------------------ */

  let crcTable = null;
  function crc32(bytes) {
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

  /**
   * @param {Array<{name: string, data: Uint8Array}>} files
   * @returns {Uint8Array} ZIP archive (method 0 = stored, no compression)
   */
  function zipStore(files) {
    const DOS_TIME = 0;
    const DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01
    const chunks = [];
    const central = [];
    let offset = 0;

    const u16 = (v) => [v & 0xff, (v >>> 8) & 0xff];
    const u32 = (v) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

    files.forEach((file) => {
      const name = utf8Encode(file.name);
      const data = file.data;
      const crc = crc32(data);
      const local = Uint8Array.from([
        ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(DOS_TIME), ...u16(DOS_DATE),
        ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)
      ]);
      chunks.push(local, name, data);
      central.push({ name, crc, size: data.length, offset });
      offset += local.length + name.length + data.length;
    });

    const centralStart = offset;
    central.forEach((c) => {
      const header = Uint8Array.from([
        ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(DOS_TIME), ...u16(DOS_DATE),
        ...u32(c.crc), ...u32(c.size), ...u32(c.size), ...u16(c.name.length), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0), ...u32(0), ...u32(c.offset)
      ]);
      chunks.push(header, c.name);
      offset += header.length + c.name.length;
    });
    const centralSize = offset - centralStart;
    chunks.push(Uint8Array.from([
      ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
      ...u32(centralSize), ...u32(centralStart), ...u16(0)
    ]));

    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    chunks.forEach((c) => { out.set(c, pos); pos += c.length; });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* OOXML                                                               */
  /* ------------------------------------------------------------------ */

  const RUN_STYLE = {
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

  function paragraphXml(block) {
    const st = RUN_STYLE[block.kind] || RUN_STYLE.p;
    const pPr =
      '<w:pPr>' +
      (st.align ? `<w:jc w:val="${st.align}"/>` : '') +
      (st.indent ? `<w:ind w:left="${st.indent}"/>` : '') +
      `<w:spacing w:before="${st.before || 60}" w:after="100"/>` +
      '</w:pPr>';
    const rPr =
      '<w:rPr>' +
      (st.bold ? '<w:b/>' : '') +
      (st.italic ? '<w:i/>' : '') +
      (st.color ? `<w:color w:val="${st.color}"/>` : '') +
      `<w:sz w:val="${st.size}"/>` +
      '</w:rPr>';
    const bullet = block.kind === 'li' ? '• ' : '';
    const lines = (bullet + block.text).split(/\r?\n/);
    const runs = lines
      .map((line, i) => `<w:r>${rPr}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`)
      .join('');
    return `<w:p>${pPr}${runs}</w:p>`;
  }

  function buildDocumentXml(lesson) {
    const body = buildBlocks(lesson).map(paragraphXml).join('');
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      `<w:body>${body}` +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>' +
      '</w:body></w:document>'
    );
  }

  const CONTENT_TYPES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>';

  const ROOT_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';

  const DOC_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';

  /** @returns {Uint8Array} the .docx file bytes */
  function buildDocxBytes(lesson) {
    return zipStore([
      { name: '[Content_Types].xml', data: utf8Encode(CONTENT_TYPES) },
      { name: '_rels/.rels', data: utf8Encode(ROOT_RELS) },
      { name: 'word/document.xml', data: utf8Encode(buildDocumentXml(lesson)) },
      { name: 'word/_rels/document.xml.rels', data: utf8Encode(DOC_RELS) }
    ]);
  }

  /* ------------------------------------------------------------------ */
  /* Download + PDF (print)                                              */
  /* ------------------------------------------------------------------ */

  function fileBase(lesson) {
    const raw = str((lesson && (lesson.id || lesson.title)) || 'bai-hoc');
    return raw.toLowerCase().replace(/[^a-z0-9À-ỹ]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'bai-hoc';
  }

  function exportLessonDocx(lesson) {
    const bytes = buildDocxBytes(lesson);
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileBase(lesson)}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

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

  function buildLessonHtml(lesson) {
    const blocks = buildBlocks(lesson);
    let html = '';
    let inList = false;
    blocks.forEach((b) => {
      if (b.kind !== 'li' && inList) { html += '</ul>'; inList = false; }
      const t = escapeHtml(b.text).replace(/\n/g, '<br>');
      switch (b.kind) {
        case 'title': html += `<h1>${t}</h1>`; break;
        case 'subtitle': html += `<h2 class="sub">${t}</h2>`; break;
        case 'meta': html += `<p class="meta">${t}</p>`; break;
        case 'h1': html += `<h2>${t}</h2>`; break;
        case 'h2': html += `<h3>${t}</h3>`; break;
        case 'quote': html += `<blockquote>${t}</blockquote>`; break;
        case 'li':
          if (!inList) { html += '<ul>'; inList = true; }
          html += `<li>${t}</li>`;
          break;
        case 'note': html += `<p class="note">${t}</p>`; break;
        default: html += `<p>${t}</p>`;
      }
    });
    if (inList) html += '</ul>';
    const title = escapeHtml((lesson && lesson.title) || 'Bài học');
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_CSS}</style></head><body>${html}</body></html>`;
  }

  /** Opens the browser print dialog; choose "Save as PDF" there. */
  function exportLessonPdf(lesson) {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(buildLessonHtml(lesson));
    doc.close();
    const cleanup = () => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); };
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.addEventListener('afterprint', cleanup);
        iframe.contentWindow.print();
      } catch (e) {
        cleanup();
      }
      setTimeout(cleanup, 60000);
    }, 250);
  }

  window.DocxExport = {
    DISCLAIMER,
    buildBlocks,
    buildDocumentXml,
    buildDocxBytes,
    buildLessonHtml,
    zipStore,
    crc32,
    escapeXml,
    exportLessonDocx,
    exportLessonPdf
  };
})(window);
