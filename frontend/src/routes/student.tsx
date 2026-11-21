import { Link, createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { requireUser } from '../lib/guards';
import { getStudentRun, getVisibleForStudent } from '../lib/storage';
import { comparisonRows } from '../lib/comparison';
import { fold } from '../lib/text';
import { Thumbnail } from '../components/Thumbnail';
import { AtlasCard, Icon } from '../components/ui';

export const Route = createFileRoute('/student')({ beforeLoad: requireUser('student'), component: StudentDashboard });

function StudentDashboard() {
  const lessons = useMemo(getVisibleForStudent, []);
  const [query, setQuery] = useState('');
  const featured = lessons.find(lesson => lesson.isPilot) ?? lessons[0];
  const shown = lessons.filter((l) => !query.trim() || fold(`${l.title} ${l.era}`).includes(fold(query.trim())));
  return (
    <main id="view-student-dashboard" className="app-view active mx-auto max-w-6xl px-4 pb-12 pt-8">
      <div className="classroom-heading">
        <div>
          <h1>Bài đã học</h1>
          <p className="muted">Xem lại diễn biến, đọc nguồn tư liệu và thử cách làm của em.</p>
        </div>
      </div>
      {featured && (
        <section className="classroom-feature" aria-label="Bài học nổi bật">
          <div className="feature-copy">
            <p className="t-sm muted">{featured.era}</p>
            <h2>{featured.title}</h2>
            <p className="muted">{featured.objectives || featured.subtitle}</p>
            <div className="feature-actions">
              <Link to="/lesson/$id" params={{ id: featured.id }} className="btn btn-primary"><Icon name="play" /> Xem bài học</Link>
              {featured.question?.variables.length ? <Link to="/lesson/$id/interactive" params={{ id: featured.id }} className="btn btn-secondary">Thử cách khác</Link> : null}
            </div>
          </div>
          <div className="feature-art">
            {featured.isPilot ? <img src="./assets/decor/classroom-cover.webp" alt="Minh họa nghệ thuật sa bàn một đồn từ thời Tây Sơn" /> : <Thumbnail lesson={featured} />}
            {featured.isPilot && <span>Minh họa nghệ thuật</span>}
          </div>
        </section>
      )}
      <AtlasCard />
      <h2 className="classroom-list-title">Thư viện bài học</h2>
      <label className="relative mt-5 block max-w-md">
        <span className="sr-only">Tìm bài học</span>
        <Icon name="search" className="icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted" />
        <input className="field !pl-9" type="search" placeholder="Tìm bài học…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((lesson) => {
          const run = getStudentRun(lesson.id);
          return (
            <article key={lesson.id} className="card flex flex-col overflow-hidden">
              <div className="aspect-[16/7] border-b border-rule"><Thumbnail lesson={lesson} /></div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="t-sm muted">{lesson.era} · {lesson.teacher}</p>
                <h2 className="t-lg font-semibold">{lesson.title}</h2>
                <p className="line-clamp-2 t-sm muted">{lesson.subtitle || lesson.objectives}</p>
                {run && <p className="t-xs text-ok">Em đã thử một phương án: {comparisonRows(lesson)[2].label.toLowerCase()} {comparisonRows(lesson)[2].value(run.student.positionScore)}</p>}
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Link to="/lesson/$id" params={{ id: lesson.id }} className="btn btn-primary btn-sm"><Icon name="play" /> Xem bài</Link>
                  {Boolean(lesson.question?.variables.length) && (
                    <Link to="/lesson/$id/interactive" params={{ id: lesson.id }} className="btn btn-secondary btn-sm">Thử cách khác</Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {!shown.length && (
          <p className="col-span-full rounded-xl border border-dashed border-rule p-10 text-center muted">
            {lessons.length ? 'Không có bài học nào khớp.' : 'Thầy cô chưa phát hành bài học nào. Bài sẽ hiện ở đây sau buổi học.'}
          </p>
        )}
      </div>
    </main>
  );
}
