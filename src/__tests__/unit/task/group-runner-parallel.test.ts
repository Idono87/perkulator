import { expect, use } from 'chai';
import { createSandbox, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';

import GroupRunner from '../../../task/group-runner';
import * as taskRunner from '../../../task/task-runner';
import WorkerPool from '../../../worker/worker-pool';
import {
  awaitResult,
  createChangedPaths,
  createGroupOptions,
  GROUP_RESULT_EVENT,
  GROUP_RESULT_EVENT_WITH_ERRORS,
  GROUP_STOP_EVENT,
  RESULT_EVENT,
  RESULT_EVENT_EMPTY,
  RESULT_EVENT_WITH_ERRORS,
  STOP_EVENT,
} from '../../../__tests__/utils';

use(sinonChai);
const Sinon = createSandbox();

describe('Group runner parallel', function () {
  let taskRunnerStubList: Array<SinonStubbedInstance<taskRunner.default>> = [];
  let workerPoolStubbedInstance: SinonStubbedInstance<WorkerPool>;
  const TaskRunner = taskRunner.default;

  beforeEach(function () {
    taskRunnerStubList = [];

    workerPoolStubbedInstance = Sinon.createStubInstance(WorkerPool);
    Sinon.stub(taskRunner, 'default').callsFake(() => {
      const taskRunnerStub = Sinon.createStubInstance(TaskRunner);
      taskRunnerStubList.push(taskRunnerStub);

      return taskRunnerStub as any;
    });
  });

  afterEach(function () {
    Sinon.restore();
  });

  it('Expect all tasks to return a result', async function () {
    const taskCount = 10;
    const options = createGroupOptions({ taskCount, parallel: true });
    const groupRunner = GroupRunner.create(
      options,
      workerPoolStubbedInstance as any,
    );
    const listenerStub = Sinon.stub();
    const taskRunnerListenerList: any[] = [];

    for (const taskRunnerStub of taskRunnerStubList) {
      taskRunnerStub.setRunnerEventListener.callsFake((listener) => {
        taskRunnerListenerList.push(listener);
      });

      taskRunnerStub.run.resolves();
    }

    groupRunner.setRunnerEventListener(listenerStub);
    const pendingRun = groupRunner.run(createChangedPaths());

    for (const listener of taskRunnerListenerList) {
      listener(RESULT_EVENT);
    }

    await awaitResult(async () => {
      for (let i = 0; i < taskCount; i++) {
        expect(
          listenerStub.getCall(i),
          'Expect group result event',
        ).to.be.calledWithExactly(GROUP_RESULT_EVENT);
      }

      expect(
        listenerStub.getCall(taskCount),
        'Expect result event',
      ).to.be.calledWithExactly(RESULT_EVENT_EMPTY);

      await expect(pendingRun).to.be.fulfilled;
    });
  });

  it('Expect a failed result to stop the remaining tasks', async function () {
    const taskCount = 10;
    const failedTaskIndex = 4;
    const options = createGroupOptions({ taskCount, parallel: true });
    const groupRunner = GroupRunner.create(
      options,
      workerPoolStubbedInstance as any,
    );
    const listenerStub = Sinon.stub();

    const failingTaskRunnerStub = taskRunnerStubList.splice(
      failedTaskIndex,
      1,
    )[0];

    let failingTaskListener: any;
    failingTaskRunnerStub.setRunnerEventListener.callsFake((listener) => {
      failingTaskListener = listener;
    });

    for (const taskRunnerStub of taskRunnerStubList) {
      taskRunnerStub.setRunnerEventListener.callsFake((listener) => {
        taskRunnerStub.stop.callsFake(() => {
          listener(STOP_EVENT);
        });
      });

      taskRunnerStub.run.resolves();
    }

    groupRunner.setRunnerEventListener(listenerStub);
    const pendingRun = groupRunner.run(createChangedPaths());

    failingTaskListener(RESULT_EVENT_WITH_ERRORS);

    await awaitResult(async () => {
      expect(
        listenerStub.withArgs(GROUP_STOP_EVENT).callCount,
        'Expect group stop event',
      ).to.equal(taskCount - 1);

      expect(
        listenerStub.withArgs(GROUP_RESULT_EVENT_WITH_ERRORS).callCount,
        'Expect group result event',
      ).to.equal(1);

      expect(
        listenerStub.getCall(taskCount),
        'Expect result event',
      ).to.be.calledWith(STOP_EVENT);

      await expect(pendingRun).to.be.fulfilled;
    });
  });

  describe('GroupRunner.run', function () {
    it('Expect a list of transformedPaths to be passed to the next task', async function () {
      const transformedPaths = createChangedPaths(/* transformed */ true);

      const groupRunner = GroupRunner.create(
        createGroupOptions({ taskCount: 2, parallel: true }),
        workerPoolStubbedInstance as any,
      );
      taskRunnerStubList[0].run.callsFake(async () => {
        const event = Object.assign({}, RESULT_EVENT, {
          result: { changedPaths: transformedPaths },
        });

        taskRunnerStubList[0].setRunnerEventListener.callArgWith(0, event);
      });
      void groupRunner.run(createChangedPaths());

      await awaitResult(() => {
        for (const stubbedInstance of taskRunnerStubList) {
          expect(stubbedInstance.run).to.not.be.calledWith(transformedPaths);
        }
      });
    });
  });
});
