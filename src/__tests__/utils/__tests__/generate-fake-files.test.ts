import { expect } from 'chai';
import fs from 'fs';

import {
  generateFakeFiles,
  deleteFakeFile,
  deleteAllFakeFiles,
  getAllGeneratedPaths,
  getTempPath,
} from '../generate-fake-files';

const tempDir = getTempPath();

describe('Generate files utility function', function () {
  afterEach(function () {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  });

  it('Expect to generate 5 files', function () {
    const paths = generateFakeFiles(5);

    for (const path of paths) {
      expect(fs.existsSync(path)).to.be.true;
    }
  });

  it('Expect to remove file', function () {
    const paths = generateFakeFiles();
    const removedPath = paths.pop();

    deleteFakeFile(removedPath!);
    expect(fs.existsSync(removedPath!)).to.be.false;

    for (const path of paths) {
      expect(fs.existsSync(path)).to.be.true;
    }
  });

  it('Expect to remove temp folder and files', function () {
    generateFakeFiles();
    deleteAllFakeFiles();

    expect(fs.existsSync(tempDir)).to.be.false;
    expect(getAllGeneratedPaths()).to.deep.equal([]);
  });

  it('Expect to get all generated paths', function () {
    const paths = generateFakeFiles();

    expect(getAllGeneratedPaths()).to.deep.equal(paths);
  });
});
