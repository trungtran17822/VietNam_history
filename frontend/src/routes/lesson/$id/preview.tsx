import { createFileRoute } from '@tanstack/react-router';
import { requireUser } from '../../../lib/guards';
import { getLesson } from '../../../lib/storage';
import { LessonHidden, LessonPage } from '../../../components/LessonPage';

// The teacher sees the lesson exactly as a student would (no notes, no editing tools).
export const Route = createFileRoute('/lesson/$id/preview')({
  beforeLoad: requireUser('teacher'),
  loader: ({ params }) => getLesson(params.id),
  component: PreviewRoute
});

function PreviewRoute() {
  const lesson = Route.useLoaderData();
  return lesson ? <LessonPage key={lesson.id} initial={lesson} mode="preview" /> : <LessonHidden />;
}
