import { PerkulatorOptions } from '~/types';

export function createPerkulatorOptions(): PerkulatorOptions {
  const options: PerkulatorOptions = { paths: [], tasks: [] };

  for (let i = 1; i <= 10; i++) {
    options.paths?.push(`/fake/path/${i}`);
    options.tasks.push({
      path: `/fake/path/${i}`,
    });
  }

  return options;
}
