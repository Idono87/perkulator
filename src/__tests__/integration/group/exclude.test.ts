import { expect, use } from 'chai';
import { createSandbox, SinonSpy } from 'sinon';
import sinonChai from 'sinon-chai';
import TaskManager from '../../../task/task-manager';

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
    it('Expect tasks to not be run when files are excluded', async function () {
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
        expect(taskManagerRunSpy).to.not.be.calledOnce;
      });
    });
  });
});
