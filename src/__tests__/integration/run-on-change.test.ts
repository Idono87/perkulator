import { expect } from 'chai';
import { SinonStub, createSandbox, SinonSpy } from 'sinon';

import Perkulator from '~/perkulator';
import FileWatcher from '~/file-watcher/file-watcher';
import {
  awaitResult,
  createFakePromise,
  generateFakeFiles,
  deleteAllFakeFiles,
  resolveFakePromises,
  createPerkulatorOptions,
  getTempPath,
} from '~/__tests__/test-utils';

import type { ChangedPaths } from '~/file-watcher/file-watcher';
import type { PerkulatorOptions } from '~/perkulator';

const Sinon = createSandbox();
export let run: SinonStub;
export let stop: SinonStub;

let fileWatchClearSpy: SinonSpy;

const options: PerkulatorOptions = createPerkulatorOptions(0);
options.watcher = { include: [getTempPath()] };
options.tasks = [];
options.tasks.push(
  {
    module: __filename,
    fork: false,
  },
  {
    tasks: [
      {
        module: __filename,
        fork: false,
      },
    ],
  },
);

let perkulator: Perkulator;

function deepEqualChangedPaths(
  changedPaths: ChangedPaths,
  expectedChangedPaths: ChangedPaths,
): void {
  expect(changedPaths).to.have.keys(['add', 'change', 'remove']);
  expect(changedPaths.add).to.have.members(expectedChangedPaths.add);
  expect(changedPaths.change).to.have.members(expectedChangedPaths.change);
  expect(changedPaths.remove).to.have.members(expectedChangedPaths.remove);
}

describe('Perkulator file change integration test', function () {
  before(function () {
    run = Sinon.stub();
    stop = Sinon.stub();
    fileWatchClearSpy = Sinon.spy(FileWatcher.prototype, 'clear');
  });

  afterEach(async function () {
    await perkulator.close();
    resolveFakePromises();
    deleteAllFakeFiles();
    Sinon.resetBehavior();
    Sinon.resetHistory();
  });

  after(function () {
    Sinon.restore();
  });

  it('Expect tasks to finish and clear the change list', async function () {
    const paths = generateFakeFiles();
    const expectedChangedPaths: ChangedPaths = {
      add: paths,
      change: [],
      remove: [],
    };

    run.returns(undefined);
    perkulator = Perkulator.watch(options);

    await awaitResult(() => {
      expect(run).to.be.calledTwice;

      const args = run.firstCall.args[0];
      deepEqualChangedPaths(args, expectedChangedPaths);

      expect(fileWatchClearSpy).to.be.calledOnce;
    });
  });

  it('Expect a running task to be terminated when a file watcher event occurs', async function () {
    const expectedChangedPaths: ChangedPaths = {
      add: [],
      change: [],
      remove: [],
    };

    const fakePromise = createFakePromise<undefined>();
    run.onCall(0).resolves(fakePromise);
    run.resolves();

    stop.callsFake(() => {
      fakePromise.resolve(undefined);
    });

    perkulator = Perkulator.watch(options);

    setTimeout(() => {
      expectedChangedPaths.add = generateFakeFiles(10).slice(5);
    }, 150);

    setTimeout(() => {
      expectedChangedPaths.change = generateFakeFiles(5);
    }, 300);

    await awaitResult(() => {
      expect(run).to.be.calledThrice;
      expect(stop).to.be.calledOnce;

      const args = run.secondCall.args[0];
      deepEqualChangedPaths(args, expectedChangedPaths);

      expect(fileWatchClearSpy).to.be.calledOnce;
    });
  });

  it('Expect failed task to not clear the changed path list.', async function () {
    const expectedChangedPaths: ChangedPaths = {
      add: [],
      change: [],
      remove: [],
    };

    expectedChangedPaths.add = generateFakeFiles();

    run.resolves({ errors: ['This is an error'] });

    Perkulator.watch(options);

    await awaitResult(() => {
      expect(fileWatchClearSpy).to.not.be.called;
    });
  });
});
