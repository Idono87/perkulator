import { TaskGroupOptions } from '~/task/task-group';
import { PerkulatorOptions } from '~/perkulator';
import type { TaskOptions } from '~/task/task-runner';

export function createPerkulatorOptions(
  taskCount = 10,
  groupCount = 0,
  groupTaskCount = 0,
): PerkulatorOptions {
  const options: PerkulatorOptions = {
    watcher: {
      include: [],
      exclude: [],
    },
    tasks: [],
  };

  for (let i = 1; i <= taskCount; i++) {
    const modulePath = `/fake/path/${i}`;

    options.watcher!.include!.push(modulePath);
    options.watcher!.exclude!.push(`/fake/exclude/path/${i}`);
    options.tasks.push(createTaskOptions(modulePath, true));
  }

  for (let i = 1; i <= groupCount; i++) {
    const modulePath = `/fake/path/group${i}`;

    options.watcher!.include!.push(modulePath);
    options.watcher!.exclude!.push(`/fake/exclude/path/group${i}`);

    options.tasks.push(createTaskGroupOptions(groupTaskCount, modulePath));
  }

  return options;
}

export function createTaskOptions(
  module = `/fake/path`,
  fork = true,
  persistent?: boolean,
): TaskOptions {
  const taskOptions: any = {
    module,
    fork,
  };

  persistent !== undefined && (taskOptions.persistent = persistent);

  return taskOptions;
}

export function createTaskOptionsList(count = 10): TaskOptions[] {
  const taskOptions: TaskOptions[] = [];
  for (let i = 0; i < 10; i++) {
    taskOptions.push(createTaskOptions());
  }

  return taskOptions;
}

export function createTaskGroupOptions(
  taskCount = 10,
  modulePath = `/fake/path/group`,
): TaskGroupOptions {
  const taskOptions: TaskOptions[] = [];

  for (let i = 0; i < taskCount; i++) {
    taskOptions.push(createTaskOptions(`${modulePath}/task${i}`));
  }

  return { tasks: taskOptions };
}
