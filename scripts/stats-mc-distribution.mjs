// Where the correct answer sits (A/B/C/D) across the four SGK lessons; 15-35% each is balanced.
// Reads the v2 lesson JSON (ported from origin/Process, which read lesson-data.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lessonDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'src', 'content', 'lessons');
const SGK_IDS = ['bai-1-lien-xo', 'bai-2-chau-au-my', 'bai-3-chau-a', 'bai-4-chien-tranh-the-gioi-2'];
const lessons = SGK_IDS.map((id) => JSON.parse(fs.readFileSync(path.join(lessonDir, `${id}.json`), 'utf8')));
const distTotal = { A: 0, B: 0, C: 0, D: 0 };
let totalCount = 0;

console.log('======================================================================');
console.log('THỐNG KÊ PHÂN BỐ ĐÁP ÁN TRẮC NGHIỆM (A / B / C / D)');
console.log('======================================================================');

lessons.forEach((lesson, lIdx) => {
  const lessonDist = { A: 0, B: 0, C: 0, D: 0 };
  let lessonTotal = 0;
  const mcQuestions = (lesson.questions || []).filter(q => q.type === 'multiple_choice');

  mcQuestions.forEach(q => {
    const correctIdx = q.options.findIndex(o => o.isCorrect);
    const key = ['A', 'B', 'C', 'D'][correctIdx];
    if (key) {
      lessonDist[key]++;
      distTotal[key]++;
      lessonTotal++;
      totalCount++;
    }
  });

  console.log(`\nBài ${lIdx + 1}: ${lesson.id}`);
  console.log(`   - Tổng số câu trắc nghiệm: ${lessonTotal}`);
  ['A', 'B', 'C', 'D'].forEach(k => {
    const pct = lessonTotal > 0 ? ((lessonDist[k] / lessonTotal) * 100).toFixed(1) : '0.0';
    console.log(`     + ${k}: ${lessonDist[k]} (${pct}%)`);
  });
});

console.log('\n----------------------------------------------------------------------');
console.log(`TỔNG HỢP TOÀN BỘ 4 BÀI HỌC (Tổng số câu trắc nghiệm: ${totalCount})`);
console.log('----------------------------------------------------------------------');
['A', 'B', 'C', 'D'].forEach(k => {
  const pct = totalCount > 0 ? ((distTotal[k] / totalCount) * 100).toFixed(1) : '0.0';
  console.log(`   Đáp án ${k}: ${distTotal[k]} câu (${pct}%)`);
});

const isBalanced = Object.values(distTotal).every(count => {
  const pct = (count / totalCount) * 100;
  return pct >= 15 && pct <= 35;
});

console.log('\nĐánh giá độ cân bằng (15% - 35% theo chuẩn sư phạm):', isBalanced ? 'ĐẠT CHUẨN' : 'CHƯA CÂN BẰNG');
console.log('======================================================================');
