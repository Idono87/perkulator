import anymatch, { Tester } from 'anymatch';

import TaskRunnerProcessAdapter from './task-runner-process-adapter';
import TaskStopTimeoutError from '~/errors/task-stop-timeout-error';
import { TaskEventType } from './enum-task-event-type';
import DeferredTimeout from '~/utils/deferred-timeout';

import type {
  ChangedPaths,
  RunnerMessageListener,
  TaskOptions,
  TaskRunnableInterface,
  TaskEvent,
} from '~/types';

const STOP_TIMEOUT = 10000;

/**
 * Responsible for running the task.
 *
 * @internal
 */
export default class TaskRunner implements RunnerMessageListener {
  /** Task configuration object */
  private readonly options: TaskOptions;

  /** Stores messages not yet retrieved by the generator */
  private readonly messageBuffer: TaskEvent[];

  /** Notify the generator of a new message */
  private notifyMessageObserver?: () => void;

  /** Path filter methods */
  private readonly includeTester: Tester;
  private readonly excludeTester: Tester;

  /** Runner used for the task */
  private readonly taskRunner: TaskRunnableInterface;

  /** Is currently running? */
  private running: boolean = false;

  /** Stop timeout promise */
  private pendingStopPromise?: DeferredTimeout<void>;

  private constructor(options: TaskOptions) {
    this.options = options;
    this.includeTester = anymatch(this.options.include ?? ['**/*']);
    this.excludeTester = anymatch(this.options.exclude ?? []);
    // TODO: Add task proxy if not forked.
    this.taskRunner = TaskRunnerProcessAdapter.create(this.options, this);
    this.messageBuffer = [];
  }

  /**
   * Create and return a task runner object.
   *
   * @param options
   */
  public static createTask(options: TaskOptions): TaskRunner {
    return new TaskRunner(options);
  }

  public handleMessage(message: TaskEvent): void {
    this.messageBuffer.push(message);
    this.notifyMessageObserver?.();
  }

  /**
   * Run the task.
   * Resolves into a generator if the task is run otherwise
   * null is resolved.
   */
  public async run({
    add,
    remove,
    change,
  }: ChangedPaths): Promise<AsyncIterable<TaskEvent> | null> {
    if (this.running) {
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
      return null;
    }

    this.running = true;

    await this.taskRunner.run(filteredPaths);

    return this.getMessageGenerator();
  }

  /**
   * Async generator that yields messages
   * from the running task.
   */
  private async *getMessageGenerator(): AsyncIterable<TaskEvent> {
    while (this.running) {
      if (this.messageBuffer.length === 0) {
        await new Promise<void>((resolve) => {
          this.notifyMessageObserver = () => {
            if (this.messageBuffer.length > 0) {
              this.notifyMessageObserver = undefined;
              resolve();
            }
          };
        });
      }

      const message = this.messageBuffer.shift() as TaskEvent;

      if (
        message.eventType === TaskEventType.result ||
        message.eventType === TaskEventType.stop
      ) {
        this.running = false;
        this.pendingStopPromise?.stop();
      }

      if (message.eventType === TaskEventType.error) {
        throw message.error;
      }

      yield message;
    }
  }

  /**
   * Attempts to stop the running task.
   * If the attempt fails a TaskTerminationTimeoutError
   * is sent back through the generator
   */
  public stop(): void {
    if (this.running) {
      this.pendingStopPromise = new DeferredTimeout(undefined, STOP_TIMEOUT);

      this.pendingStopPromise.catch(() => {
        this.handleMessage({
          eventType: TaskEventType.error,
          error: new TaskStopTimeoutError(),
        });
      });

      this.taskRunner.stop();
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
