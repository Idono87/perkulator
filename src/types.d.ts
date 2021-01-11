import type { TaskResultCode } from './task/enum-task-result-code';

export interface PerkulatorOptions {
  paths?: string[];
  tasks?: TaskOptions[];
}

export interface TaskOptions {
  readonly path: string;
}

export interface TaskResults {
  resultCode: TaskResultCode;
  errors?: string[];
  results?: string[];
}

export interface RunnableTask {
  run: () => Promise<TaskResultObject>;
  stop: () => Promise<void>;
}

export interface TaskResultObject {
  errors?: Error[];
  results?: Object[];
}
