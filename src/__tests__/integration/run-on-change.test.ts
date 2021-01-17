import { expect } from 'chai';
import { FSWatcher } from 'chokidar';
import { SinonStub, createSandbox, SinonFakeTimers, SinonSpy } from 'sinon';

import Perkulator from '~/perkulator';
import FileWatcher from '~/file-watcher';
import {
  awaitResult,
  createFakePromise,
  replaceFSWatcherWithFake,
  restoreFSWatcher,
  resolveFakePromises,
} from '~/__tests__/utils';
import type { PerkulatorOptions, ChangedPaths } from '~/types';

const Sinon = createSandbox();
export let run: SinonStub;
export let stop: SinonStub;

let fileWatcherFake: FSWatcher;
let fakeTimer: SinonFakeTimers;
let fileWatchClearSpy: SinonSpy;

const options: PerkulatorOptions = {
  paths: ['./'],
  tasks: [
    {
      path: __filename,
    },
  ],
};

describe('Perkulator file change integration test', function () {
  beforeEach(function () {
    fileWatcherFake = replaceFSWatcherWithFake();

    run = Sinon.stub();
    stop = Sinon.stub();
    fakeTimer = Sinon.useFakeTimers();
    fileWatchClearSpy = Sinon.spy(FileWatcher.prototype, 'clear');
  });

  afterEach(function () {
    restoreFSWatcher();
    Sinon.restore();
    resolveFakePromises();
  });

  it('Expect tasks to finish and clear the change list', function () {
    const path = './test/path';
    const expectedChangedPaths: ChangedPaths = {
      add: [path],
      change: [],
      remove: [],
    };

    run.resolves();
    Perkulator.watch(options);
    fileWatcherFake.emit('add', path);

    void fakeTimer.runAllAsync();

    return expect(
      awaitResult(() => {
        expect(run).to.be.calledOnceWith(expectedChangedPaths);
        expect(fileWatchClearSpy).to.be.calledOnce;
      }),
    ).to.eventually.be.fulfilled;
  });

  it('Expect a running task to be terminated when a file watcher event occurs', async function () {
    const path1 = './test/path/1';
    const path2 = './test/path/2';
    const expectedChangedPaths: ChangedPaths = {
      add: [path1, path2],
      change: [],
      remove: [],
    };

    const pendingRun = createFakePromise();
    run.onCall(0).resolves(pendingRun);
    run.resolves();
    stop.callsFake(() => pendingRun.resolve(undefined));

    Perkulator.watch(options);
    fileWatcherFake.emit('add', path1);
    await fakeTimer.runAllAsync();

    fileWatcherFake.emit('add', path2);
    void fakeTimer.runAllAsync();

    await expect(
      awaitResult(() => {
        expect(run).calledWith(expectedChangedPaths);
        expect(fileWatchClearSpy).to.be.calledOnce;
      }),
    ).to.eventually.be.fulfilled;
  });

  it('Expect failed task to not clear the changed path list.', function () {
    const path = './test/path';

    run.rejects(new Error('Should Fail'));
    Perkulator.watch(options);
    fileWatcherFake.emit('add', path);

    void fakeTimer.runAllAsync();

    return expect(
      awaitResult(() => {
        expect(fileWatchClearSpy).to.not.be.called;
      }),
    ).to.eventually.be.fulfilled;
  });
});
