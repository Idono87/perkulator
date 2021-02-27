import {
  TaskDirectiveType,
  TaskRunDirective,
  TaskStopDirective,
} from '~/worker/worker-task';
import { createChangedPaths } from './create-changed-paths';
import { createTaskOptions } from './create-perkulator-options';

export const RUN_DIRECTIVE: TaskRunDirective = {
  type: TaskDirectiveType.RUN,
  taskOptions: createTaskOptions(),
  changedPaths: createChangedPaths(),
};

export const STOP_DIRECTIVE: TaskStopDirective = {
  type: TaskDirectiveType.STOP,
};
