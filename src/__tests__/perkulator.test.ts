import { expect, use } from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromise from 'chai-as-promised';
import { createSandbox, SinonSpy, SinonStubbedInstance } from 'sinon';

import FileWatcher from '~/file-watcher';
import TaskManager from '~/task/task-manager';
import Perkulator from '~/perkulator';
import { TaskResultCode } from '~/task/enum-task-result-code';
import { createPerkulatorOptions } from './utils';

import type { ChangedPaths, PerkulatorOptions } from '~/types';

use(sinonChai);
use(chaiAsPromise);

const Sinon = createSandbox();

let fileWatcherWatchStub: SinonSpy;
let FileWatcherStub: SinonStubbedInstance<FileWatcher>;
let TaskManagerStub: SinonStubbedInstance<TaskManager>;

const options: PerkulatorOptions = createPerkulatorOptions();

describe('Perkulator', function () {
  beforeEach(function () {
    FileWatcherStub = Sinon.createStubInstance(FileWatcher);

    TaskManagerStub = Sinon.createStubInstance(TaskManager);

    fileWatcherWatchStub = Sinon.stub(FileWatcher, 'watch').returns(
      FileWatcherStub as any,
    );
    Sinon.stub(TaskManager, 'create').returns(TaskManagerStub as any);
  });

  afterEach(function () {
    Sinon.restore();
  });

  it('Expect a new run to get a list of changed paths', async function () {
    const changedPaths: ChangedPaths = {
      add: ['/fake/path'],
      change: [],
      remove: [],
    };

    Perkulator.watch(options);
    const onChangeEvent = fileWatcherWatchStub.firstCall.firstArg.onChange;
    await onChangeEvent(changedPaths);

    expect(TaskManagerStub.run).to.be.calledOnceWith(changedPaths);
  });

  it('Expect a finished run to clear the list of changed paths', async function () {
    const changedPaths: ChangedPaths = {
      add: ['/fake/path'],
      change: [],
      remove: [],
    };

    Perkulator.watch(options);

    TaskManagerStub.run.resolves(TaskResultCode.Finished);

    const onChangeEvent = fileWatcherWatchStub.firstCall.firstArg.onChange;
    await onChangeEvent(changedPaths);

    expect(FileWatcherStub.clear).to.be.calledOnce;
  });

  it('Expect a finished without clearing the list of change paths', async function () {
    const changedPaths: ChangedPaths = {
      add: ['/fake/path'],
      change: [],
      remove: [],
    };

    Perkulator.watch(options);

    TaskManagerStub.run.resolves(TaskResultCode.Terminated);

    const onChangeEvent = fileWatcherWatchStub.firstCall.firstArg.onChange;
    await onChangeEvent(changedPaths);

    expect(FileWatcherStub.clear).to.not.be.called;
  });
});
