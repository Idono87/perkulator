import { expect, use } from 'chai';
import { createSandbox } from 'sinon';
import ChaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

import TaskRunner from '../../../task/task-runner';
import {
  createChangedPaths,
  createTaskOptions,
  ERROR_EVENT,
  RESULT_EVENT,
  SKIPPED_EVENT,
  STOP_EVENT,
  TEST_PATH,
} from '../../../__tests__/utils';
import * as workerTask from '../../../worker/worker-task';
import * as WorkerPool from '../../../worker/worker-pool';

use(ChaiAsPromised);
use(sinonChai);
const Sinon = createSandbox();

describe('TaskRunner', function () {
  afterEach(function () {
    Sinon.restore();
  });

  describe('TaskRunner.run', function () {
    it('Expect task to be run and finish execution', async function () {
      const taskOptions = createTaskOptions();
      const changedPaths = createChangedPaths();
      const eventListener = Sinon.stub();

      const workerTaskStub = Sinon.stub(workerTask, 'default');
      const workerPoolStubbedInstance = Sinon.createStubInstance(
        WorkerPool.WorkerPool,
      );
      workerPoolStubbedInstance.runTask.callsFake(() => {
        workerTaskStub
          .withArgs(taskOptions, changedPaths, Sinon.match.func)
          .callArgWith(/* listener */ 2, RESULT_EVENT);
      });
      Sinon.stub(WorkerPool, 'getWorkerPool').returns(
        workerPoolStubbedInstance as any,
      );

      const taskRunner = new TaskRunner(taskOptions);
      taskRunner.setRunnerEventListener(eventListener);
      await taskRunner.run(changedPaths);

      expect(eventListener).to.be.calledOnceWith(RESULT_EVENT);
    });

    it('Expect task to stop when an error event is received', async function () {
      const eventListener = Sinon.stub();

      const workerTaskStub = Sinon.stub(workerTask, 'default');
      const workerPoolStubbedInstance = Sinon.createStubInstance(
        WorkerPool.WorkerPool,
      );
      workerPoolStubbedInstance.runTask.callsFake(() => {
        workerTaskStub.callArgWith(/* listener */ 2, ERROR_EVENT);
      });
      Sinon.stub(WorkerPool, 'getWorkerPool').returns(
        workerPoolStubbedInstance as any,
      );

      const taskRunner = new TaskRunner(createTaskOptions());
      taskRunner.setRunnerEventListener(eventListener);
      await taskRunner.run(createChangedPaths());

      expect(eventListener).to.be.calledOnceWith(ERROR_EVENT);
    });

    it('Expect task to be skipped when no matching paths exist', async function () {
      const eventListener = Sinon.stub();
      const taskOptions = createTaskOptions(
        undefined,
        /* include paths */ ['/not/including/anything/'],
      );

      const taskRunner = new TaskRunner(taskOptions);
      taskRunner.setRunnerEventListener(eventListener);
      await taskRunner.run(createChangedPaths());

      expect(eventListener).to.be.calledOnceWith(SKIPPED_EVENT);
    });

    it('Expect task to be skipped when paths are excluded', async function () {
      const eventListener = Sinon.stub();
      const taskOptions = createTaskOptions(
        undefined,
        undefined,
        /* exclude paths */ [`${TEST_PATH}*`],
      );

      const taskRunner = new TaskRunner(taskOptions);
      taskRunner.setRunnerEventListener(eventListener);
      await taskRunner.run(createChangedPaths());

      expect(eventListener).to.be.calledOnceWith(SKIPPED_EVENT);
    });

    it('Expect an error to be thrown when run is called on a running task', async function () {
      Sinon.stub(workerTask, 'default');

      const taskRunner = new TaskRunner(createTaskOptions());
      void taskRunner.run(createChangedPaths());

      await expect(taskRunner.run(createChangedPaths())).to.be.rejectedWith(
        'Task is already running.',
      );
    });
  });

  describe('TaskRunner.stop', function () {
    it('Expect task to stop', async function () {
      const eventListener = Sinon.stub();

      const workerPoolStubbedInstance = Sinon.createStubInstance(
        WorkerPool.WorkerPool,
      );
      const workerTaskStubbedInstance = Sinon.createStubInstance(
        workerTask.default,
      );
      const workerTaskStub = Sinon.stub(workerTask, 'default').returns(
        workerTaskStubbedInstance,
      );
      workerTaskStubbedInstance.stop.callsFake(() => {
        workerTaskStub.callArgWith(/* listener */ 2, STOP_EVENT);
      });
      Sinon.stub(WorkerPool, 'getWorkerPool').returns(
        workerPoolStubbedInstance as any,
      );

      const taskRunner = new TaskRunner(createTaskOptions());
      taskRunner.setRunnerEventListener(eventListener);
      void taskRunner.run(createChangedPaths());
      taskRunner.stop();

      expect(eventListener).to.be.calledOnceWith(STOP_EVENT);
    });
  });
});
