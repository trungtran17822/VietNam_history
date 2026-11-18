// Word / PDF export: CRC-32, the ZIP container, escaped XML and the mandatory disclaimer.
import { describe, expect, test } from 'vitest';
import { EXPORT_DISCLAIMER, buildBlocks, buildDocxBytes, buildLessonHtml, crc32, type ExportLesson } from './docx-export';

const lesson: ExportLesson = {
  id: 'demo',
  title: 'Bài thử <A> & "B"',
  date: '2026-01-02',
  status: 'Nháp',
  sections: [{ title: 'Giai đoạn 1', narration: 'Lời dẫn', caption: 'Chú thích', source: { book: 'Sách', chapter: 'Chương 1', quote: 'Trích dẫn' } }],
  keyNotes: ['Ghi chú 1'],
  questions: [{ text: 'Câu hỏi?', options: [{ text: 'Đáp án', isCorrect: true }] }]
};

// Read local file headers back out of the archive (all entries are stored, so data is verbatim).
function listEntries(buf: Uint8Array) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const entries: { name: string; crc: number; data: Uint8Array }[] = [];
  let pos = 0;
  while (dv.getUint32(pos, true) === 0x04034b50) {
    const crc = dv.getUint32(pos + 14, true);
    const size = dv.getUint32(pos + 18, true);
    const nameLen = dv.getUint16(pos + 26, true);
    const name = new TextDecoder().decode(buf.subarray(pos + 30, pos + 30 + nameLen));
    entries.push({ name, crc, data: buf.subarray(pos + 30 + nameLen, pos + 30 + nameLen + size) });
    pos += 30 + nameLen + size;
  }
  return entries;
}

describe('lesson export', () => {
  test('crc32 matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  test('docx is a ZIP with the required parts and correct checksums', () => {
    const bytes = buildDocxBytes(lesson);
    expect(Array.from(bytes.subarray(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const entries = listEntries(bytes);
    for (const name of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml']) expect(entries.map((e) => e.name)).toContain(name);
    for (const e of entries) expect(crc32(e.data), e.name).toBe(e.crc);
  });

  test('document.xml escapes the title and carries the content and the disclaimer', () => {
    const xml = new TextDecoder().decode(listEntries(buildDocxBytes(lesson)).find((e) => e.name === 'word/document.xml')!.data);
    expect(xml).toContain('Bài thử &lt;A&gt; &amp; &quot;B&quot;');
    expect(xml).not.toContain('<A>');
    for (const t of ['Lời dẫn', 'Trích dẫn', 'Ghi chú 1', 'Câu hỏi?', EXPORT_DISCLAIMER]) expect(xml).toContain(t);
  });

  test('print page for PDF has print rules, the title and the disclaimer', () => {
    const html = buildLessonHtml(lesson);
    expect(html).toContain('@media print');
    expect(html).toContain(EXPORT_DISCLAIMER);
    expect(html).toContain('Bài thử &lt;A&gt;');
  });

  test('the disclaimer opens and closes the document, and the correct answer is marked', () => {
    const blocks = buildBlocks(lesson);
    expect(blocks[0]).toEqual({ kind: 'title', text: 'Bài thử <A> & "B"' });
    expect(blocks.filter((b) => b.kind === 'note').map((b) => b.text)).toEqual([EXPORT_DISCLAIMER, EXPORT_DISCLAIMER]);
    expect(blocks.find((b) => b.text.startsWith('A. '))?.text).toBe('A. Đáp án (đáp án đúng)');
  });

  test('paragraph properties follow the OOXML order: spacing, ind, jc', () => {
    const xml = new TextDecoder().decode(listEntries(buildDocxBytes(lesson)).find((e) => e.name === 'word/document.xml')!.data);
    const props = xml.match(/<w:pPr>.*?<\/w:pPr>/g) ?? [];
    expect(props.length).toBeGreaterThan(0);
    for (const p of props) {
      const order = ['<w:spacing', '<w:ind', '<w:jc'].map((t) => p.indexOf(t)).filter((i) => i >= 0);
      expect(order).toEqual([...order].sort((a, b) => a - b));
      expect(p.startsWith('<w:pPr><w:spacing')).toBe(true);
    }
    expect(props.some((p) => p.includes('<w:jc'))).toBe(true);
  });

  test('an empty lesson still exports a valid file', () => {
    const entries = listEntries(buildDocxBytes({}));
    expect(entries.length).toBe(4);
    for (const e of entries) expect(crc32(e.data)).toBe(e.crc);
  });
});
