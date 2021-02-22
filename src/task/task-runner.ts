import anymatch, { Tester } from 'anymatch';

import TaskRunnerProcessAdapter from './task-runner-process-adapter';
import TaskStopTimeoutError from '~/errors/task-stop-timeout-error';
import { TaskEventType } from './enum-task-event-type';
import DeferredTimeout from '~/utils/deferred-timeout';

import type {
  ChangedPaths,
  TaskRunnableInterface,
  TaskOptions,
  TaskEvent,
  TaskEventListener,
  TaskEventInterface,
} from '~/types';
import TaskProxy from './task-proxy';

type TTaskRunnerEventListener = TaskEventListener<TaskEvent>;

const STOP_TIMEOUT = 10000;

/**
 * Responsible for running the task.
 *
 * @internal
 */
export default class TaskRunner
  implements TaskRunnableInterface, TaskEventInterface<TaskEvent> {
  /** Task configuration object */
  private readonly options: TaskOptions;

  /** Path filter methods */
  private readonly includeTester: Tester;
  private readonly excludeTester: Tester;

  /** Runner used for the task */
  private readonly runnableTask: TaskRunnableInterface;

  /** Object method/function listening for events */
  private taskEventListener: TTaskRunnerEventListener | null = null;

  /** Is currently running? */
  private isRunning: boolean = false;

  /** Stop timeout promise */
  private pendingStopPromise?: DeferredTimeout<void>;

  private constructor(options: TaskOptions) {
    this.options = options;

    this.includeTester = anymatch(this.options.include ?? ['**/*']);
    this.excludeTester = anymatch(this.options.exclude ?? []);

    this.runnableTask =
      options.fork === undefined || options.fork
        ? TaskRunnerProcessAdapter.create(
            this.options,
            this.handleEvent.bind(this),
          )
        : TaskProxy.create(this.options, this.handleEvent.bind(this));
  }

  /**
   * Create and return a task runner object.
   *
   * @param options
   */
  public static create(options: TaskOptions): TaskRunner {
    return new TaskRunner(options);
  }

  public handleEvent(message: TaskEvent): void {
    if (
      message.eventType === TaskEventType.result ||
      message.eventType === TaskEventType.stop ||
      message.eventType === TaskEventType.error
    ) {
      this.isRunning = false;
      this.pendingStopPromise?.stop();
    }

    this.taskEventListener?.(message);
  }

  /**
   * Set/replace the task event listener
   *
   * @param listener
   */
  public setTaskEventListener(listener: TTaskRunnerEventListener): void {
    this.taskEventListener = listener;
  }

  /**
   * Removes the set task event listener
   */
  public removeTaskEventListener(): void {
    this.taskEventListener = null;
  }

  /**
   * Run the task.
   */
  public async run({ add, remove, change }: ChangedPaths): Promise<void> {
    if (this.isRunning) {
      // TODO: Add proper error
      throw new Error('Task is already running.');
    }

    const filteredPaths: ChangedPaths = {
      add: this.filterPaths(add),
      remove: this.filterPaths(remove),
      change: this.filterPaths(change),
    };

    const pathCount =
      filteredPaths.add.length +
      filteredPaths.remove.length +
      filteredPaths.change.length;

    if (pathCount === 0) {
      this.handleEvent({
        eventType: TaskEventType.skipped,
      });
      return;
    }

    this.isRunning = true;

    await this.runnableTask.run(filteredPaths);
  }

  /**
   * Attempts to stop the running task.
   * If the attempt fails a TaskTerminationTimeoutError
   * is sent back through the generator
   */
  public stop(): void {
    if (this.isRunning) {
      this.pendingStopPromise = new DeferredTimeout(undefined, STOP_TIMEOUT);

      this.pendingStopPromise.catch(() => {
        this.handleEvent({
          eventType: TaskEventType.error,
          error: new TaskStopTimeoutError(this.options.module),
        });
      });

      this.runnableTask.stop();
    }
  }

  /**
   * Filter out all paths that do not match the included
   * and excluded paths.
   *
   * @param paths
   */
  private filterPaths(paths: string[]): string[] {
    return paths.filter((path) => {
      return this.includeTester(path) && !this.excludeTester(path);
    });
  }
}
