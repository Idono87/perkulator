import TaskRunner from './task-runner';
import { TaskEventType, TaskGroupEventType } from './enum-task-event-type';

import type {
  ChangedPaths,
  TaskEvent,
  TaskEventInterface,
  TaskEventListener,
  TaskGroupEvent,
  TaskGroupOptions,
  TaskRunnableInterface,
} from '~/types';

/**
 * Groups tasks as a cohesive unit.
 *
 * @internal
 */
export default class TaskGroup
  implements
    TaskRunnableInterface,
    TaskEventInterface<TaskEvent | TaskGroupEvent> {
  /**
   * Task group options
   */
  private readonly options: TaskGroupOptions;

  /** Event listener to call for each task event */
  private taskEventListener: TaskEventListener<
    TaskEvent | TaskGroupEvent
  > | null = null;

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
  public setTaskEventListener(
    listener: TaskEventListener<TaskEvent | TaskGroupEvent>,
  ): void {
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
  public async run(changedPaths: ChangedPaths): void {
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
              resolve();
              break;

            case TaskEventType.result:
              if ((event.result?.errors?.length ?? 0) > 0) {
                this.stop();
              }

              this.taskEventListener?.({
                eventType: TaskGroupEventType.result,
                result: event.result,
              });

              resolve();
              break;

            case TaskEventType.stop:
              this.taskEventListener?.({
                eventType: TaskGroupEventType.stop,
                // TODO: Add task name
              });
              resolve();
              break;

            case TaskEventType.skipped:
              this.taskEventListener?.({
                eventType: TaskGroupEventType.skipped,
                // TODO: Add task name
              });
              resolve();
              break;

            case TaskEventType.update:
              // TODO: Handle updates.
              break;
          }
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
      this.taskList.forEach((task) => {
        task.stop();
      });
    }
  }

  private createTasks(): TaskRunner[] {
    return this.options.tasks.map<TaskRunner>((taskOptions) =>
      TaskRunner.create(taskOptions),
    );
  }
}
