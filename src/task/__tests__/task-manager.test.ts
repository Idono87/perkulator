import { expect, use } from 'chai';
import { createSandbox, SinonSandbox, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

import TaskManager from '~/task/task-manager';
import Task from '~/task/task';
import { TaskResultCode } from '~/task/enum-task-result-code';
import type { TaskResults } from '~/types';

use(sinonChai);

const TASK_FINISHED: TaskResults = { resultcode: TaskResultCode.Finished };
const TASK_TERMINATED: TaskResults = { resultcode: TaskResultCode.Terminated };
const TASK_ERROR: TaskResults = { resultcode: TaskResultCode.Error };

let Sinon: SinonSandbox;
let taskRunStub: SinonStub<any, Promise<TaskResults>>;

function createFakeTask(): Task {
  return {
    run: taskRunStub,
    stop: Sinon.stub().resolves(Promise.resolve()),
  } as any;
}

function addTasks(manager: TaskManager, taskCount = 1): void {
  const taskStub = Sinon.stub(Task, 'createTask');

  for (let i = 0; i < taskCount; i++) {
    taskStub.onCall(i).returns(createFakeTask());

    manager.addTask({
      path: `/task/module/${i}`,
    });
  }
}

describe('Task manager', function () {
  Sinon = createSandbox();

  beforeEach(function () {
    taskRunStub = Sinon.stub();
  });

  afterEach(() => {
    Sinon.restore();
  });

  it(`Expect ${TaskManager.prototype.run.name} to return a "TaskResultCode.Finished"`, async function () {
    const expectRunCount = 5;
    taskRunStub.resolves(TASK_FINISHED);
    const manager = new TaskManager();
    addTasks(manager, expectRunCount);

    await expect(manager.run()).to.eventually.equal(TaskResultCode.Finished);
    expect(taskRunStub).to.have.callCount(expectRunCount);
  });

  it(`Expect ${TaskManager.prototype.run.name} to return a "TaskResultCode.Terminated"`, async function () {
    const expectedRunCount = 3;
    taskRunStub.onThirdCall().resolves(TASK_TERMINATED);
    taskRunStub.resolves(TASK_FINISHED);

    const manager = new TaskManager();
    addTasks(manager, expectedRunCount + 2);

    await expect(manager.run()).to.eventually.equal(TaskResultCode.Terminated);
    expect(taskRunStub).to.have.callCount(expectedRunCount);
  });

  it(`Expect ${TaskManager.prototype.run.name} to return a "TaskResultCode.Error"`, async function () {
    const expectedRunCount = 3;
    taskRunStub.onThirdCall().resolves(TASK_ERROR);
    taskRunStub.resolves(TASK_FINISHED);

    const manager = new TaskManager();
    addTasks(manager, expectedRunCount + 2);

    await expect(manager.run()).to.eventually.equal(TaskResultCode.Error);
    expect(taskRunStub).to.have.callCount(expectedRunCount);
  });

  it(`Expect ${TaskManager.prototype.stop.name} to terminate the running and remaining tasks`, async function () {
    const expectRunCount = 3;

    taskRunStub.resolves(TASK_FINISHED);
    taskRunStub.onThirdCall().callsFake(
      async (): Promise<TaskResults> => {
        await manager.stop();
        return TASK_TERMINATED;
      },
    );

    const manager = new TaskManager();
    addTasks(manager, expectRunCount + 2);

    await expect(manager.run()).to.eventually.equal(TaskResultCode.Terminated);
    expect(taskRunStub).to.have.callCount(expectRunCount);
  });

  it(`Expect ${TaskManager.prototype.stop.name} to terminate and not have a race condition`, async function () {
    const expectRunCount = 3;

    taskRunStub.resolves(TASK_FINISHED);
    taskRunStub.onThirdCall().callsFake(
      async (): Promise<TaskResults> => {
        void manager.stop();
        return TASK_FINISHED;
      },
    );

    const manager = new TaskManager();
    addTasks(manager, expectRunCount + 2);

    await expect(manager.run()).to.eventually.equal(TaskResultCode.Terminated);
    expect(taskRunStub).to.have.callCount(expectRunCount);
  });
});
