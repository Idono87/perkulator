import { expect, use } from 'chai';
import { createSandbox, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';

import GroupRunner from '~/task/group-runner';
import TaskRunner from '~/task/task-runner';
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
} from '~/__tests__/test-utils';

use(sinonChai);
const Sinon = createSandbox();

describe('Group runner parallel', function () {
  let taskRunnerStubList: Array<SinonStubbedInstance<TaskRunner>> = [];

  beforeEach(function () {
    taskRunnerStubList = [];

    Sinon.stub(TaskRunner, 'create').callsFake(() => {
      const taskRunnerStub = Sinon.createStubInstance(TaskRunner);
      taskRunnerStubList.push(taskRunnerStub);

      return (taskRunnerStub as unknown) as TaskRunner;
    });
  });

  afterEach(function () {
    Sinon.restore();
  });

  it('Expect all tasks to return a result', async function () {
    const taskCount = 10;
    const options = createGroupOptions({ taskCount, parallel: true });
    const groupRunner = GroupRunner.create(options);
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
    const groupRunner = GroupRunner.create(options);
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
});
