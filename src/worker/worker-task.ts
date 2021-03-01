import { MessagePort } from 'worker_threads';

import {
  EMIT_WORKER_TASK_ERROR_KEY,
  RUN_WORKER_TASK_KEY,
} from '~/worker/worker-pool';
import { TaskEventType } from '~/task/task-runner';

import type { ChangedPaths } from '~/file-watcher/file-watcher';
import type { RunnerEventListener } from '~/task/task-manager';
import type { TaskEvent, TaskOptions } from '~/task/task-runner';

type WorkerEventListener = RunnerEventListener<TaskEvent>;

export const enum TaskDirectiveType {
  RUN = 'run',
  STOP = 'stop',
}

export interface TaskRunDirective {
  type: TaskDirectiveType.RUN;
  taskOptions: TaskOptions;
  changedPaths: ChangedPaths;
}

export interface TaskStopDirective {
  type: TaskDirectiveType.STOP;
}

export type TaskDirective = TaskRunDirective | TaskStopDirective;

export default class WorkerTask {
  private readonly taskOptions: TaskOptions;
  private readonly changedPaths: ChangedPaths;
  private readonly eventListener: WorkerEventListener;
  private port: MessagePort | null = null;

  public constructor(
    taskOptions: TaskOptions,
    changedPaths: ChangedPaths,
    eventListener: WorkerEventListener,
  ) {
    this.taskOptions = taskOptions;
    this.changedPaths = changedPaths;
    this.eventListener = eventListener;
  }

  public [EMIT_WORKER_TASK_ERROR_KEY](error: Error): void {
    this.eventListener({ eventType: TaskEventType.error, error });
  }

  public [RUN_WORKER_TASK_KEY](port: MessagePort): void {
    this.port = port;

    this.port.on('message', this.eventListener);
    this.port.on('close', () => {
      this.eventListener({
        eventType: TaskEventType.error,
        error: new Error('Message port has been closed'),
        // TODO: Send a better error
      });
    });

    const directive: TaskRunDirective = {
      type: TaskDirectiveType.RUN,
      taskOptions: this.taskOptions,
      changedPaths: this.changedPaths,
    };

    this.port.postMessage(directive);
  }

  public stop(): void {
    if (this.port !== null) {
      const directive: TaskStopDirective = {
        type: TaskDirectiveType.STOP,
      };
      this.port.postMessage(directive);
    }
  }
}
