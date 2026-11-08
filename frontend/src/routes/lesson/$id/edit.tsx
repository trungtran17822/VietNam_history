import { createFileRoute } from '@tanstack/react-router';
import { requireUser } from '../../../lib/guards';
import { getLesson } from '../../../lib/storage';
import { LessonHidden } from '../../../components/LessonPage';
import { Editor } from '../../../components/Editor';

export const Route = createFileRoute('/lesson/$id/edit')({
  beforeLoad: requireUser('teacher'),
  loader: ({ params }) => getLesson(params.id),
  component: EditRoute
});

function EditRoute() {
  const lesson = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  return lesson ? <Editor key={lesson.id} initial={lesson} teacher={user.displayName} /> : <LessonHidden />;
}
