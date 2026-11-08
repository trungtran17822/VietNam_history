import { createFileRoute } from '@tanstack/react-router';
import { requireUser } from '../../../lib/guards';
import { getLesson, isVisibleForStudent } from '../../../lib/storage';
import { LessonHidden, LessonPage } from '../../../components/LessonPage';

export const Route = createFileRoute('/lesson/$id/')({
  beforeLoad: requireUser(),
  loader: ({ params }) => getLesson(params.id),
  component: LessonRoute
});

function LessonRoute() {
  const lesson = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  if (!lesson || (user.role === 'student' && !isVisibleForStudent(lesson))) return <LessonHidden />;
  return <LessonPage key={lesson.id} initial={lesson} mode={user.role} />;
}
