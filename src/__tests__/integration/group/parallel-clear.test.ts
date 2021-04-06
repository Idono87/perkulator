import { expect, use } from 'chai';
import { createSandbox, SinonSpy } from 'sinon';
import sinonChai from 'sinon-chai';

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
                module: require.resolve('../fixtures/task'),
              },
              {
                module: require.resolve('../fixtures/task'),
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
        expect(fileWatcherClearSpy).to.be.calledOnce;
      });
    });
  });
});
