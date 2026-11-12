import '../frontend/js/lesson-data.js';

const lessons = globalThis.SEED_LESSONS || [];
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

  console.log(`\n📘 Bài ${lIdx + 1}: ${lesson.id}`);
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

console.log('\nĐánh giá độ cân bằng (15% - 35% theo chuẩn sư phạm):', isBalanced ? '✅ HOÀN HẢO ĐẠT CHUẨN' : '❌ CHƯA CÂN BẰNG');
console.log('======================================================================');
