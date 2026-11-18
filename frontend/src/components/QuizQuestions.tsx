// The lesson's questions as radio groups. Used by the lesson page (Questions tab) and by stage 3 of a
// lesson without a simulation, where the answers feed the opinion summary.
import { useState } from 'react';
import { getQuizAnswers, saveQuizAnswer, type AppLesson } from '../lib/storage';

// `record`: only a real student's picks are stored (the teacher's preview must not write to the device).
export function QuizQuestions({ lesson, interactive, record, onAnswer }: { lesson: AppLesson; interactive: boolean; record: boolean; onAnswer?: () => void }) {
  const [picked, setPicked] = useState<Record<string, string>>(() => (record ? getQuizAnswers(lesson.id) : {}));
  if (!lesson.questions.length) return <p className="muted">Thầy cô chưa thêm câu hỏi luyện tập cho bài học này.</p>;
  return (
    <ol className="flex max-w-3xl flex-col gap-4">
      {lesson.questions.map((q, i) => {
        const chosen = q.options?.find((o) => o.id === picked[q.id]);
        return (
          <li key={q.id} className="card p-5">
            <p className="font-semibold">Câu {i + 1}. {q.text}</p>
            {q.type === 'multiple_choice' && q.options ? (
              <fieldset className="mt-3 flex flex-col gap-2" disabled={!interactive}>
                <legend className="sr-only">Chọn một đáp án</legend>
                {q.options.map((o) => (
                  <label key={o.id} className="variable-option">
                    <input type="radio" name={`q-${q.id}`} value={o.id} checked={picked[q.id] === o.id} onChange={() => {
                      setPicked({ ...picked, [q.id]: o.id });
                      if (record) saveQuizAnswer(lesson.id, q.id, o.id);
                      onAnswer?.();
                    }} />
                    <span>{o.text}{!interactive && o.isCorrect && <span className="original-badge">Đáp án</span>}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              interactive ? <textarea className="field mt-3" placeholder="Em ghi suy nghĩ của mình (chỉ lưu trên màn hình này)…" aria-label={`Trả lời câu ${i + 1}`} /> : q.guide && <p className="mt-2 t-sm muted">Gợi ý: {q.guide}</p>
            )}
            {chosen && (
              <p className={`mt-3 rounded-lg px-3 py-2 t-sm ${chosen.isCorrect ? 'bg-ok-tint text-ok' : 'bg-warn-tint text-warn'}`} role="status">
                <strong>{chosen.isCorrect ? 'Chính xác. ' : 'Chưa đúng, em thử nghĩ thêm nhé. '}</strong>
                {q.isExplanationReleased ? chosen.explanation : chosen.isCorrect ? 'Thầy cô sẽ giải thích chi tiết trên lớp.' : 'Hãy xem lại sa bàn và lời dẫn từng giai đoạn.'}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
