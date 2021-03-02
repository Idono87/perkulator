import { expect, use } from 'chai';
import { createSandbox, SinonSpy } from 'sinon';
import sinonChai from 'sinon-chai';
import TaskManager from '../../task/task-manager';

import FileWatcher from '../../file-watcher/file-watcher';
import Perkulator, { PerkulatorOptions } from '../../perkulator';
import {
  awaitResult,
  deleteAllFakeFiles,
  deleteFakeFile,
  generateFakeFiles,
} from '../utils';

use(sinonChai);
const Sinon = createSandbox();

describe('Grouped tasks', function () {
  let perkulator: Perkulator;

  afterEach(async function () {
    await perkulator.close();
    deleteAllFakeFiles();
    Sinon.restore();
  });

  describe('Sequential task execution', function () {
    it('Expect list of changed paths to be cleared on a successful run', async function () {
      const fileWatcherClearSpy: SinonSpy = Sinon.spy(
        FileWatcher.prototype,
        'clear',
      );

      const filePaths = generateFakeFiles();
      const options: PerkulatorOptions = {
        watcher: {
          include: [...filePaths],
        },
        tasks: [
          {
            tasks: [
              {
                module: require.resolve('./fixtures/task'),
              },
              {
                module: require.resolve('./fixtures/task'),
              },
              {
                module: require.resolve('./fixtures/task'),
              },
            ],
          },
        ],
      };

      perkulator = Perkulator.watch(options);

      await awaitResult(() => {
        expect(fileWatcherClearSpy).to.be.calledOnce;
      });
    });

    it('Expect a change to stop an active run', async function () {
      const fileWatcherClearSpy: SinonSpy = Sinon.spy(
        FileWatcher.prototype,
        'clear',
      );
      const taskManagerRunSpy: SinonSpy = Sinon.spy(
        TaskManager.prototype,
        'run',
      );

      const filePaths = generateFakeFiles();
      const options: PerkulatorOptions = {
        watcher: {
          include: [...filePaths],
        },
        tasks: [
          {
            tasks: [
              {
                module: require.resolve('./fixtures/task'),
                options: {
                  timeout: 500,
                },
              },
              {
                module: require.resolve('./fixtures/task'),
              },
              {
                module: require.resolve('./fixtures/task'),
              },
            ],
          },
        ],
      };

      perkulator = Perkulator.watch(options);

      setTimeout(() => deleteFakeFile(filePaths[0]), 10);

      await awaitResult(() => {
        expect(taskManagerRunSpy).to.be.calledTwice;
        expect(fileWatcherClearSpy).to.be.calledOnce;
      });
    });

    it('Expect a failed result to stop the run', async function () {
      const fileWatcherClearSpy: SinonSpy = Sinon.spy(
        FileWatcher.prototype,
        'clear',
      );
      const taskManagerRunSpy: SinonSpy = Sinon.spy(
        TaskManager.prototype,
        'run',
      );

      const filePaths = generateFakeFiles();
      const options: PerkulatorOptions = {
        watcher: {
          include: [...filePaths],
        },
        tasks: [
          {
            tasks: [
              {
                module: require.resolve('./fixtures/task'),
              },
              {
                module: require.resolve('./fixtures/task'),
                options: {
                  result: { errors: ['TestError'] },
                },
              },
              {
                module: require.resolve('./fixtures/task'),
              },
            ],
          },
        ],
      };

      perkulator = Perkulator.watch(options);

      await awaitResult(() => {
        expect(taskManagerRunSpy).to.be.calledOnce;
        expect(fileWatcherClearSpy).to.not.be.called;
      });
    });

    it('Expect a thrown error to stop the run', async function () {
      const fileWatcherClearSpy: SinonSpy = Sinon.spy(
        FileWatcher.prototype,
        'clear',
      );
      const taskManagerRunSpy: SinonSpy = Sinon.spy(
        TaskManager.prototype,
        'run',
      );

      const filePaths = generateFakeFiles();
      const options: PerkulatorOptions = {
        watcher: {
          include: [...filePaths],
        },
        tasks: [
          {
            tasks: [
              {
                module: require.resolve('./fixtures/task'),
              },
              {
                module: require.resolve('./fixtures/task'),
                options: {
                  throw: true,
                },
              },
              {
                module: require.resolve('./fixtures/task'),
              },
            ],
          },
        ],
      };

      perkulator = Perkulator.watch(options);

      await awaitResult(() => {
        expect(taskManagerRunSpy).to.be.calledOnce;
        expect(fileWatcherClearSpy).to.not.be.called;
      });
    });

    it('Expect tasks to not be run when files are excluded', async function () {
      const fileWatcherClearSpy: SinonSpy = Sinon.spy(
        FileWatcher.prototype,
        'clear',
      );
      const taskManagerRunSpy: SinonSpy = Sinon.spy(
        TaskManager.prototype,
        'run',
      );

      const filePaths = generateFakeFiles();
      const options: PerkulatorOptions = {
        watcher: {
          exclude: [...filePaths],
        },
        tasks: [
          {
            tasks: [
              {
                module: require.resolve('./fixtures/task'),
              },
              {
                module: require.resolve('./fixtures/task'),
              },
              {
                module: require.resolve('./fixtures/task'),
              },
            ],
          },
        ],
      };

      perkulator = Perkulator.watch(options);

      await awaitResult(() => {
        expect(taskManagerRunSpy).to.not.be.calledOnce;
      });
    });
  });

  describe('Parallel task execution', function () {
    it('Expect list of changed paths to be cleared on a successful run', async function () {
      const fileWatcherClearSpy: SinonSpy = Sinon.spy(
        FileWatcher.prototype,
        'clear',
      );

      const filePaths = generateFakeFiles();
      const options: PerkulatorOptions = {
        workerPool: {
          poolSize: 3,
        },
        watcher: {
          include: [...filePaths],
        },
        tasks: [
          {
            parallel: true,
            tasks: [
              {
                module: require.resolve('./fixtures/task'),
              },
              {
                module: require.resolve('./fixtures/task'),
              },
              {
                module: require.resolve('./fixtures/task'),
              },
            ],
          },
        ],
      };

      perkulator = Perkulator.watch(options);

      await awaitResult(() => {
        expect(fileWatcherClearSpy).to.be.calledOnce;
      });
    });

    it('Expect a change to stop an active run', async function () {
      const fileWatcherClearSpy: SinonSpy = Sinon.spy(
        FileWatcher.prototype,
        'clear',
      );
      const taskManagerRunSpy: SinonSpy = Sinon.spy(
        TaskManager.prototype,
        'run',
      );

      const filePaths = generateFakeFiles();
      const options: PerkulatorOptions = {
        workerPool: {
          poolSize: 3,
        },
        watcher: {
          include: [...filePaths],
        },
        tasks: [
          {
            parallel: true,
            tasks: [
              {
                module: require.resolve('./fixtures/task'),
                options: {
                  timeout: 500,
                },
              },
              {
                module: require.resolve('./fixtures/task'),
              },
              {
                module: require.resolve('./fixtures/task'),
              },
            ],
          },
        ],
      };

      perkulator = Perkulator.watch(options);

      setTimeout(() => deleteFakeFile(filePaths[0]), 10);

      await awaitResult(() => {
        expect(taskManagerRunSpy).to.be.calledTwice;
        expect(fileWatcherClearSpy).to.be.calledOnce;
      });
    });

    it('Expect a failed result to stop the run', async function () {
      const fileWatcherClearSpy: SinonSpy = Sinon.spy(
        FileWatcher.prototype,
        'clear',
      );
      const taskManagerRunSpy: SinonSpy = Sinon.spy(
        TaskManager.prototype,
        'run',
      );

      const filePaths = generateFakeFiles();
      const options: PerkulatorOptions = {
        workerPool: {
          poolSize: 3,
        },
        watcher: {
          include: [...filePaths],
        },
        tasks: [
          {
            parallel: true,
            tasks: [
              {
                module: require.resolve('./fixtures/task'),
              },
              {
                module: require.resolve('./fixtures/task'),
                options: {
                  result: { errors: ['TestError'] },
                },
              },
              {
                module: require.resolve('./fixtures/task'),
              },
            ],
          },
        ],
      };

      perkulator = Perkulator.watch(options);

      await awaitResult(() => {
        expect(taskManagerRunSpy).to.be.calledOnce;
        expect(fileWatcherClearSpy).to.not.be.called;
      });
    });

    it('Expect a thrown error to stop the run', async function () {
      const fileWatcherClearSpy: SinonSpy = Sinon.spy(
        FileWatcher.prototype,
        'clear',
      );
      const taskManagerRunSpy: SinonSpy = Sinon.spy(
        TaskManager.prototype,
        'run',
      );

      const filePaths = generateFakeFiles();
      const options: PerkulatorOptions = {
        workerPool: {
          poolSize: 3,
        },
        watcher: {
          include: [...filePaths],
        },
        tasks: [
          {
            parallel: true,
            tasks: [
              {
                module: require.resolve('./fixtures/task'),
              },
              {
                module: require.resolve('./fixtures/task'),
                options: {
                  throw: true,
                },
              },
              {
                module: require.resolve('./fixtures/task'),
              },
            ],
          },
        ],
      };

      perkulator = Perkulator.watch(options);

      await awaitResult(() => {
        expect(taskManagerRunSpy).to.be.calledOnce;
        expect(fileWatcherClearSpy).to.not.be.called;
      });
    });
  });
});
