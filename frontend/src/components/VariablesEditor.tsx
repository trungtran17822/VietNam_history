// "Biến số & hệ số": the authoring form for what students can change at stage 3 and how each
// choice moves the numbers. A side panel runs the real engine on the draft so the teacher sees
// the effect of a coefficient as they type it.
import { useMemo, useState } from 'react';
import { calculate, originalChoices, type Choices } from '../lib/engine';
import type { Lesson, Variable, VariableOption } from '../lib/lesson-schema';
import { fold } from '../lib/text';
import type { AppLesson } from '../lib/storage';
import { Field, Icon } from './ui';

export type Edit = (key: string, mutate: (draft: AppLesson) => void) => void;

export const DEFAULT_BASELINE = { durationHours: 36, casualties: 1800, positionScore: 95, ratingText: 'Kết quả của cách làm trong lịch sử' };

const slug = (text: string) => fold(text).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || 'muc';
function uniqueId(base: string, taken: string[]) {
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}_${n}`;
  return id;
}
const newOption = (id: string, isOriginal: boolean, name: string): VariableOption => ({ id, isOriginal, name, shortName: '', desc: '', timeDelta: 0, casualtyDelta: 0, positionScoreDelta: 0, assumptions: '' });

function NumberInput({ value, onChange, disabled, label, id }: { value: number; onChange: (n: number) => void; disabled?: boolean; label: string; id?: string }) {
  // Keep the raw text while typing so "-" and "" are allowed; commit numbers only.
  const [text, setText] = useState<string | null>(null);
  return (
    <input
      id={id}
      className="field tabular-nums"
      inputMode="decimal"
      aria-label={label}
      disabled={disabled}
      value={text ?? String(value)}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value.replace(',', '.'));
        if (e.target.value.trim() !== '' && Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => setText(null)}
    />
  );
}

export function VariablesEditor({ lesson, edit }: { lesson: AppLesson; edit: Edit }) {
  const variables = lesson.question?.variables ?? [];
  const ensureQuestion = (d: AppLesson) => {
    d.question ??= { character: { name: 'Nhân vật lịch sử', speech: '' }, originalLabel: 'Cách gốc trong lịch sử', variables: [] };
    d.baseline ??= { ...DEFAULT_BASELINE };
    return d.question;
  };
  const addVariable = () =>
    edit('variables.add', (d) => {
      const q = ensureQuestion(d);
      const id = uniqueId(`bien_${q.variables.length + 1}`, q.variables.map((v) => v.id));
      q.variables.push({ id, title: `Biến số ${q.variables.length + 1}`, description: '', options: [newOption('goc', true, 'Cách gốc'), newOption('khac_1', false, 'Phương án khác 1'), newOption('khac_2', false, 'Phương án khác 2')] });
    });
  const editVar = (vi: number, key: string, fn: (v: Variable, d: AppLesson) => void) => edit(`var.${vi}.${key}`, (d) => fn(d.question!.variables[vi], d));
  const feedback = (varId: string, optId: string) => lesson.explanations?.variableFeedbacks?.[varId]?.[optId] ?? '';
  const setFeedback = (d: AppLesson, varId: string, optId: string, text: string) => {
    d.explanations ??= { intro: '', variableFeedbacks: {}, encouragingConclusion: '' };
    (d.explanations.variableFeedbacks[varId] ??= {})[optId] = text;
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="card p-5" aria-labelledby="baseline-title">
          <h3 id="baseline-title" className="t-lg font-semibold">Số liệu gốc và nhân vật</h3>
          <p className="mt-1 t-sm muted">Kết quả của học sinh = số liệu gốc + hệ số của từng lựa chọn. Cách gốc luôn có hệ số 0.</p>
          {lesson.baseline ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Thời gian gốc (giờ)"><NumberInput label="Thời gian gốc (giờ)" id="baseline-duration" value={lesson.baseline.durationHours} onChange={(n) => edit('baseline.d', (d) => void (d.baseline!.durationHours = n))} /></Field>
              <Field label="Tổn thất gốc"><NumberInput label="Tổn thất gốc" value={lesson.baseline.casualties} onChange={(n) => edit('baseline.c', (d) => void (d.baseline!.casualties = n))} /></Field>
              <Field label="Điểm thế trận gốc (0–100)"><NumberInput label="Điểm thế trận gốc" value={lesson.baseline.positionScore} onChange={(n) => edit('baseline.s', (d) => void (d.baseline!.positionScore = n))} /></Field>
              <Field label="Nhận định về kết quả gốc" className="sm:col-span-3"><input className="field" value={lesson.baseline.ratingText} onChange={(e) => edit('baseline.r', (d) => void (d.baseline!.ratingText = e.target.value))} /></Field>
            </div>
          ) : (
            <p className="mt-3 t-sm">Số liệu gốc sẽ được thêm khi bạn tạo biến số đầu tiên.</p>
          )}
          {lesson.question && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nhân vật đặt câu hỏi"><input className="field" value={lesson.question.character.name} onChange={(e) => edit('char.name', (d) => void (d.question!.character.name = e.target.value))} /></Field>
              <Field label="Nhãn cho cách gốc" hint="Hiện cạnh phương án gốc, ví dụ: Cách của nghĩa quân Tây Sơn"><input className="field" value={lesson.question.originalLabel ?? ''} onChange={(e) => edit('char.label', (d) => void (d.question!.originalLabel = e.target.value))} /></Field>
              <Field label="Lời nhân vật hỏi học sinh (bước 3)" className="sm:col-span-2"><textarea className="field" rows={3} value={lesson.question.character.speech ?? ''} onChange={(e) => edit('char.speech', (d) => void (d.question!.character.speech = e.target.value))} /></Field>
            </div>
          )}
        </section>

        {variables.map((variable, vi) => (
          <section key={vi} className="card p-5" aria-label={`Biến số ${vi + 1}`} data-variable-index={vi}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="t-lg font-semibold">Biến số {vi + 1}</h3>
              <div className="flex gap-1">
                <button type="button" className="btn btn-quiet btn-sm" disabled={vi === 0} aria-label="Đưa biến số lên" onClick={() => edit('var.move', (d) => { const v = d.question!.variables; [v[vi - 1], v[vi]] = [v[vi], v[vi - 1]]; })}><Icon name="up" /></button>
                <button type="button" className="btn btn-quiet btn-sm" disabled={vi === variables.length - 1} aria-label="Đưa biến số xuống" onClick={() => edit('var.move', (d) => { const v = d.question!.variables; [v[vi + 1], v[vi]] = [v[vi], v[vi + 1]]; })}><Icon name="down" /></button>
                <button type="button" className="btn btn-quiet btn-sm text-action" onClick={() => window.confirm(`Xoá biến số "${variable.title}" và các phương án của nó?`) && edit('var.delete', (d) => void d.question!.variables.splice(vi, 1))}>
                  <Icon name="trash" /> Xoá biến
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <Field label="Tên biến số (học sinh thấy)"><input className="field" value={variable.title} onChange={(e) => editVar(vi, 'title', (v) => void (v.title = e.target.value))} /></Field>
              <Field label="Mã biến" hint="Chữ không dấu, số, - và _. Dùng trong dữ liệu phiên lớp.">
                <input className="field font-mono t-sm" value={variable.id} onChange={(e) => editVar(vi, 'id', (v, d) => {
                  const old = v.id;
                  v.id = e.target.value.trim();
                  const fb = d.explanations?.variableFeedbacks;
                  if (fb?.[old]) { fb[v.id] = fb[old]; delete fb[old]; }
                })} />
              </Field>
              <Field label="Mô tả ngắn" className="sm:col-span-2"><input className="field" value={variable.description ?? ''} onChange={(e) => editVar(vi, 'desc', (v) => void (v.description = e.target.value))} /></Field>
            </div>

            <fieldset className="mt-5">
              <legend className="label">Phương án ({variable.options.length})</legend>
              <div className="flex flex-col gap-3">
                {variable.options.map((option, oi) => (
                  <div key={oi} className={`rounded-xl border p-4 ${option.isOriginal ? 'border-ok bg-[#f1f5ee]' : 'border-rule bg-[#fffdf7]'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex min-h-11 items-center gap-2 font-semibold">
                        <input
                          type="radio"
                          name={`original-${vi}`}
                          className="h-[18px] w-[18px] accent-[var(--color-ok)]"
                          checked={option.isOriginal}
                          onChange={() => editVar(vi, 'original', (v) => v.options.forEach((o, i) => {
                            o.isOriginal = i === oi;
                            if (o.isOriginal) o.timeDelta = o.casualtyDelta = o.positionScoreDelta = 0;
                          }))}
                        />
                        {option.isOriginal ? 'Cách gốc trong lịch sử' : 'Đặt làm cách gốc'}
                      </label>
                      <button type="button" className="btn btn-quiet btn-sm text-action" disabled={variable.options.length <= 2} onClick={() => editVar(vi, 'opt.delete', (v) => {
                        v.options.splice(oi, 1);
                        if (!v.options.some((o) => o.isOriginal)) v.options[0].isOriginal = true;
                      })}>
                        <Icon name="trash" /> Xoá phương án
                      </button>
                    </div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_9rem]">
                      <Field label="Tên phương án"><input className="field" value={option.name} onChange={(e) => editVar(vi, `o${oi}.name`, (v) => void (v.options[oi].name = e.target.value))} /></Field>
                      <Field label="Tên ngắn" hint="Cho biểu đồ phiên lớp"><input className="field" value={option.shortName ?? ''} onChange={(e) => editVar(vi, `o${oi}.short`, (v) => void (v.options[oi].shortName = e.target.value))} /></Field>
                      <Field label="Mã"><input className="field font-mono t-sm" value={option.id} onChange={(e) => editVar(vi, `o${oi}.id`, (v) => void (v.options[oi].id = e.target.value.trim()))} /></Field>
                      <Field label="Mô tả cho học sinh" className="sm:col-span-3"><input className="field" value={option.desc ?? ''} onChange={(e) => editVar(vi, `o${oi}.desc`, (v) => void (v.options[oi].desc = e.target.value))} /></Field>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <Field label="± Thời gian (giờ)"><NumberInput label="Hệ số thời gian" value={option.timeDelta} disabled={option.isOriginal} onChange={(n) => editVar(vi, `o${oi}.t`, (v) => void (v.options[oi].timeDelta = n))} /></Field>
                      <Field label="± Tổn thất"><NumberInput label="Hệ số tổn thất" value={option.casualtyDelta} disabled={option.isOriginal} onChange={(n) => editVar(vi, `o${oi}.c`, (v) => void (v.options[oi].casualtyDelta = n))} /></Field>
                      <Field label="± Điểm thế trận"><NumberInput label="Hệ số điểm thế trận" value={option.positionScoreDelta} disabled={option.isOriginal} onChange={(n) => editVar(vi, `o${oi}.s`, (v) => void (v.options[oi].positionScoreDelta = n))} /></Field>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Field label="Giả định (vì sao hệ số như vậy)" hint="Học sinh thấy ở bước 5, mục Xem giả định."><textarea className="field" rows={3} value={option.assumptions} onChange={(e) => editVar(vi, `o${oi}.a`, (v) => void (v.options[oi].assumptions = e.target.value))} /></Field>
                      <Field label="Nhận xét ở bước 6 (tuỳ chọn)" hint="Khích lệ, không chấm điểm hay chê."><textarea className="field" rows={3} value={feedback(variable.id, option.id)} onChange={(e) => edit(`fb.${vi}.${oi}`, (d) => setFeedback(d, variable.id, option.id, e.target.value))} /></Field>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => editVar(vi, 'opt.add', (v) => {
                const n = v.options.length + 1;
                v.options.push(newOption(uniqueId(slug(`phuong an ${n}`), v.options.map((o) => o.id)), false, `Phương án ${n}`));
              })}>
                <Icon name="plus" /> Thêm phương án
              </button>
            </fieldset>
          </section>
        ))}

        <button type="button" id="btn-add-variable" className="btn btn-primary self-start" onClick={addVariable}>
          <Icon name="plus" /> Thêm biến số
        </button>

        {variables.length > 0 && (
          <section className="card p-5">
            <h3 className="t-lg font-semibold">Lời nhận xét chung ở bước 6</h3>
            <div className="mt-3 grid gap-4">
              <Field label="Lời mở đầu"><textarea className="field" rows={2} value={lesson.explanations?.intro ?? ''} onChange={(e) => edit('exp.intro', (d) => { d.explanations ??= { intro: '', variableFeedbacks: {}, encouragingConclusion: '' }; d.explanations.intro = e.target.value; })} /></Field>
              <Field label="Lời khích lệ kết bài"><textarea className="field" rows={2} value={lesson.explanations?.encouragingConclusion ?? ''} onChange={(e) => edit('exp.end', (d) => { d.explanations ??= { intro: '', variableFeedbacks: {}, encouragingConclusion: '' }; d.explanations.encouragingConclusion = e.target.value; })} /></Field>
            </div>
          </section>
        )}
      </div>
      <TryPanel lesson={lesson} />
    </div>
  );
}

/** Runs the engine on the draft: pick choices, see the numbers, plus the range over all combinations. */
function TryPanel({ lesson }: { lesson: AppLesson }) {
  const variables = lesson.question?.variables ?? [];
  const [picked, setPicked] = useState<Choices>({});
  const choices = { ...originalChoices(lesson), ...Object.fromEntries(Object.entries(picked).filter(([v, o]) => variables.find((x) => x.id === v)?.options.some((y) => y.id === o))) };
  const ready = variables.length > 0 && variables.every((v) => v.options.some((o) => o.isOriginal)) && lesson.baseline;
  const range = useMemo(() => {
    if (!ready) return null;
    const combos = variables.reduce<Choices[]>((acc, v) => acc.flatMap((c) => v.options.map((o) => ({ ...c, [v.id]: o.id }))), [{}]).slice(0, 5000);
    const results = combos.map((c) => calculate(lesson as Lesson, c).student);
    const span = (k: 'durationHours' | 'casualties' | 'positionScore') => [Math.min(...results.map((r) => r[k])), Math.max(...results.map((r) => r[k]))];
    return { count: combos.length, d: span('durationHours'), c: span('casualties'), s: span('positionScore') };
  }, [lesson, variables, ready]);
  if (!ready) return <aside className="card p-5 t-sm muted xl:sticky xl:top-24">Thêm biến số để thử nhanh kết quả ở đây.</aside>;
  const r = calculate(lesson as Lesson, choices).student;
  return (
    <aside className="card p-5 xl:sticky xl:top-24" aria-label="Thử nhanh">
      <h3 className="t-lg font-semibold">Thử nhanh</h3>
      <p className="t-sm muted">Chọn như học sinh, xem kết quả ngay.</p>
      <div className="mt-3 flex flex-col gap-2">
        {variables.map((v) => (
          <label key={v.id} className="block">
            <span className="t-xs muted">{v.title}</span>
            <select className="field !min-h-10 t-sm" value={choices[v.id]} onChange={(e) => setPicked({ ...picked, [v.id]: e.target.value })}>
              {v.options.map((o) => <option key={o.id} value={o.id}>{o.isOriginal ? '★ ' : ''}{o.name}</option>)}
            </select>
          </label>
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div><dt className="t-xs muted">Giờ</dt><dd className="metric metric-sm">{r.durationHours}</dd></div>
        <div><dt className="t-xs muted">Tổn thất</dt><dd className="metric metric-sm">{r.casualties.toLocaleString('vi-VN')}</dd></div>
        <div><dt className="t-xs muted">Điểm</dt><dd className="metric metric-sm">{r.positionScore}</dd></div>
      </dl>
      <p className="mt-2 t-sm">{r.outcomeSummary}</p>
      {range && (
        <p className="mt-3 border-t border-rule pt-3 t-xs muted">
          Trên {range.count.toLocaleString('vi-VN')} tổ hợp: {range.d[0]}–{range.d[1]} giờ · {range.c[0].toLocaleString('vi-VN')}–{range.c[1].toLocaleString('vi-VN')} tổn thất · {range.s[0]}–{range.s[1]} điểm.
        </p>
      )}
    </aside>
  );
}
