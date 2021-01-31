import { expect, use } from 'chai';
import { createSandbox, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';
import TaskRunningError from '~/errors/task-running-error';

import TaskManager from '~/task/task-manager';
import TaskRunner from '~/task/task-runner';
import { createChangedPaths, createPerkulatorOptions } from '~/test-utils';

import type { ChangedPaths, TaskEvent } from '~/types';
import { TaskEventType } from '../enum-task-event-type';

use(sinonChai);

const changedPaths: ChangedPaths = createChangedPaths();

const Sinon = createSandbox();
let taskRunnerStub: SinonStubbedInstance<TaskRunner>;

async function* fakeMessageGenerator(
  message: TaskEvent,
): AsyncIterable<TaskEvent> {
  while (true) {
    yield message;
  }
}

describe('Task manager', function () {
  beforeEach(function () {
    taskRunnerStub = Sinon.createStubInstance(TaskRunner);
    Sinon.stub(TaskRunner, 'createTask').returns(
      (taskRunnerStub as unknown) as TaskRunner,
    );
  });

  afterEach(() => {
    Sinon.restore();
  });

  it(`Expect a completed run to return true`, async function () {
    const resultMessage: TaskEvent = {
      eventType: TaskEventType.result,
      result: {},
    };

    const expectTaskCallCount = 5;
    taskRunnerStub.run.resolves(fakeMessageGenerator(resultMessage));

    const manager = TaskManager.create(
      createPerkulatorOptions(expectTaskCallCount).tasks,
    );

    await expect(manager.run(changedPaths)).to.eventually.be.true;
    expect(taskRunnerStub.run).to.have.callCount(expectTaskCallCount);
  });

  it(`Expect a halted run to return false`, async function () {
    const resultMessage: TaskEvent = {
      eventType: TaskEventType.result,
      result: {},
    };

    const stopMessage: TaskEvent = {
      eventType: TaskEventType.stop,
    };

    const expectTaskCallCount = 3;
    taskRunnerStub.run.resolves(fakeMessageGenerator(resultMessage));
    taskRunnerStub.run.onCall(expectTaskCallCount - 1).callsFake(async () => {
      manager.stop();

      return fakeMessageGenerator(stopMessage);
    });

    const manager = TaskManager.create(createPerkulatorOptions().tasks);

    await expect(manager.run(changedPaths)).to.eventually.be.false;
    expect(taskRunnerStub.run).to.have.callCount(expectTaskCallCount);
  });

  it(`Expect to halt run on an error`, async function () {
    const errorMessage: TaskEvent = {
      eventType: TaskEventType.error,
      error: new Error(),
    };

    const expectTaskCallCount = 1;
    taskRunnerStub.run.resolves(fakeMessageGenerator(errorMessage));

    const manager = TaskManager.create(createPerkulatorOptions().tasks);

    await expect(manager.run(changedPaths)).to.eventually.be.false;
    expect(taskRunnerStub.run).to.have.callCount(expectTaskCallCount);
  });

  it('Expect run to throw "TaskRunningError"', function () {
    const manager = TaskManager.create(createPerkulatorOptions().tasks);

    void manager.run(createChangedPaths());

    return expect(manager.run(createChangedPaths())).to.be.rejectedWith(
      TaskRunningError,
    );
  });
});
