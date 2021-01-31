import InvalidRunnableTaskError from '~/errors/invalid-runnable-task-error';
import TaskModuleNotFoundError from '~/errors/task-module-not-found-error';
import {
  ChangedPaths,
  RunnableTask,
  RunnerMessageInterface,
  TaskEvent,
  TaskOptions,
  TaskResultsObject,
} from '~/types';
import { TaskEventType } from './enum-task-event-type';

const ERR_MODULE_NOT_FOUND = 'MODULE_NOT_FOUND';

/**
 * Proxy that handles communication between perkulator and the imported task module.
 *
 * @internal
 */
export default class TaskProxy {
  /** Proxy options */
  private readonly options: any;

  /** Imported module */
  private readonly taskModule: RunnableTask;

  /** Registered message listener */
  private readonly runnerMessageListener: RunnerMessageInterface;

  /** Is the task stopped? */
  private isStopped: boolean = false;

  private constructor(
    taskModule: RunnableTask,
    options: TaskOptions,
    runnerMessageListener: RunnerMessageInterface,
  ) {
    this.options = options;
    this.taskModule = taskModule;
    this.runnerMessageListener = runnerMessageListener;
  }

  /**
   * Create a new TaskProxy
   *
   * @param path
   * @param options
   */
  public static create(
    options: TaskOptions,
    runnerMessageListener: RunnerMessageInterface,
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
      resolve(this.taskModule.run(changedPaths, this.handleUpdate.bind(this)));
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

        this.runnerMessageListener.handleMessage(eventMessage);
      })
      .catch((error: Error) => {
        this.runnerMessageListener.handleMessage({
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
    this.runnerMessageListener.handleMessage({
      eventType: TaskEventType.update,
      update,
    });
  }
}
