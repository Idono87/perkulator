import fs from 'fs';
import path from 'path';
import process from 'process';

const tempDirPath = path.resolve(process.cwd(), './.temp');
const generatedPathSet = new Set<string>();

/**
 * Generates a number of files.
 *
 * @param count
 * @internal
 */
export function generateFakeFiles(count = 10): string[] {
  const generatedPathList: string[] = [];

  if (!fs.existsSync(tempDirPath)) {
    fs.mkdirSync(tempDirPath);
  }

  for (let i = 1; i <= count; i++) {
    const generatedPath = path.resolve(tempDirPath, `./test-${i}.ts`);
    fs.writeFileSync(generatedPath, 'This is a test file');

    generatedPathList.push(generatedPath);
    generatedPathSet.add(generatedPath);
  }

  return generatedPathList;
}

/**
 * Removes a generated file
 *
 * @param path
 * @internal
 */
export function deleteFakeFile(path: string): void {
  fs.rmSync(path, { force: true });
  generatedPathSet.delete(path);
}

/**
 * Removes all generated files
 */
export function deleteAllFakeFiles(): void {
  fs.rmSync(tempDirPath, { recursive: true, force: true });

  generatedPathSet.clear();
}

/**
 * Returns all existing files
 */
export function getAllGeneratedPaths(): string[] {
  return [...generatedPathSet];
}

/**
 * Returns the temporary directory location
 */
export function getTempPath(): string {
  return tempDirPath;
}
