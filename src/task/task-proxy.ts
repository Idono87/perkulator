import InvalidRunnableTaskError from '~/errors/invalid-runnable-task-error';
import TaskModuleNotFoundError from '~/errors/task-module-not-found-error';
import { TaskEventType } from '~/task/task-runner';

import type { RunnerEventListener } from '~/task/task-manager';
import type { ChangedPaths } from '~/file-watcher/file-watcher';
import type {
  TaskOptions,
  TaskEvent,
  RunnableTaskOptions,
} from '~/task/task-runner';

type TProxyEventListener = RunnerEventListener<TaskEvent>;

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
  /** Proxy options */
  private readonly taskOptions: TaskOptions;

  /** Imported module */
  private readonly taskModule: RunnableTask;

  /** Registered message listener */
  private readonly taskEventListener: TProxyEventListener;

  /** Is the task stopped? */
  private isStopped: boolean = false;

  private constructor(
    taskModule: RunnableTask,
    options: TaskOptions,
    runnerEventListener: TProxyEventListener,
  ) {
    this.taskOptions = options;
    this.taskModule = taskModule;
    this.taskEventListener = runnerEventListener;
  }

  /**
   * Create a new TaskProxy
   *
   * @param path
   * @param options
   */
  public static create(
    options: TaskOptions,
    runnerMessageListener: TProxyEventListener,
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

    return new TaskProxy(taskModule, options, runnerMessageListener);
  }

  /**
   * Run the imported task module
   */
  public run(changedPaths: ChangedPaths): void {
    this.isStopped = false;
    new Promise<TaskResultsObject | undefined>((resolve) => {
      resolve(
        this.taskModule.run(
          changedPaths,
          this.handleUpdate.bind(this),
          this.taskOptions.options,
        ),
      );
    })
      .then((result: TaskResultsObject | undefined) => {
        let eventMessage: TaskEvent;
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

        this.taskEventListener(eventMessage);
      })
      .catch((error: Error) => {
        this.taskEventListener({
          eventType: TaskEventType.error,
          error,
        });
      });
  }

  /**
   * Notify the running task module with a stop.
   */
  public stop(): void {
    this.isStopped = true;
    this.taskModule.stop();
  }

  /**
   * Send an update message to the implemented runnerMessageListener
   * @param update
   */
  private handleUpdate(update: any): void {
    this.taskEventListener({
      eventType: TaskEventType.update,
      update,
    });
  }
}
