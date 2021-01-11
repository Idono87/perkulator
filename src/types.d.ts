import type { TaskResultCode } from './task/enum-task-result-code';

export interface PerkulatorOptions {
  paths?: string[];
  tasks?: TaskOptions[];
}

export interface TaskOptions {
  readonly path: string;
}

export interface TaskResults {
  resultcode: TaskResultCode;
}

export interface RunnableTask {
  runTask: () => Promise<TaskResults>;
  stopTask: () => Promise<void>;
}
