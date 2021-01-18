import { PerkulatorOptions } from '~/types';

export function createPerkulatorOptions(): PerkulatorOptions {
  const options: PerkulatorOptions = {
    watcher: {
      include: [],
    },
    tasks: [],
  };

  for (let i = 1; i <= 10; i++) {
    options.watcher!.include!.push(`/fake/path/${i}`);
    options.tasks.push({
      path: `/fake/path/${i}`,
    });
  }

  return options;
}
