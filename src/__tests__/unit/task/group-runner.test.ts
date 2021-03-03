import { expect, use } from 'chai';
import { createSandbox, SinonStub, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';

import GroupRunner, { GroupEventType } from '../../../task/group-runner';
import * as taskRunner from '../../../task/task-runner';
import WorkerPool from '../../../worker/worker-pool';
import {
  awaitResult,
  createChangedPaths,
  createPerkulatorOptions,
  createGroupOptions,
  GROUP_RESULT_EVENT,
  GROUP_RESULT_EVENT_WITH_ERRORS,
  GROUP_STOP_EVENT,
  RESULT_EVENT,
  RESULT_EVENT_EMPTY,
  RESULT_EVENT_WITH_ERRORS,
  SKIPPED_EVENT,
  STOP_EVENT,
} from '../../../__tests__/utils';

import type { GroupOptions } from '../../../task/group-runner';

use(sinonChai);

const Sinon = createSandbox();

let taskRunnerStubbedInstance: SinonStubbedInstance<taskRunner.default>;
let taskRunnerStub: SinonStub;
let workerPoolStubbedInstance: SinonStubbedInstance<WorkerPool>;

describe('Group runner', function () {
  beforeEach(function () {
    taskRunnerStubbedInstance = Sinon.createStubInstance(taskRunner.default);
    taskRunnerStub = Sinon.stub(taskRunner, 'default').returns(
      taskRunnerStubbedInstance as any,
    );
    workerPoolStubbedInstance = Sinon.createStubInstance(WorkerPool);
  });

  afterEach(function () {
    Sinon.restore();
  });

  it('Expect to create with n task runners', function () {
    const taskCount = 10;
    const options = createPerkulatorOptions(0, 1, taskCount)
      .tasks[0] as GroupOptions;

    const groupRunner = GroupRunner.create(
      options,
      workerPoolStubbedInstance as any,
    );

    expect(groupRunner).to.be.instanceOf(GroupRunner);

    for (const taskOptions of options.tasks) {
      expect(taskRunnerStub).to.be.calledWith(taskOptions);
    }
  });

  it('Expect all tasks to return a result', async function () {
    const taskCount = 10;
    const options = createPerkulatorOptions(0, 1, taskCount)
      .tasks[0] as GroupOptions;

    const groupRunner = GroupRunner.create(
      options,
      workerPoolStubbedInstance as any,
    );

    const listenerStub = Sinon.stub();

    taskRunnerStubbedInstance.setRunnerEventListener.callsFake((listener) => {
      setImmediate(() => listener(RESULT_EVENT));
    });

    taskRunnerStubbedInstance.run.resolves();

    groupRunner.setRunnerEventListener(listenerStub);
    void groupRunner.run(createChangedPaths());

    await awaitResult(() => {
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

      expect(listenerStub, 'Expect call count').to.have.callCount(
        taskCount + 1,
      );
    });
  });

  it('Expect a failed task to stop execution of the remaining tasks', async function () {
    const taskCount = 10;
    const errorOnCall = 3;
    const options = createPerkulatorOptions(0, 1, taskCount)
      .tasks[0] as GroupOptions;

    const groupRunner = GroupRunner.create(
      options,
      workerPoolStubbedInstance as any,
    );

    const listenerStub = Sinon.stub();

    taskRunnerStubbedInstance.setRunnerEventListener.callsFake((listener) => {
      setImmediate(() => listener(RESULT_EVENT));
    });

    taskRunnerStubbedInstance.setRunnerEventListener
      .onCall(errorOnCall - 1)
      .callsFake((listener) => {
        setImmediate(() => listener(RESULT_EVENT_WITH_ERRORS));
      });

    taskRunnerStubbedInstance.run.resolves();

    groupRunner.setRunnerEventListener(listenerStub);
    void groupRunner.run(createChangedPaths());

    await awaitResult(() => {
      expect(listenerStub).to.be.calledWith(GROUP_RESULT_EVENT_WITH_ERRORS);

      expect(listenerStub.getCall(errorOnCall)).to.be.calledWithExactly(
        STOP_EVENT,
      );

      expect(listenerStub).to.have.callCount(errorOnCall + 1);
    });
  });

  it('Expect a skipped task to continue execution of the remaining tasks', async function () {
    const taskCount = 10;
    const options = createPerkulatorOptions(0, 1, taskCount)
      .tasks[0] as GroupOptions;

    const groupRunner = GroupRunner.create(
      options,
      workerPoolStubbedInstance as any,
    );

    const listenerStub = Sinon.stub();

    taskRunnerStubbedInstance.setRunnerEventListener.callsFake((listener) => {
      setImmediate(() => listener(RESULT_EVENT));
    });

    taskRunnerStubbedInstance.setRunnerEventListener
      .onFirstCall()
      .callsFake((listener) => {
        setImmediate(() => listener(SKIPPED_EVENT));
      });

    taskRunnerStubbedInstance.run.resolves();

    groupRunner.setRunnerEventListener(listenerStub);
    void groupRunner.run(createChangedPaths());

    await awaitResult(() => {
      expect(listenerStub.firstCall).to.be.calledWithExactly({
        eventType: GroupEventType.skipped,
      });

      for (let i = 1; i < taskCount; i++) {
        expect(listenerStub.getCall(i)).to.be.calledWithExactly(
          GROUP_RESULT_EVENT,
        );
      }

      expect(listenerStub.getCall(taskCount)).to.be.calledWithExactly({
        eventType: taskRunner.TaskEventType.result,
      });

      expect(listenerStub).to.have.callCount(taskCount + 1);
    });
  });

  it('Expect to stop running task and skip the remaining tasks', async function () {
    const taskCount = 10;
    const stopOnCall = 3; // 4th call

    const options = createPerkulatorOptions(0, 1, taskCount)
      .tasks[0] as GroupOptions;

    const groupRunner = GroupRunner.create(
      options,
      workerPoolStubbedInstance as any,
    );

    const listenerStub = Sinon.stub();

    taskRunnerStubbedInstance.setRunnerEventListener.callsFake((listener) => {
      setImmediate(() => listener(RESULT_EVENT));
    });

    taskRunnerStubbedInstance.setRunnerEventListener
      .onCall(stopOnCall)
      .callsFake((listener) => {
        taskRunnerStubbedInstance.stop.callsFake(() => {
          taskRunnerStubbedInstance.stop.resetBehavior();

          setImmediate(() => listener(STOP_EVENT));
        });

        groupRunner.stop();
      });

    taskRunnerStubbedInstance.run.resolves();

    groupRunner.setRunnerEventListener(listenerStub);
    void groupRunner.run(createChangedPaths());

    await awaitResult(() => {
      expect(listenerStub.getCall(stopOnCall)).to.be.calledWith(
        GROUP_STOP_EVENT,
      );

      for (let i = 0; i < stopOnCall; i++) {
        expect(listenerStub.getCall(i)).to.be.calledWithExactly(
          GROUP_RESULT_EVENT,
        );
      }

      const expectedStopEventOnCall = stopOnCall + 1;
      expect(
        listenerStub.getCall(expectedStopEventOnCall),
      ).to.be.calledWithExactly(STOP_EVENT);

      const listenerCallCount = stopOnCall + 2;
      expect(listenerStub).to.have.callCount(listenerCallCount);
    });
  });

  describe('GroupRunner.run', function () {
    it('Expect a list of transformedPaths to be passed to the next task', async function () {
      const transformedPaths = createChangedPaths(/* transformed */ true);

      taskRunnerStubbedInstance.run.onCall(0).callsFake(async () => {
        const event = Object.assign({}, RESULT_EVENT, {
          result: { changedPaths: transformedPaths },
        });

        taskRunnerStubbedInstance.setRunnerEventListener.callArgWith(0, event);
      });
      const groupRunner = GroupRunner.create(
        createGroupOptions({ taskCount: 2 }),
        workerPoolStubbedInstance as any,
      );
      void groupRunner.run(createChangedPaths());

      await awaitResult(() => {
        expect(taskRunnerStubbedInstance.run.getCall(1)).to.be.calledWith(
          transformedPaths,
        );
      });
    });
  });

  it('Expect an update to continue running the current task');
});
