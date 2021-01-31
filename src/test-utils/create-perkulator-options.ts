import { PerkulatorOptions } from '~/types';

export function createPerkulatorOptions(taskCount = 10): PerkulatorOptions {
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

  return options;
}
