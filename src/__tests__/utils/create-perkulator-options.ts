import { GroupOptions } from '../../task/group-runner';
import { PerkulatorOptions } from '../../perkulator';
import type { TaskOptions } from '../../task/task-runner';
import { WatcherOptions } from '../../file-watcher/file-watcher';
import { WorkerPoolOptions } from '../../worker/worker-pool';

export function createPerkulatorOptions(
  taskCount = 10,
  groupCount = 0,
  groupTaskCount = 0,
): PerkulatorOptions {
  const watcher: WatcherOptions = {
    include: [],
    exclude: [],
  };

  const tasks: Array<TaskOptions | GroupOptions> = [];

  const workerPool: WorkerPoolOptions = {
    poolSize: 1,
  };

  for (let i = 1; i <= taskCount; i++) {
    const modulePath = `/fake/path/${i}`;

    watcher.include!.push(modulePath);
    watcher.exclude!.push(`/fake/exclude/path/${i}`);
    tasks.push(createTaskOptions(modulePath));
  }

  for (let i = 1; i <= groupCount; i++) {
    const modulePath = `/fake/path/group${i}`;

    watcher.include!.push(modulePath);
    watcher.exclude!.push(`/fake/exclude/path/group${i}`);

    tasks.push(createGroupOptions({ taskCount: groupTaskCount, modulePath }));
  }

  return { watcher, tasks, workerPool };
}

export function createTaskOptions(
  module = `/fake/path`,
  include?: string[],
  exclude?: string[],
): TaskOptions {
  const taskOptions: any = {
    module,
  };

  include !== undefined && (taskOptions.include = include);
  exclude !== undefined && (taskOptions.exclude = exclude);

  return taskOptions;
}

export function createTaskOptionsList(count = 10): TaskOptions[] {
  const taskOptions: TaskOptions[] = [];
  for (let i = 0; i < 10; i++) {
    taskOptions.push(createTaskOptions());
  }

  return taskOptions;
}

export function createGroupOptions({
  taskCount = 10,
  modulePath = `/fake/path/group`,
  parallel = false,
}): GroupOptions {
  const taskOptions: TaskOptions[] = [];

  for (let i = 0; i < taskCount; i++) {
    taskOptions.push(createTaskOptions(`${modulePath}/task${i}`));
  }

  return { tasks: taskOptions, parallel };
}
