import TaskRunner from './task-runner';
import { TaskEventType } from '../task/task-runner';

import type { ChangedPaths } from '../file-watcher/file-watcher';
import type { TaskOptions, TaskEvent } from '../task/task-runner';
import type { TaskResultsObject } from './task-proxy';
import type {
  Runner,
  RunnerEventListener,
  RunnerEventMethods,
} from '../task/task-manager';
import WorkerPool from '../worker/worker-pool';

type GroupRunnerEvents = TaskEvent | GroupEvent;
type GroupRunnerEventListener = RunnerEventListener<GroupRunnerEvents>;

export interface GroupOptions {
  tasks: TaskOptions[];
  parallel?: boolean;
}

export type GroupEvent =
  | {
      eventType: GroupEventType.result;
      result?: TaskResultsObject;
    }
  | { eventType: GroupEventType.skipped }
  | { eventType: GroupEventType.stop; taskName?: string };

export const enum GroupEventType {
  result = 'group_result',
  skipped = 'group_skipped',
  stop = 'group_stop',
}

/**
 * Groups tasks as a cohesive unit.
 *
 * @internal
 */
export default class GroupRunner
  implements Runner, RunnerEventMethods<GroupRunnerEvents> {
  /**
   * Task group options
   */
  private readonly options: GroupOptions;

  /** Event listener to call for each task event */
  private groupEventListener: GroupRunnerEventListener | null = null;

  /**
   * A list of registered tasks
   */
  private readonly taskList: TaskRunner[];

  /** A list of all running and finished tasks  */
  private pendingTaskList: Array<Promise<void>>;

  /** Flag to indicate that the group runner is stopping */
  private isStopping: boolean = false;

  public constructor(options: GroupOptions, workerPool: WorkerPool) {
    this.options = options;

    this.taskList = this.createTasks(workerPool);

    this.pendingTaskList = [];
  }

  /**
   * Creates the task group
   *
   * @param options
   */
  public static create(
    options: GroupOptions,
    workerPool: WorkerPool,
  ): GroupRunner {
    return new GroupRunner(options, workerPool);
  }

  /**
   * Attach a task event listener
   */
  public setRunnerEventListener(listener: GroupRunnerEventListener): void {
    this.groupEventListener = listener;
  }

  /**
   *  Remove the attached task event listener
   */
  public removeRunnerEventListener(): void {
    this.groupEventListener = null;
  }

  /*
   * Run group tasks either in synchronized order or in parallel.
   */
  public async run(changedPaths: ChangedPaths): Promise<void> {
    const pendingRunCallList: Array<Promise<void>> = [];
    let transformedPaths: ChangedPaths = changedPaths;

    for (const task of this.taskList) {
      if (this.isStopping) {
        break;
      }

      const pendingTask = new Promise<void>((resolve) => {
        task.setRunnerEventListener((event: TaskEvent): void => {
          switch (event.eventType) {
            case TaskEventType.error:
              this.stop();
              this.groupEventListener?.(event);
              break;

            case TaskEventType.result:
              if ((event.result?.errors?.length ?? 0) > 0) {
                this.stop();
              }

              if (
                this.options.parallel === false &&
                event.result?.changedPaths !== undefined
              ) {
                transformedPaths = event.result.changedPaths;
              }

              this.groupEventListener?.({
                eventType: GroupEventType.result,
                result: event.result,
              });

              break;

            case TaskEventType.stop:
              this.groupEventListener?.({
                eventType: GroupEventType.stop,
                // TODO: Add task name
              });
              break;

            case TaskEventType.skipped:
              this.groupEventListener?.({
                eventType: GroupEventType.skipped,
                // TODO: Add task name
              });
              break;

            case TaskEventType.update:
              // TODO: Handle updates.
              return;
          }

          resolve();
        });
      });
      this.pendingTaskList.push(pendingTask);
      pendingTask.finally(() => task.removeRunnerEventListener());

      const pendingRunCall = task.run(transformedPaths);
      pendingRunCallList.push(pendingRunCall);

      if (this.options.parallel !== true) {
        await pendingRunCall;
        await pendingTask;
      }
    }

    if (this.options.parallel === true) {
      await Promise.all([...this.pendingTaskList, ...pendingRunCallList]);
    }

    this.groupEventListener?.({
      eventType: this.isStopping ? TaskEventType.stop : TaskEventType.result,
    });

    this.pendingTaskList = [];
    this.isStopping = false;
  }

  public stop(): void {
    if (this.pendingTaskList.length > 0) {
      this.isStopping = true;
      this.taskList.forEach((taskRunner) => {
        taskRunner.stop();
      });
    }
  }

  private createTasks(workerPool: WorkerPool): TaskRunner[] {
    return this.options.tasks.map<TaskRunner>(
      (taskOptions) => new TaskRunner(taskOptions, workerPool),
    );
  }
}
