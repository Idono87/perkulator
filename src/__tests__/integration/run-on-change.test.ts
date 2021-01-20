import { expect } from 'chai';
import { SinonStub, createSandbox, SinonSpy } from 'sinon';

import Perkulator from '~/perkulator';
import FileWatcher from '~/file-watcher';
import {
  awaitResult,
  createFakePromise,
  generateFakeFiles,
  deleteAllFakeFiles,
  resolveFakePromises,
  createPerkulatorOptions,
  getTempPath,
  wait,
} from '~/test-utils';
import type { PerkulatorOptions, ChangedPaths } from '~/types';

const Sinon = createSandbox();
export let run: SinonStub;
export let stop: SinonStub;

let fileWatchClearSpy: SinonSpy;

const options: PerkulatorOptions = createPerkulatorOptions();
options.watcher = { include: [getTempPath()] };
options.tasks = [];
options.tasks.push({
  module: __filename,
});

let perkulator: Perkulator;

describe('Perkulator file change integration test', function () {
  beforeEach(function () {
    run = Sinon.stub();
    stop = Sinon.stub();
    fileWatchClearSpy = Sinon.spy(FileWatcher.prototype, 'clear');
  });

  afterEach(async function () {
    await perkulator.close();
    Sinon.restore();
    resolveFakePromises();
    deleteAllFakeFiles();
  });

  it('Expect tasks to finish and clear the change list', function () {
    const paths = generateFakeFiles();
    const expectedChangedPaths: ChangedPaths = {
      add: paths,
      change: [],
      remove: [],
    };

    run.resolves();
    perkulator = Perkulator.watch(options);

    return expect(
      awaitResult(() => {
        expect(run).to.be.calledOnce;

        const args = run.firstCall.args[0];
        expect(args).to.have.keys(['add', 'change', 'remove']);
        expect(args.add).to.have.members(expectedChangedPaths.add);
        expect(args.change).to.have.members(expectedChangedPaths.change);
        expect(args.remove).to.have.members(expectedChangedPaths.remove);

        expect(fileWatchClearSpy).to.be.calledOnce;
      }),
    ).to.eventually.be.fulfilled;
  });

  it('Expect a running task to be terminated when a file watcher event occurs', async function () {
    const expectedChangedPaths: ChangedPaths = {
      add: [],
      change: [],
      remove: [],
    };

    const pendingRun = createFakePromise();
    run.onCall(0).resolves(pendingRun);
    run.resolves();
    stop.callsFake(() => pendingRun.resolve(undefined));
    perkulator = Perkulator.watch(options);

    await wait(200);

    expectedChangedPaths.add = generateFakeFiles(10).slice(5);

    await wait(200);

    expectedChangedPaths.change = generateFakeFiles(5);

    await wait(200);

    await expect(
      awaitResult(() => {
        expect(run).to.be.calledTwice;
        expect(stop).to.be.calledOnce;

        const args = run.secondCall.args[0];
        expect(args).to.have.keys(['add', 'change', 'remove']);
        expect(args.add).to.have.members(expectedChangedPaths.add);
        expect(args.change).to.have.members(expectedChangedPaths.change);
        expect(args.remove).to.have.members(expectedChangedPaths.remove);

        expect(fileWatchClearSpy).to.be.calledOnce;
      }),
    ).to.eventually.be.fulfilled;
  });

  it('Expect failed task to not clear the changed path list.', async function () {
    const expectedChangedPaths: ChangedPaths = {
      add: [],
      change: [],
      remove: [],
    };

    expectedChangedPaths.add = generateFakeFiles();

    run.rejects(new Error('Should Fail'));
    Perkulator.watch(options);

    await wait(200);

    return await expect(
      awaitResult(() => {
        expect(fileWatchClearSpy).to.not.be.called;
      }),
    ).to.eventually.be.fulfilled;
  });
});
