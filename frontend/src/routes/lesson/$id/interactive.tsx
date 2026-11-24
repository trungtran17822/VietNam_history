import { createFileRoute } from '@tanstack/react-router';
import { requireUser } from '../../../lib/guards';
import { getLesson, isVisibleForStudent } from '../../../lib/storage';
import { LessonHidden } from '../../../components/LessonPage';
import { StageLoop } from '../../../components/StageLoop';

export const Route = createFileRoute('/lesson/$id/interactive')({
  validateSearch: (search: Record<string, unknown>): { step?: number } => (Number(search.step) >= 1 ? { step: Number(search.step) } : {}),
  beforeLoad: requireUser(),
  loader: ({ params }) => getLesson(params.id),
  component: InteractiveRoute
});

function InteractiveRoute() {
  const lesson = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const { step } = Route.useSearch();
  if (!lesson || (user.role === 'student' && !isVisibleForStudent(lesson))) return <LessonHidden />;
  return <StageLoop key={lesson.id} lesson={lesson} role={user.role} initialStep={step} />;
}
