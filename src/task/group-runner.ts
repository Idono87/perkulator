import TaskRunner from './task-runner';
import { TaskEventType } from '~/task/task-runner';

import type { ChangedPaths } from '~/file-watcher/file-watcher';
import type { TaskOptions, TaskEvent } from '~/task/task-runner';
import type { TaskResultsObject } from './task-proxy';
import type {
  TaskRunnableInterface,
  TaskEventListener,
  TaskEventInterface,
} from '~/task/task-manager';

type TGroupTaskEvent = TaskEvent | GroupEvent;
type TGroupRunnerEventListener = TaskEventListener<TGroupTaskEvent>;

export interface GroupOptions {
  tasks: TaskOptions[];
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
  implements TaskRunnableInterface, TaskEventInterface<TGroupTaskEvent> {
  /**
   * Task group options
   */
  private readonly options: GroupOptions;

  /** Event listener to call for each task event */
  private taskEventListener: TGroupRunnerEventListener | null = null;

  /**
   * A list of registered tasks
   */
  private readonly taskList: TaskRunner[];

  /** A list of all running and finished tasks  */
  private pendingTaskList: Array<Promise<void>>;

  /** Flag to indicate that the group runner is stopping */
  private isStopping: boolean = false;

  public constructor(options: GroupOptions) {
    this.options = options;

    this.taskList = this.createTasks();

    this.pendingTaskList = [];
  }

  /**
   * Creates the task group
   *
   * @param options
   */
  public static create(options: GroupOptions): GroupRunner {
    return new GroupRunner(options);
  }

  /**
   * Attach a task event listener
   */
  public setTaskEventListener(listener: TGroupRunnerEventListener): void {
    this.taskEventListener = listener;
  }

  /**
   *  Remove the attached task event listener
   */
  public removeTaskEventListener(): void {
    this.taskEventListener = null;
  }

  /**
   * Run the task group
   *
   * @param changedPaths
   */
  public async run(changedPaths: ChangedPaths): Promise<void> {
    for (const task of this.taskList) {
      if (this.isStopping) {
        break;
      }

      const pendingTask = new Promise<void>((resolve) => {
        task.setTaskEventListener((event: TaskEvent): void => {
          switch (event.eventType) {
            case TaskEventType.error:
              this.stop();
              this.taskEventListener?.(event);
              break;

            case TaskEventType.result:
              if ((event.result?.errors?.length ?? 0) > 0) {
                this.stop();
              }

              this.taskEventListener?.({
                eventType: GroupEventType.result,
                result: event.result,
              });

              break;

            case TaskEventType.stop:
              this.taskEventListener?.({
                eventType: GroupEventType.stop,
                // TODO: Add task name
              });
              break;

            case TaskEventType.skipped:
              this.taskEventListener?.({
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
      await task.run(changedPaths);
      await pendingTask;
      task.removeTaskEventListener();
    }

    this.taskEventListener?.({
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

  private createTasks(): TaskRunner[] {
    return this.options.tasks.map<TaskRunner>((taskOptions) =>
      TaskRunner.create(taskOptions),
    );
  }
}
