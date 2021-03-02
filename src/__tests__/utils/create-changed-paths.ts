import type { ChangedPaths } from '../../file-watcher/file-watcher';

export const TEST_PATH = '/test/path/';

export function createChangedPaths(): ChangedPaths {
  return {
    add: createPaths(),
    change: createPaths(),
    remove: createPaths(),
  };
}

function createPaths(): string[] {
  const paths: string[] = [];
  const size = Math.round(Math.random() * 20);
  for (let i = 1; i <= size; i++) {
    paths.push(`${TEST_PATH}/${i}.test`);
  }

  return paths;
}
