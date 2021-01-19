import { expect, use } from 'chai';
import { createSandbox, SinonSandbox, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';

import TaskManager from '~/task/task-manager';
import TaskRunner from '~/task/task-runner';
import { TaskResultCode } from '~/task/enum-task-result-code';

import type { ChangedPaths, TaskOptions, TaskResults } from '~/types';

use(sinonChai);

const TASK_FINISHED: TaskResults = { resultCode: TaskResultCode.Finished };
const TASK_TERMINATED: TaskResults = { resultCode: TaskResultCode.Terminated };
const TASK_ERROR: TaskResults = { resultCode: TaskResultCode.Error };

const changedPaths: ChangedPaths = { add: [], change: [], remove: [] };

let Sinon: SinonSandbox;
let taskStub: SinonStubbedInstance<TaskRunner>;

function createTaskOptionsList(taskCount = 1): TaskOptions[] {
  const taskOptionsList: TaskOptions[] = [];
  for (let i = 0; i < taskCount; i++) {
    taskOptionsList.push({
      module: `/task/module/${i}`,
    });
  }

  return taskOptionsList;
}

describe('Task manager', function () {
  Sinon = createSandbox();

  beforeEach(function () {
    taskStub = Sinon.createStubInstance(TaskRunner);
    taskStub.stop.resolves();
    Sinon.stub(TaskRunner, 'createTask').callsFake(
      (): TaskRunner => {
        return (Sinon.createStubInstance(TaskRunner, {
          run: taskStub.run,
          stop: taskStub.stop,
        }) as unknown) as TaskRunner;
      },
    );
  });

  afterEach(() => {
    Sinon.restore();
  });

  it(`Expect ${TaskManager.prototype.run.name} to return a "TaskResultCode.Finished"`, async function () {
    const expectRunCount = 5;
    taskStub.run.resolves(TASK_FINISHED);

    const manager = TaskManager.create(createTaskOptionsList(5));

    await expect(manager.run(changedPaths)).to.eventually.equal(
      TaskResultCode.Finished,
    );
    expect(taskStub.run).to.have.callCount(expectRunCount);
  });

  it(`Expect ${TaskManager.prototype.run.name} to return a "TaskResultCode.Terminated"`, async function () {
    const expectedRunCount = 3;
    taskStub.run.onThirdCall().resolves(TASK_TERMINATED);
    taskStub.run.resolves(TASK_FINISHED);

    const manager = TaskManager.create(
      createTaskOptionsList(expectedRunCount + 2),
    );

    await expect(manager.run(changedPaths)).to.eventually.equal(
      TaskResultCode.Terminated,
    );
    expect(taskStub.run).to.have.callCount(expectedRunCount);
  });

  it(`Expect ${TaskManager.prototype.run.name} to return a "TaskResultCode.Error"`, async function () {
    const expectedRunCount = 3;
    taskStub.run.onThirdCall().resolves(TASK_ERROR);
    taskStub.run.resolves(TASK_FINISHED);

    const manager = TaskManager.create(
      createTaskOptionsList(expectedRunCount + 2),
    );

    await expect(manager.run(changedPaths)).to.eventually.equal(
      TaskResultCode.Error,
    );
    expect(taskStub.run).to.have.callCount(expectedRunCount);
  });

  it(`Expect ${TaskManager.prototype.stop.name} to terminate the running and remaining tasks`, async function () {
    const expectRunCount = 3;

    taskStub.run.resolves(TASK_FINISHED);
    taskStub.run.onThirdCall().callsFake(
      async (): Promise<TaskResults> => {
        await manager.stop();
        return TASK_TERMINATED;
      },
    );

    const manager = TaskManager.create(
      createTaskOptionsList(expectRunCount + 2),
    );

    await expect(manager.run(changedPaths)).to.eventually.equal(
      TaskResultCode.Terminated,
    );
    expect(taskStub.run).to.have.callCount(expectRunCount);
  });

  it(`Expect ${TaskManager.prototype.stop.name} to terminate and not have a race condition`, async function () {
    const expectRunCount = 3;

    taskStub.run.resolves(TASK_FINISHED);
    taskStub.run.onThirdCall().callsFake(
      async (): Promise<TaskResults> => {
        void manager.stop();
        return TASK_FINISHED;
      },
    );

    const manager = TaskManager.create(
      createTaskOptionsList(expectRunCount + 2),
    );

    await expect(manager.run(changedPaths)).to.eventually.equal(
      TaskResultCode.Terminated,
    );
    expect(taskStub.run).to.have.callCount(expectRunCount);
  });
});
