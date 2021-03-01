import { expect, use } from 'chai';
import { createSandbox, SinonStub, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';

import GroupRunner, { GroupEventType } from '~/task/group-runner';
import TaskRunner, { TaskEventType } from '~/task/task-runner';
import {
  awaitResult,
  createChangedPaths,
  createPerkulatorOptions,
  GROUP_RESULT_EVENT,
  GROUP_RESULT_EVENT_WITH_ERRORS,
  GROUP_STOP_EVENT,
  RESULT_EVENT,
  RESULT_EVENT_EMPTY,
  RESULT_EVENT_WITH_ERRORS,
  SKIPPED_EVENT,
  STOP_EVENT,
} from '~/__tests__/test-utils';

import type { GroupOptions } from '~/task/group-runner';

use(sinonChai);

const Sinon = createSandbox();

let taskRunnerStub: SinonStubbedInstance<TaskRunner>;
let taskRunnerCreateStub: SinonStub;

describe('Group runner', function () {
  beforeEach(function () {
    taskRunnerStub = Sinon.createStubInstance(TaskRunner);
    taskRunnerCreateStub = Sinon.stub(TaskRunner, 'create').returns(
      (taskRunnerStub as unknown) as TaskRunner,
    );
  });

  afterEach(function () {
    Sinon.restore();
  });

  it('Expect to create with n task runners', function () {
    const taskCount = 10;
    const options = createPerkulatorOptions(0, 1, taskCount)
      .tasks[0] as GroupOptions;

    const groupRunner = GroupRunner.create(options);

    expect(groupRunner).to.be.instanceOf(GroupRunner);

    for (const taskOptions of options.tasks) {
      expect(taskRunnerCreateStub).to.be.calledWith(taskOptions);
    }
  });

  it('Expect all tasks to return a result', async function () {
    const taskCount = 10;
    const options = createPerkulatorOptions(0, 1, taskCount)
      .tasks[0] as GroupOptions;

    const groupRunner = GroupRunner.create(options);

    const listenerStub = Sinon.stub();

    taskRunnerStub.setRunnerEventListener.callsFake((listener) => {
      setImmediate(() => listener(RESULT_EVENT));
    });

    taskRunnerStub.run.resolves();

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

    const groupRunner = GroupRunner.create(options);

    const listenerStub = Sinon.stub();

    taskRunnerStub.setRunnerEventListener.callsFake((listener) => {
      setImmediate(() => listener(RESULT_EVENT));
    });

    taskRunnerStub.setRunnerEventListener
      .onCall(errorOnCall - 1)
      .callsFake((listener) => {
        setImmediate(() => listener(RESULT_EVENT_WITH_ERRORS));
      });

    taskRunnerStub.run.resolves();

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

    const groupRunner = GroupRunner.create(options);

    const listenerStub = Sinon.stub();

    taskRunnerStub.setRunnerEventListener.callsFake((listener) => {
      setImmediate(() => listener(RESULT_EVENT));
    });

    taskRunnerStub.setRunnerEventListener
      .onFirstCall()
      .callsFake((listener) => {
        setImmediate(() => listener(SKIPPED_EVENT));
      });

    taskRunnerStub.run.resolves();

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
        eventType: TaskEventType.result,
      });

      expect(listenerStub).to.have.callCount(taskCount + 1);
    });
  });

  it('Expect to stop running task and skip the remaining tasks', async function () {
    const taskCount = 10;
    const stopOnCall = 3; // 4th call

    const options = createPerkulatorOptions(0, 1, taskCount)
      .tasks[0] as GroupOptions;

    const groupRunner = GroupRunner.create(options);

    const listenerStub = Sinon.stub();

    taskRunnerStub.setRunnerEventListener.callsFake((listener) => {
      setImmediate(() => listener(RESULT_EVENT));
    });

    taskRunnerStub.setRunnerEventListener
      .onCall(stopOnCall)
      .callsFake((listener) => {
        taskRunnerStub.stop.callsFake(() => {
          taskRunnerStub.stop.resetBehavior();

          setImmediate(() => listener(STOP_EVENT));
        });

        groupRunner.stop();
      });

    taskRunnerStub.run.resolves();

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

  it('Expect an update to continue running the current task');
});
