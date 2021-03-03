import type { ChangedPaths } from '../../file-watcher/file-watcher';

export const TEST_PATH = '/test/path/';

export function createChangedPaths(transformed = false): ChangedPaths {
  return {
    add: createPaths(transformed),
    change: createPaths(transformed),
    remove: createPaths(transformed),
  };
}

function createPaths(transformed: boolean): string[] {
  const paths: string[] = [];
  const size = Math.round(Math.random() * 20);
  for (let i = 1; i <= size; i++) {
    paths.push(`${TEST_PATH}/${i}.${transformed ? 'js' : 'ts'}`);
  }

  return paths;
}
