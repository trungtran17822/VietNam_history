// Unit tests for frontend/js/docx-export.js: ZIP container, CRC-32 and document XML.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { console, Uint8Array, Uint32Array, Date, JSON, Math };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'js', 'docx-export.js'), 'utf8'), sandbox, { filename: 'docx-export.js' });
const X = sandbox.window.DocxExport;

const lesson = {
  id: 'demo', title: 'Bài thử <A> & "B"', date: '2026-01-02', status: 'Nháp',
  sections: [{ title: 'Giai đoạn 1', narration: 'Lời dẫn', caption: 'Chú thích', source: { book: 'Sách', chapter: 'Chương 1', quote: 'Trích dẫn' } }],
  keyNotes: ['Ghi chú 1'],
  questions: [{ text: 'Câu hỏi?', type: 'multiple_choice', options: [{ text: 'Đáp án', isCorrect: true }] }]
};

function listEntries(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const entries = [];
  let pos = 0;
  while (dv.getUint32(pos, true) === 0x04034b50) {
    const crc = dv.getUint32(pos + 14, true);
    const size = dv.getUint32(pos + 18, true);
    const nameLen = dv.getUint16(pos + 26, true);
    const name = Buffer.from(buf.subarray(pos + 30, pos + 30 + nameLen)).toString('utf8');
    const data = buf.subarray(pos + 30 + nameLen, pos + 30 + nameLen + size);
    entries.push({ name, crc, data });
    pos += 30 + nameLen + size;
  }
  return entries;
}

test('crc32 matches the standard check value', () => {
  assert.equal(X.crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('docx bytes are a ZIP starting with PK\\x03\\x04 and contain word/document.xml', () => {
  const bytes = X.buildDocxBytes(lesson);
  assert.deepEqual(Array.from(bytes.subarray(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
  const entries = listEntries(bytes);
  const names = entries.map((e) => e.name);
  for (const n of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml']) assert.ok(names.includes(n), n);
  for (const e of entries) assert.equal(X.crc32(e.data), e.crc, `crc ${e.name}`);
});

test('document.xml carries the escaped title, content and disclaimer', () => {
  const entries = listEntries(X.buildDocxBytes(lesson));
  const xml = Buffer.from(entries.find((e) => e.name === 'word/document.xml').data).toString('utf8');
  assert.ok(xml.includes('Bài thử &lt;A&gt; &amp; &quot;B&quot;'));
  assert.ok(!xml.includes('<A>'));
  for (const t of ['Lời dẫn', 'Trích dẫn', 'Ghi chú 1', 'Câu hỏi?', 'Nội dung minh họa, chưa được chuyên gia duyệt']) assert.ok(xml.includes(t), t);
});

test('print HTML for PDF includes the title and disclaimer', () => {
  const html = X.buildLessonHtml(lesson);
  assert.ok(html.includes('@media print'));
  assert.ok(html.includes('Nội dung minh họa, chưa được chuyên gia duyệt'));
  assert.ok(html.includes('Bài thử &lt;A&gt;'));
});
