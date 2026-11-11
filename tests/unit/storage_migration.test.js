// Unit test for localStorage migration from v2 to v3.
// Tests:
// - Removal of only the 4 old seed IDs.
// - Preservation of ALL teacher-created lessons (including empty draft "Bài giảng Lịch sử mới").
// - Backup of removed old seeds to history_sim_lessons_backup_v2.
// - Retention of untouched history_sim_lessons_db_v2.
// - Idempotency when running multiple times.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const STORAGE_FILE = path.join(__dirname, '..', '..', 'frontend', 'js', 'storage.js');

function createSandbox(initialStorage = {}) {
  const store = new Map(Object.entries(initialStorage));
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
  const sandbox = {
    console,
    localStorage,
    sessionStorage: localStorage,
    Date,
    JSON,
    Math,
    normalizeVietnamese: (x) => x
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  // Define new seeds for testing
  sandbox.window.SEED_LESSONS = [
    { id: 'bai-1-lien-xo', title: 'Bài 1. Nước Nga và Liên Xô' },
    { id: 'bai-2-chau-au-my', title: 'Bài 2. Châu Âu và nước Mỹ' },
    { id: 'bai-3-chau-a', title: 'Bài 3. Châu Á' },
    { id: 'bai-4-chien-tranh-the-gioi-2', title: 'Bài 4. Chiến tranh thế giới thứ hai' }
  ];

  const code = fs.readFileSync(STORAGE_FILE, 'utf8');
  vm.runInContext(code, sandbox, { filename: 'storage.js' });
  return { sandbox, store };
}

test('migration v2 to v3 removes only 4 old seeds, backups old seeds, keeps v2 intact and preserves teacher-created lessons', () => {
  const v2Lessons = [
    { id: 'ngoc-hoi-ha-hoi-1789', title: 'Trận Ngọc Hồi - Đã chỉnh sửa tiêu đề bởi giáo viên' },
    { id: 'rach-gam-xoai-mut-1785', title: 'Trận Thủy Chiến Rạch Gầm - Xoài Mút' },
    { id: 'chi-lang-xuong-giang-1427', title: 'Chiến Dịch Chi Lăng - Xương Giang' },
    { id: 'khang-chien-mong-nguyen-vuon-khong', title: 'Kế Sách Vườn Không Nhà Trống' },
    { id: 'lesson-custom-1', title: 'Bài giảng Lịch sử mới', teacher: 'Thầy Hưng', status: 'Nháp' }
  ];

  const initialV2Json = JSON.stringify(v2Lessons);
  const { sandbox, store } = createSandbox({
    history_sim_lessons_db_v2: initialV2Json
  });

  // 1. First run of init()
  sandbox.window.LessonStorage.init();

  // Assertions:
  // a) v2 key is completely untouched
  assert.equal(store.get('history_sim_lessons_db_v2'), initialV2Json, 'v2 key must be preserved untouched');

  // b) backup_v2 contains the removed old seeds
  const backupV2 = JSON.parse(store.get('history_sim_lessons_backup_v2'));
  assert.equal(backupV2.length, 4, 'backup must contain all 4 removed old seed lessons');
  const backupIds = backupV2.map((l) => l.id);
  assert.ok(backupIds.includes('ngoc-hoi-ha-hoi-1789'));
  assert.equal(backupV2.find((l) => l.id === 'ngoc-hoi-ha-hoi-1789').title, 'Trận Ngọc Hồi - Đã chỉnh sửa tiêu đề bởi giáo viên');

  // c) v3 contains new seeds + teacher created lesson
  const v3Lessons = JSON.parse(store.get('history_sim_lessons_db_v3'));
  assert.equal(v3Lessons.length, 5, 'v3 must contain 4 new seeds + 1 teacher lesson');
  const v3Ids = v3Lessons.map((l) => l.id);
  assert.ok(v3Ids.includes('bai-1-lien-xo'));
  assert.ok(v3Ids.includes('bai-2-chau-au-my'));
  assert.ok(v3Ids.includes('bai-3-chau-a'));
  assert.ok(v3Ids.includes('bai-4-chien-tranh-the-gioi-2'));
  assert.ok(v3Ids.includes('lesson-custom-1'), 'teacher created lesson must be preserved');
  assert.equal(v3Lessons.find((l) => l.id === 'lesson-custom-1').title, 'Bài giảng Lịch sử mới');

  // None of the 4 old sample IDs exist in v3
  assert.equal(v3Ids.includes('ngoc-hoi-ha-hoi-1789'), false);
  assert.equal(v3Ids.includes('rach-gam-xoai-mut-1785'), false);
  assert.equal(v3Ids.includes('chi-lang-xuong-giang-1427'), false);
  assert.equal(v3Ids.includes('khang-chien-mong-nguyen-vuon-khong'), false);

  // 2. Second and third run: Idempotency
  const snapshotV3 = store.get('history_sim_lessons_db_v3');
  const snapshotBackup = store.get('history_sim_lessons_backup_v2');

  sandbox.window.LessonStorage.init();
  assert.equal(store.get('history_sim_lessons_db_v3'), snapshotV3, '2nd run must produce identical v3 data');
  assert.equal(store.get('history_sim_lessons_backup_v2'), snapshotBackup, '2nd run must not alter backup');

  sandbox.window.LessonStorage.init();
  assert.equal(store.get('history_sim_lessons_db_v3'), snapshotV3, '3rd run must produce identical v3 data');
});
