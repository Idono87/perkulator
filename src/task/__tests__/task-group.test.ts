import { expect, use } from 'chai';
import { createSandbox, SinonStub, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';

import TaskGroup from '~/task/task-group';
import TaskRunner from '~/task/task-runner';
import {
  awaitResult,
  createChangedPaths,
  createPerkulatorOptions,
} from '~/test-utils';

import type { GroupEvent, TaskGroupOptions } from '~/types';
import { TaskEventType, TaskGroupEventType } from '../enum-task-event-type';

use(sinonChai);

const Sinon = createSandbox();

let taskRunnerStub: SinonStubbedInstance<TaskRunner>;
let taskRunnerCreateStub: SinonStub;

describe('Task group', function () {
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
      .tasks[0] as TaskGroupOptions;

    const taskGroup = TaskGroup.create(options);

    expect(taskGroup).to.be.instanceOf(TaskGroup);

    for (const taskOptions of options.tasks) {
      expect(taskRunnerCreateStub).to.be.calledWith(taskOptions);
    }
  });

  it('Expect all tasks to return a result', async function () {
    const taskCount = 10;
    const options = createPerkulatorOptions(0, 1, taskCount)
      .tasks[0] as TaskGroupOptions;

    const expectedResult: GroupEvent = {
      eventType: TaskGroupEventType.result,
      result: {},
    };

    const taskGroup = TaskGroup.create(options);

    const listenerStub = Sinon.stub();

    taskRunnerStub.setTaskEventListener.callsFake((listener) => {
      setImmediate(() =>
        listener({ eventType: TaskEventType.result, result: {} }),
      );
    });

    taskRunnerStub.run.resolves();

    taskGroup.setTaskEventListener(listenerStub);
    void taskGroup.run(createChangedPaths());

    await awaitResult(() => {
      for (let i = 0; i < taskCount; i++) {
        expect(listenerStub.getCall(i)).to.be.calledWithExactly(expectedResult);
      }

      expect(listenerStub.getCall(taskCount)).to.be.calledWithExactly({
        eventType: TaskEventType.result,
      });

      expect(listenerStub).to.have.callCount(taskCount + 1);
    });
  });

  it('Expect a failed task to stop execution of the remaining tasks', async function () {
    const taskCount = 10;
    const errorOnCall = 3;
    const options = createPerkulatorOptions(0, 1, taskCount)
      .tasks[0] as TaskGroupOptions;

    const expectedResult: GroupEvent = {
      eventType: TaskGroupEventType.result,
      result: { errors: ['Test error'] },
    };

    const taskGroup = TaskGroup.create(options);

    const listenerStub = Sinon.stub();

    taskRunnerStub.setTaskEventListener.callsFake((listener) => {
      setImmediate(() =>
        listener({ eventType: TaskEventType.result, result: {} }),
      );
    });

    taskRunnerStub.setTaskEventListener
      .onCall(errorOnCall - 1)
      .callsFake((listener) => {
        setImmediate(() =>
          listener({
            eventType: TaskEventType.result,
            result: expectedResult.result,
          }),
        );
      });

    taskRunnerStub.run.resolves();

    taskGroup.setTaskEventListener(listenerStub);
    void taskGroup.run(createChangedPaths());

    await awaitResult(() => {
      expect(listenerStub).to.be.calledWith(expectedResult);

      expect(listenerStub.getCall(errorOnCall)).to.be.calledWithExactly({
        eventType: TaskEventType.stop,
      });

      expect(listenerStub).to.have.callCount(errorOnCall + 1);
    });
  });

  it('Expect a skipped task to continue execution of the remaining tasks', async function () {
    const taskCount = 10;
    const options = createPerkulatorOptions(0, 1, taskCount)
      .tasks[0] as TaskGroupOptions;

    const expectedResult: GroupEvent = {
      eventType: TaskGroupEventType.result,
      result: {},
    };

    const taskGroup = TaskGroup.create(options);

    const listenerStub = Sinon.stub();

    taskRunnerStub.setTaskEventListener.callsFake((listener) => {
      setImmediate(() =>
        listener({ eventType: TaskEventType.result, result: {} }),
      );
    });

    taskRunnerStub.setTaskEventListener.onFirstCall().callsFake((listener) => {
      setImmediate(() => listener({ eventType: TaskEventType.skipped }));
    });

    taskRunnerStub.run.resolves();

    taskGroup.setTaskEventListener(listenerStub);
    void taskGroup.run(createChangedPaths());

    await awaitResult(() => {
      expect(listenerStub.firstCall).to.be.calledWithExactly({
        eventType: TaskGroupEventType.skipped,
      });

      for (let i = 1; i < taskCount; i++) {
        expect(listenerStub.getCall(i)).to.be.calledWithExactly(expectedResult);
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
      .tasks[0] as TaskGroupOptions;

    const expectedResult: GroupEvent = {
      eventType: TaskGroupEventType.result,
      result: {},
    };

    const taskGroup = TaskGroup.create(options);

    const listenerStub = Sinon.stub();

    taskRunnerStub.setTaskEventListener.callsFake((listener) => {
      setImmediate(() =>
        listener({ eventType: TaskEventType.result, result: {} }),
      );
    });

    taskRunnerStub.setTaskEventListener
      .onCall(stopOnCall)
      .callsFake((listener) => {
        taskRunnerStub.stop.callsFake(() => {
          taskRunnerStub.stop.resetBehavior();

          setImmediate(() => listener({ eventType: TaskEventType.stop }));
        });

        taskGroup.stop();
      });

    taskRunnerStub.run.resolves();

    taskGroup.setTaskEventListener(listenerStub);
    void taskGroup.run(createChangedPaths());

    await awaitResult(() => {
      expect(listenerStub.getCall(stopOnCall)).to.be.calledWith({
        eventType: TaskGroupEventType.stop,
      });

      for (let i = 0; i < stopOnCall; i++) {
        expect(listenerStub.getCall(i)).to.be.calledWithExactly(expectedResult);
      }

      const expectedStopEventOnCall = stopOnCall + 1;
      expect(
        listenerStub.getCall(expectedStopEventOnCall),
      ).to.be.calledWithExactly({
        eventType: TaskEventType.stop,
      });

      const listenerCallCount = stopOnCall + 2;
      expect(listenerStub).to.have.callCount(listenerCallCount);
    });
  });

  it('Expect an update to continue running the current task');
});
