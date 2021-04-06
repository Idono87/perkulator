import { expect, use } from 'chai';
import { createSandbox, SinonSpy } from 'sinon';
import sinonChai from 'sinon-chai';
import TaskManager from '../../../task/task-manager';

import FileWatcher from '../../../file-watcher/file-watcher';
import Perkulator, { PerkulatorOptions } from '../../../perkulator';
import {
  awaitResult,
  deleteAllFakeFiles,
  generateFakeFiles,
} from '../../utils';

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
                module: require.resolve('../fixtures/task'),
              },
              {
                module: require.resolve('../fixtures/task'),
                options: {
                  result: { errors: ['TestError'] },
                },
              },
              {
                module: require.resolve('../fixtures/task'),
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
