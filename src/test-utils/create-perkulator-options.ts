import { PerkulatorOptions, TaskGroupOptions } from '~/types';

export function createPerkulatorOptions(
  taskCount = 10,
  taskGroupCount = 0,
  taskGroupTaskCount = 0,
): PerkulatorOptions {
  const options: PerkulatorOptions = {
    watcher: {
      include: [],
      exclude: [],
    },
    tasks: [],
  };

  for (let i = 1; i <= taskCount; i++) {
    options.watcher!.include!.push(`/fake/path/${i}`);
    options.watcher!.exclude!.push(`/fake/exclude/path/${i}`);
    options.tasks.push({
      module: `/fake/path/${i}`,
      fork: true,
    });
  }

  for (let i = 1; i <= taskGroupCount; i++) {
    const groupTask: TaskGroupOptions = {
      tasks: [],
    };

    for (let j = 1; j <= taskGroupTaskCount; j++) {
      options.watcher!.include!.push(`/fake/path/group${i}/${j}`);
      options.watcher!.exclude!.push(`/fake/exclude/path/group${i}/${j}`);
      groupTask.tasks.push({
        module: `/fake/path/group${i}/${j}`,
        fork: true,
      });
    }

    options.tasks.push(groupTask);
  }

  return options;
}
