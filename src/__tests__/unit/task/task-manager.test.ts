import { expect, use } from 'chai';
import { createSandbox, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';
import TaskRunningError from '../../../errors/task-running-error';

import TaskManager from '../../../task/task-manager';
import * as taskRunner from '../../../task/task-runner';
import {
  createChangedPaths,
  createPerkulatorOptions,
  ERROR_EVENT,
  RESULT_EVENT,
  STOP_EVENT,
} from '../../../__tests__/utils';
import GroupRunner from '../../../task/group-runner';

import type { ChangedPaths } from '../../../file-watcher/file-watcher';
import type { TaskEvent } from '../../../task/task-runner';
import WorkerPool from '../../../worker/worker-pool';

use(sinonChai);

const changedPaths: ChangedPaths = createChangedPaths();

const Sinon = createSandbox();
let taskRunnerStubbedInstance: SinonStubbedInstance<taskRunner.default>;
let groupRunnerStub: SinonStubbedInstance<GroupRunner>;
let workerPoolStubbedInstance: SinonStubbedInstance<WorkerPool>;

describe('Task manager', function () {
  beforeEach(function () {
    taskRunnerStubbedInstance = Sinon.createStubInstance(taskRunner.default);
    groupRunnerStub = Sinon.createStubInstance(GroupRunner);
    workerPoolStubbedInstance = Sinon.createStubInstance(WorkerPool);

    Sinon.stub(taskRunner, 'default').returns(taskRunnerStubbedInstance as any);

    Sinon.stub(GroupRunner, 'create').returns(
      (groupRunnerStub as unknown) as GroupRunner,
    );
  });

  afterEach(() => {
    Sinon.restore();
  });

  it(`Expect a completed run to return true`, async function () {
    const taskCount = 5;
    const groupCount = 5;

    taskRunnerStubbedInstance.run.callsFake(async () => {
      setImmediate(() => {
        const callCount =
          taskRunnerStubbedInstance.setRunnerEventListener.callCount;
        const listener =
          taskRunnerStubbedInstance.setRunnerEventListener.args[
            callCount - 1
          ][0];
        listener(RESULT_EVENT);
      });
    });

    groupRunnerStub.run.callsFake(async () => {
      setImmediate(() => {
        const callCount = groupRunnerStub.setRunnerEventListener.callCount;
        const listener =
          groupRunnerStub.setRunnerEventListener.args[callCount - 1][0];
        listener(RESULT_EVENT);
      });
    });

    const manager = TaskManager.create(
      createPerkulatorOptions(taskCount, groupCount, 10).tasks,
      workerPoolStubbedInstance as any,
    );

    expect(await manager.run(changedPaths)).to.be.true;
    expect(taskRunnerStubbedInstance.run).to.have.callCount(taskCount);
    expect(groupRunnerStub.run).to.have.callCount(groupCount);
  });

  it(`Expect a halted run to return false`, async function () {
    const expectTaskCallCount = 3;
    taskRunnerStubbedInstance.run.callsFake(async () => {
      setImmediate(() => {
        const callCount =
          taskRunnerStubbedInstance.setRunnerEventListener.callCount;
        const listener =
          taskRunnerStubbedInstance.setRunnerEventListener.args[
            callCount - 1
          ][0];
        listener(RESULT_EVENT);
      });
    });

    taskRunnerStubbedInstance.run
      .onCall(expectTaskCallCount - 1)
      .callsFake(async () => {
        manager.stop();
      });

    taskRunnerStubbedInstance.stop.callsFake(() => {
      setImmediate(() => {
        const callCount =
          taskRunnerStubbedInstance.setRunnerEventListener.callCount;
        const listener =
          taskRunnerStubbedInstance.setRunnerEventListener.args[
            callCount - 1
          ][0];
        listener(STOP_EVENT);
      });
    });

    const manager = TaskManager.create(
      createPerkulatorOptions().tasks,
      workerPoolStubbedInstance as any,
    );

    await expect(manager.run(changedPaths)).to.eventually.be.false;
    expect(taskRunnerStubbedInstance.run).to.have.callCount(
      expectTaskCallCount,
    );
  });

  it('Expect a halted run if the result has errors', async function () {
    const resultEvent: TaskEvent = {
      eventType: taskRunner.TaskEventType.result,
      result: { errors: ['this is an error'] },
    };

    const expectTaskCallCount = 1;
    taskRunnerStubbedInstance.run.callsFake(async () => {
      setImmediate(() => {
        const callCount =
          taskRunnerStubbedInstance.setRunnerEventListener.callCount;
        const listener =
          taskRunnerStubbedInstance.setRunnerEventListener.args[
            callCount - 1
          ][0];
        listener(resultEvent);
      });
    });

    const manager = TaskManager.create(
      createPerkulatorOptions().tasks,
      workerPoolStubbedInstance as any,
    );

    await expect(manager.run(changedPaths)).to.eventually.be.false;
    expect(taskRunnerStubbedInstance.run).to.have.callCount(
      expectTaskCallCount,
    );
  });

  it(`Expect to halt run on an error`, async function () {
    const expectTaskCallCount = 1;
    taskRunnerStubbedInstance.run.callsFake(async () => {
      setImmediate(() => {
        const callCount =
          taskRunnerStubbedInstance.setRunnerEventListener.callCount;
        const listener =
          taskRunnerStubbedInstance.setRunnerEventListener.args[
            callCount - 1
          ][0];
        listener(ERROR_EVENT);
      });
    });

    const manager = TaskManager.create(
      createPerkulatorOptions().tasks,
      workerPoolStubbedInstance as any,
    );

    await expect(manager.run(changedPaths)).to.eventually.be.false;
    expect(taskRunnerStubbedInstance.run).to.have.callCount(
      expectTaskCallCount,
    );
  });

  it('Expect run to throw "TaskRunningError"', function () {
    const manager = TaskManager.create(
      createPerkulatorOptions().tasks,
      workerPoolStubbedInstance as any,
    );

    void manager.run(createChangedPaths());

    return expect(manager.run(createChangedPaths())).to.be.rejectedWith(
      TaskRunningError,
    );
  });
});
