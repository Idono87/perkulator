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

export interface TaskGroupOptions {
  tasks: TaskOptions[];
}

export type GroupEvent =
  | {
      eventType: TaskGroupEventType.result;
      result?: TaskResultsObject;
    }
  | { eventType: TaskGroupEventType.skipped }
  | { eventType: TaskGroupEventType.stop; taskName?: string };

export const enum TaskGroupEventType {
  result = 'group_result',
  skipped = 'group_skipped',
  stop = 'group_stop',
}

/**
 * Groups tasks as a cohesive unit.
 *
 * @internal
 */
export default class TaskGroup
  implements TaskRunnableInterface, TaskEventInterface<TGroupTaskEvent> {
  /**
   * Task group options
   */
  private readonly options: TaskGroupOptions;

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

  public constructor(options: TaskGroupOptions) {
    this.options = options;

    this.taskList = this.createTasks();

    this.pendingTaskList = [];
  }

  /**
   * Creates the task group
   *
   * @param options
   */
  public static create(options: TaskGroupOptions): TaskGroup {
    return new TaskGroup(options);
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
                eventType: TaskGroupEventType.result,
                result: event.result,
              });

              break;

            case TaskEventType.stop:
              this.taskEventListener?.({
                eventType: TaskGroupEventType.stop,
                // TODO: Add task name
              });
              break;

            case TaskEventType.skipped:
              this.taskEventListener?.({
                eventType: TaskGroupEventType.skipped,
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
