// The three comparison rows (stage 5, the last-run card, the student dashboard). By default they
// are duration, casualties and position score of a battle; a lesson relabels them with
// `comparisonMetrics` (e.g. "Sản lượng công nghiệp nặng: 90 / 100"). UI-free.
import type { Lesson } from './lesson-schema';

export type MetricKey = 'duration' | 'casualties' | 'score';
export type MetricRow = {
  key: MetricKey;
  label: string;
  /** The student's value, e.g. "1 896 giờ (~79 ngày)". */
  value: (n: number) => string;
  /** The original's value (a metric may declare `origFormatted`). */
  original: (n: number) => string;
  /** "như cách gốc" or "+10 điểm so với cách gốc". */
  delta: (n: number) => string;
};

const num = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
const days = (hours: number) => (hours / 24).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
const signed = (n: number, unit = '') => (n === 0 ? 'như cách gốc' : `${n > 0 ? '+' : '−'}${Math.abs(n).toLocaleString('vi-VN')}${unit} so với cách gốc`);

const DEFAULTS: { key: MetricKey; label: string; value: (n: number) => string; deltaUnit: string }[] = [
  { key: 'duration', label: 'Thời gian chiến dịch', value: (n) => `${n} giờ (~${days(n)} ngày)`, deltaUnit: ' giờ' },
  { key: 'casualties', label: 'Tổn thất ước tính', value: (n) => `${num(n)} binh sĩ`, deltaUnit: '' },
  { key: 'score', label: 'Điểm thế trận', value: (n) => `${n} / 100`, deltaUnit: ' điểm' }
];

export function comparisonRows(lesson: Pick<Lesson, 'comparisonMetrics'>): MetricRow[] {
  return DEFAULTS.map((d, i) => {
    const metric = lesson.comparisonMetrics?.[i];
    if (!metric) return { key: d.key, label: d.label, value: d.value, original: d.value, delta: (n) => signed(n, d.deltaUnit) };
    const unit = metric.unit ?? '';
    const value = (n: number) => `${num(n)}${unit}`;
    // A unit like " / 100" is a scale, not a thing to count: deltas read "+10 điểm".
    const deltaUnit = unit.trim().startsWith('/') ? ' điểm' : unit;
    return { key: d.key, label: metric.label, value, original: (n) => metric.origFormatted ?? value(n), delta: (n) => signed(n, deltaUnit) };
  });
}
