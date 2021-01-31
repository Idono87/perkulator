import { expect, use } from 'chai';
import { createSandbox, SinonStub, SinonStubbedInstance } from 'sinon';
import ChaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

import TaskRunner from '~/task/task-runner';
import TaskRunnerProcessAdapter from '../task-runner-process-adapter';
import { createChangedPaths, createPerkulatorOptions } from '~/test-utils';
import { TaskEventType } from '../enum-task-event-type';
import TaskStopTimeoutError from '~/errors/task-stop-timeout-error';
import TaskProxy from '../task-proxy';

import type { ChangedPaths, TaskEvent, TaskOptions } from '~/types';

use(ChaiAsPromised);
use(sinonChai);

let taskRunnerProcessAdapter: SinonStubbedInstance<TaskRunnerProcessAdapter>;
let taskRunnerProcessAdapterCreateStub: SinonStub;

describe('Task Runner', function () {
  const Sinon = createSandbox();

  beforeEach(function () {
    taskRunnerProcessAdapter = Sinon.createStubInstance(
      TaskRunnerProcessAdapter,
    );

    taskRunnerProcessAdapterCreateStub = Sinon.stub(
      TaskRunnerProcessAdapter,
      'create',
    ).returns(
      (taskRunnerProcessAdapter as unknown) as TaskRunnerProcessAdapter,
    );
  });

  afterEach(function () {
    Sinon.restore();
  });

  describe('Filter paths', function () {
    const includePath = '/include/this/path';
    const excludePath = '/exclude/this/path';

    const changedPaths: ChangedPaths = {
      add: [includePath, excludePath],
      change: [includePath, excludePath],
      remove: [includePath, excludePath],
    };

    it('Expect to create', function () {
      const taskProxyStub = Sinon.stub(TaskProxy, 'create').returns(
        (Sinon.createStubInstance<TaskProxy>(
          TaskProxy,
        ) as unknown) as TaskProxy,
      );

      TaskRunner.createTask(createPerkulatorOptions(1).tasks[0]);

      expect(taskRunnerProcessAdapterCreateStub).to.be.calledOnce;
      expect(taskProxyStub).to.not.be.called;
    });

    it('Expect to create with TaskProxy', function () {
      const taskProxyStub = Sinon.stub(TaskProxy, 'create').returns(
        (Sinon.createStubInstance<TaskProxy>(
          TaskProxy,
        ) as unknown) as TaskProxy,
      );
      const options = Object.assign(createPerkulatorOptions(1).tasks[0]);
      options.fork = false;
      TaskRunner.createTask(options);

      expect(taskRunnerProcessAdapterCreateStub).to.not.be.called;
      expect(taskProxyStub).to.be.calledOnce;
    });

    it(`Expect to included paths`, async function () {
      const expectedPaths: ChangedPaths = {
        add: [includePath],
        change: [includePath],
        remove: [includePath],
      };

      const options: TaskOptions = {
        module: __filename,
        include: [includePath],
      };
      const task = TaskRunner.createTask(options);

      taskRunnerProcessAdapter.run.resolves();

      await expect(task.run(changedPaths)).to.eventually.not.be.null;
      expect(taskRunnerProcessAdapter.run).to.be.calledWith(expectedPaths);
    });

    it(`Expect to exclude paths`, async function () {
      const expectedPaths: ChangedPaths = {
        add: [includePath],
        change: [includePath],
        remove: [includePath],
      };

      const options: TaskOptions = {
        module: __filename,
        exclude: [excludePath],
      };
      const task = TaskRunner.createTask(options);

      taskRunnerProcessAdapter.run.resolves();

      await expect(task.run(changedPaths)).to.eventually.not.be.null;
      expect(taskRunnerProcessAdapter.run).to.be.calledWith(expectedPaths);
    });

    it(`Expect to skip task if all task are excluded`, async function () {
      const options: TaskOptions = {
        module: __filename,
        exclude: [includePath, excludePath],
      };
      const task = TaskRunner.createTask(options);

      await expect(task.run(changedPaths)).to.eventually.be.null;
      expect(taskRunnerProcessAdapter.run).to.not.be.called;
    });
  });

  it('Expect to receive a result message', async function () {
    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.result,
      result: {},
    };

    const task = TaskRunner.createTask(createPerkulatorOptions().tasks[0]);

    taskRunnerProcessAdapter.run.resolves();

    const messageIterator = await task.run(createChangedPaths());

    task.handleMessage(expectedMessage);

    expect((await messageIterator!.next()).value).to.deep.equal(
      expectedMessage,
    );

    expect((await messageIterator!.next()).done).to.be.true;
  });

  it('Expect to receive an update message', async function () {
    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.update,
      update: {},
    };

    const task = TaskRunner.createTask(createPerkulatorOptions().tasks[0]);

    taskRunnerProcessAdapter.run.resolves();

    const messageIterator = await task.run(createChangedPaths());

    task.handleMessage(expectedMessage);

    expect((await messageIterator!.next()).value).to.deep.equal(
      expectedMessage,
    );
  });

  it('Expect to receive a stop message', async function () {
    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.stop,
    };

    const task = TaskRunner.createTask(createPerkulatorOptions().tasks[0]);

    taskRunnerProcessAdapter.run.resolves();

    taskRunnerProcessAdapter.stop.callsFake(() => {
      task.handleMessage(expectedMessage);
    });

    const messageIterator = await task.run(createChangedPaths());

    task.stop();

    expect((await messageIterator!.next()).value).to.deep.equal(
      expectedMessage,
    );

    expect((await messageIterator!.next()).done).to.be.true;
  });

  it('Expect to throw "TaskStopTimeoutError"', async function () {
    const fakeTimer = Sinon.useFakeTimers();
    const task = TaskRunner.createTask(createPerkulatorOptions().tasks[0]);

    taskRunnerProcessAdapter.run.resolves();

    const messageIterator = await task.run(createChangedPaths());

    task.stop();

    void fakeTimer.runAllAsync();

    await expect(messageIterator!.next()).to.eventually.rejectedWith(
      TaskStopTimeoutError,
    );
  });
});
