// Unit tests for the browser modules (classic scripts) loaded into a vm sandbox.
// Covers SC-002 (determinism over all combinations), SC-008 (no grading words) and FR-020 (visibility).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const JS = path.join(__dirname, '..', '..', 'frontend', 'js');

function loadBrowserModules(files) {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
  const sandbox = { console, localStorage, sessionStorage: localStorage, Date, JSON, Math };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of files) {
    let code = fs.readFileSync(path.join(JS, file), 'utf8');
    // `const SEED_LESSONS` is script-scoped; expose it the way a browser global script would see it.
    if (file === 'lesson-data.js') code += '\nwindow.SEED_LESSONS = SEED_LESSONS;';
    vm.runInContext(code, sandbox, { filename: file });
  }
  return sandbox;
}

const win = loadBrowserModules(['lesson-data.js', 'engine.js', 'storage.js']);
const lessons = win.SEED_LESSONS;
const pilot = lessons.find((l) => l.id === 'ngoc-hoi-ha-hoi-1789');
const variables = pilot.question.variables;

function allCombinations(vars) {
  return vars.reduce(
    (acc, v) => acc.flatMap((choice) => v.options.map((o) => ({ ...choice, [v.id]: o.id }))),
    [{}]
  );
}

const combos = allCombinations(variables);

test('pilot lesson has 3-5 variables with at least 2 options each and one original option per variable', () => {
  assert.ok(variables.length >= 3 && variables.length <= 5);
  for (const v of variables) {
    assert.ok(v.options.length >= 2, v.id);
    assert.equal(v.options.filter((o) => o.isOriginal).length, 1, `${v.id} original count`);
  }
  assert.equal(combos.length, 81);
});

test('engine is deterministic: every combination gives identical numbers on a second run (SC-002)', () => {
  for (const choices of combos) {
    const a = win.SimulationEngine.calculate(pilot, choices);
    const b = win.SimulationEngine.calculate(JSON.parse(JSON.stringify(pilot)), { ...choices });
    assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  }
});

test('exactly one combination equals the original, and it reproduces the baseline', () => {
  const identical = combos.filter((c) => win.SimulationEngine.calculate(pilot, c).isIdenticalToOriginal);
  assert.equal(identical.length, 1);
  const r = win.SimulationEngine.calculate(pilot, identical[0]);
  assert.equal(r.student.durationHours, pilot.baseline.durationHours);
  assert.equal(r.student.casualties, pilot.baseline.casualties);
  assert.equal(r.student.positionScore, pilot.baseline.positionScore);
});

test('every number traces back to declared coefficients (FR-006, SRS-Q-02)', () => {
  for (const choices of combos) {
    const r = win.SimulationEngine.calculate(pilot, choices);
    assert.equal(r.appliedAssumptions.length, variables.length);
    const picked = variables.map((v) => v.options.find((o) => o.id === choices[v.id]));
    const sum = (k) => picked.reduce((s, o) => s + (o[k] || 0), 0);
    assert.equal(r.student.durationHours, Math.max(12, pilot.baseline.durationHours + sum('timeDelta')));
    assert.equal(r.student.casualties, Math.max(500, pilot.baseline.casualties + sum('casualtyDelta')));
    assert.equal(r.student.positionScore, Math.min(100, Math.max(10, pilot.baseline.positionScore + sum('positionScoreDelta'))));
  }
});

test('no explanation or outcome text grades the student (SC-008)', () => {
  const words = ['sai lầm', 'sai', 'thất bại', 'kém', 'tệ', 'dở', 'ngu'];
  // Whole-word match on NFC text; Vietnamese letters count as word characters.
  const pattern = new RegExp(`(^|[^\\p{L}])(${words.join('|')})(?=$|[^\\p{L}])`, 'iu');
  for (const choices of combos) {
    const r = win.SimulationEngine.calculate(pilot, choices);
    const e = win.SimulationEngine.generateExplanation(pilot, choices);
    const texts = [r.student.outcomeSummary, e.intro, e.encouragement, ...e.variablePoints.map((p) => p.text)];
    for (const t of texts) {
      const m = String(t || '').normalize('NFC').match(pattern);
      assert.equal(m, null, `grading word "${m && m[2]}" in: ${t}`);
    }
  }
});

test('students only see lessons that are published and not in the future (FR-020)', () => {
  const visible = win.LessonStorage.isLessonVisibleForStudent;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.equal(visible({ status: 'Đã dạy', date: '2020-01-01' }), true);
  assert.equal(visible({ status: 'Đã dạy', date: today }), true);
  assert.equal(visible({ status: 'Đã dạy', date: '2999-01-01' }), false);
  assert.equal(visible({ status: 'Nháp', date: '2020-01-01' }), false);
  assert.equal(visible({ status: 'Đã lên lịch', date: '2020-01-01' }), false);
});
