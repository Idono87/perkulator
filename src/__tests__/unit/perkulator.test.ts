import { expect, use } from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromise from 'chai-as-promised';
import { createSandbox, SinonStub, SinonStubbedInstance } from 'sinon';

import FileWatcher from '~/file-watcher/file-watcher';
import TaskManager from '~/task/task-manager';
import * as workerPool from '~/worker/worker-pool';
import * as validation from '~/config/validation';
import Perkulator from '~/perkulator';
import {
  awaitResult,
  createChangedPaths,
  createFakePromise,
  createPerkulatorOptions,
  resolveFakePromises,
} from '../utils';
import ValidationError from '~/errors/validation-error';

use(sinonChai);
use(chaiAsPromise);

const Sinon = createSandbox();

describe('Perkulator', function () {
  let validateOptionsStub: SinonStub;
  let fileWatcherWatchStub: SinonStub;
  let workerPoolStub: SinonStub;
  let taskManagerStub: SinonStub;
  let fileWatcherStubbedInstance: SinonStubbedInstance<FileWatcher>;
  let taskManagerStubbedInstance: SinonStubbedInstance<TaskManager>;
  let workerPoolStubbedInstance: SinonStubbedInstance<workerPool.default>;

  beforeEach(function () {
    validateOptionsStub = Sinon.stub(validation, 'default');

    workerPoolStubbedInstance = Sinon.createStubInstance(workerPool.default);
    workerPoolStub = Sinon.stub(workerPool, 'default').returns(
      workerPoolStubbedInstance,
    );

    fileWatcherStubbedInstance = Sinon.createStubInstance(FileWatcher);
    fileWatcherWatchStub = Sinon.stub(FileWatcher, 'watch').returns(
      fileWatcherStubbedInstance as any,
    );

    taskManagerStubbedInstance = Sinon.createStubInstance(TaskManager);
    taskManagerStub = Sinon.stub(TaskManager, 'create').returns(
      taskManagerStubbedInstance as any,
    );
  });

  afterEach(function () {
    resolveFakePromises();
    Sinon.restore();
  });

  describe('Perkulator.watch', function () {
    it('Expect to throw a validation error', function () {
      validateOptionsStub.throws(new ValidationError('test', 'test', 'test'));
      expect(() => Perkulator.watch(createPerkulatorOptions())).to.throw(
        ValidationError,
      );
    });

    it('Expect to be initialized an instance', function () {
      const options = createPerkulatorOptions();

      expect(Perkulator.watch(options)).to.be.an.instanceOf(Perkulator);
      expect(fileWatcherWatchStub).to.be.calledWith({
        onChange: Sinon.match.func,
        ...options.watcher,
      });
      expect(workerPoolStub).to.be.calledWith(options.workerPool?.poolSize);
      expect(taskManagerStub).to.be.calledWith(options.tasks);
    });

    it('Expect a file change to run tasks', function () {
      const changedPaths = createChangedPaths();
      Perkulator.watch(createPerkulatorOptions());
      fileWatcherWatchStub.firstCall.args[0].onChange(changedPaths);

      expect(taskManagerStubbedInstance.run).to.be.calledOnceWith(changedPaths);
    });

    it('Expect to restart run when a new change occurs', async function () {
      const fakePromise = createFakePromise();
      const changedPaths = createChangedPaths();

      /* Necessary stupid stub otherwise the run function wont 
      be called a second time since the default value will
      not be assigned anything */
      Sinon.stub(fileWatcherStubbedInstance, 'changedPaths').get(
        () => changedPaths,
      );
      taskManagerStubbedInstance.run.returns(fakePromise);
      taskManagerStubbedInstance.stop.callsFake(() =>
        fakePromise.resolve(undefined),
      );

      Perkulator.watch(createPerkulatorOptions());
      fileWatcherWatchStub.firstCall.args[0].onChange(changedPaths);
      fileWatcherWatchStub.firstCall.args[0].onChange(changedPaths);

      await awaitResult(() => {
        expect(taskManagerStubbedInstance.run).to.have.callCount(2);
      });
    });

    it('Expect a successful run to clear the changedPaths list', async function () {
      taskManagerStubbedInstance.run.resolves(true);

      const changedPaths = createChangedPaths();
      Perkulator.watch(createPerkulatorOptions());
      fileWatcherWatchStub.firstCall.args[0].onChange(changedPaths);

      await awaitResult(() => {
        expect(fileWatcherStubbedInstance.clear).to.be.calledOnce;
      });
    });
  });

  describe('Perkulator.close', function () {
    it('Expect close to exit perkulator gracefully', async function () {
      const fakePromise = createFakePromise();
      taskManagerStubbedInstance.stop.callsFake(fakePromise.resolve as any);

      const perkulator = Perkulator.watch(createPerkulatorOptions());
      void perkulator.close();

      await awaitResult(() => {
        expect(fileWatcherStubbedInstance.close).to.be.calledOnce;
        expect(workerPoolStubbedInstance.terminateAllWorkers).to.be.calledOnce;
      });
    });
  });
});
