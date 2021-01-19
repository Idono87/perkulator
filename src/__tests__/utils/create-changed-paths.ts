import type { ChangedPaths } from '~/types';

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
    paths.push(`/test/path/${i}.test`);
  }

  return paths;
}
