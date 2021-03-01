import { TaskProcessDirective } from '~/task/task-runner-process-adapter';

import type { TaskProcessDirectiveMessage } from '~/task/task-runner-process-adapter';
import { createTaskOptions } from './create-perkulator-options';
import { createChangedPaths } from './create-changed-paths';

export const START_DIRECTIVE: TaskProcessDirectiveMessage = {
  directive: TaskProcessDirective.start,
  options: createTaskOptions(),
};

export const STOP_DIRECTIVE: TaskProcessDirectiveMessage = {
  directive: TaskProcessDirective.stop,
};

export const EXIT_DIRECTIVE: TaskProcessDirectiveMessage = {
  directive: TaskProcessDirective.exit,
};

export const RUN_DIRECTIVE: TaskProcessDirectiveMessage = {
  directive: TaskProcessDirective.run,
  changedPaths: createChangedPaths(),
};
