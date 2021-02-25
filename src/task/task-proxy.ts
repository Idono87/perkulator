import InvalidRunnableTaskError from '~/errors/invalid-runnable-task-error';
import TaskModuleNotFoundError from '~/errors/task-module-not-found-error';
import { TaskEventType } from '~/task/task-runner';

import type { ChangedPaths } from '~/file-watcher/file-watcher';
import type {
  TaskOptions,
  TaskEvent,
  RunnableTaskOptions,
} from '~/task/task-runner';

type TaskProxyEventListener = (event: TaskEvent) => void;

/**
 * Interface for a runnable task.
 */
export interface RunnableTask {
  run: (
    changedPaths: ChangedPaths,
    update: (update: any) => void,
    options?: RunnableTaskOptions,
  ) => Promise<TaskResultsObject> | TaskResultsObject | undefined;
  stop: () => void;
}

/**
 * Expected runnable task response object.
 */

export interface TaskResultsObject {
  errors?: string[];
  results?: string[];
}

const ERR_MODULE_NOT_FOUND = 'MODULE_NOT_FOUND';

/**
 * Proxy that handles communication between perkulator and the imported task module.
 *
 * @internal
 */
export default class TaskProxy {
  private readonly taskOptions: TaskOptions;

  /** Imported module */
  private readonly taskModule: RunnableTask;

  private readonly eventListener: TaskProxyEventListener;

  private isStopped: boolean = false;

  private constructor(
    taskModule: RunnableTask,
    options: TaskOptions,
    eventListener: TaskProxyEventListener,
  ) {
    this.taskOptions = options;
    this.taskModule = taskModule;
    this.eventListener = eventListener;
  }

  public static create(
    options: TaskOptions,
    eventListener: TaskProxyEventListener,
  ): TaskProxy {
    let taskModule: RunnableTask;
    try {
      taskModule = require(options.module);
    } catch (err) {
      if (err.code === ERR_MODULE_NOT_FOUND) {
        throw new TaskModuleNotFoundError(options.module);
      }
      throw err;
    }

    if (typeof taskModule.run !== 'function') {
      throw new InvalidRunnableTaskError(options.module, 'run');
    } else if (typeof taskModule.stop !== 'function') {
      throw new InvalidRunnableTaskError(options.module, 'stop');
    }

    return new TaskProxy(taskModule, options, eventListener);
  }

  /* 
  Run the imported task module and await a final result before posting the message to
  the main thread.
  */
  public async run(changedPaths: ChangedPaths): Promise<void> {
    this.isStopped = false;
    let eventMessage: TaskEvent;

    try {
      const result = await this.taskModule.run(
        changedPaths,
        this.handleUpdate.bind(this),
        this.taskOptions.options,
      );

      if (this.isStopped) {
        eventMessage = {
          eventType: TaskEventType.stop,
        };
      } else {
        eventMessage = {
          eventType: TaskEventType.result,
          result,
        };
      }
    } catch (error) {
      eventMessage = {
        eventType: TaskEventType.error,
        error,
      };
    }

    this.eventListener(eventMessage);
  }

  public stop(): void {
    this.isStopped = true;
    this.taskModule.stop();
  }

  /*
  Send updates from the running task to the listener
  */
  private handleUpdate(update: any): void {
    this.eventListener({
      eventType: TaskEventType.update,
      update,
    });
  }
}
