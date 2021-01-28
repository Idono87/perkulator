import { expect, use } from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromise from 'chai-as-promised';
import { createSandbox, SinonStub, SinonStubbedInstance } from 'sinon';

import FileWatcher from '~/file-watcher/file-watcher';
import TaskManager from '~/task/task-manager';
import Perkulator from '~/perkulator';
import {
  awaitResult,
  createChangedPaths,
  createPerkulatorOptions,
} from '../test-utils';

use(sinonChai);
use(chaiAsPromise);

const Sinon = createSandbox();

let fileWatcherCreateStub: SinonStub;
let FileWatcherStub: SinonStubbedInstance<FileWatcher>;
let TaskManagerStub: SinonStubbedInstance<TaskManager>;

describe('Perkulator', function () {
  beforeEach(function () {
    FileWatcherStub = Sinon.createStubInstance(FileWatcher);
    fileWatcherCreateStub = Sinon.stub(FileWatcher, 'watch').returns(
      (FileWatcherStub as unknown) as FileWatcher,
    );
    TaskManagerStub = Sinon.createStubInstance(TaskManager);
    Sinon.stub(TaskManager, 'create').returns(TaskManagerStub as any);
  });

  afterEach(function () {
    Sinon.restore();
  });

  it('Expect task manager to get change paths', async function () {
    const changePaths = createChangedPaths();
    Perkulator.watch(createPerkulatorOptions());
    const fileChangeHandler = fileWatcherCreateStub.firstCall.args[0].onChange;

    fileChangeHandler(changePaths);

    expect(TaskManagerStub.run).calledOnceWith(changePaths);
  });

  it('Expect a successful run to clear the changed paths list', async function () {
    const changePaths = createChangedPaths();
    Perkulator.watch(createPerkulatorOptions());
    const fileChangeHandler = fileWatcherCreateStub.firstCall.args[0].onChange;

    TaskManagerStub.run.resolves(true);

    fileChangeHandler(changePaths);

    await awaitResult(() => {
      expect(FileWatcherStub.clear).to.be.calledOnce;
    });
  });

  it('Expect a failed run to not clear the changed paths list', async function () {
    const changePaths = createChangedPaths();
    Perkulator.watch(createPerkulatorOptions());
    const fileChangeHandler = fileWatcherCreateStub.firstCall.args[0].onChange;

    TaskManagerStub.run.resolves(false);

    fileChangeHandler(changePaths);

    await awaitResult(() => {
      expect(FileWatcherStub.clear).to.not.be.called;
    });
  });

  it('Expect to close to stop the filewatcher and running task', async function () {
    const changePaths = createChangedPaths();
    const perkulator = Perkulator.watch(createPerkulatorOptions());
    const fileChangeHandler = fileWatcherCreateStub.firstCall.args[0].onChange;

    let resolveRun: ((value: boolean) => void) | null = null;
    TaskManagerStub.run.returns(
      new Promise<boolean>((resolve) => {
        resolveRun = resolve;
      }),
    );

    TaskManagerStub.stop.callsFake(() => {
      resolveRun!(false);
    });

    FileWatcherStub.close.resolves();

    fileChangeHandler(changePaths);

    await perkulator.close();

    expect(TaskManagerStub.run).to.be.called;
  });
});
