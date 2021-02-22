import { expect, use } from 'chai';
import { createSandbox, SinonStub, SinonStubbedInstance } from 'sinon';
import ChaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

import TaskRunner, { TaskEventType } from '~/task/task-runner';
import TaskRunnerProcessAdapter from '../task-runner-process-adapter';
import {
  createChangedPaths,
  createPerkulatorOptions,
  createTaskOptions,
  RESULT_EVENT,
  SKIPPED_EVENT,
} from '~/test-utils';
import TaskStopTimeoutError from '~/errors/task-stop-timeout-error';
import TaskProxy from '../task-proxy';

import type { TaskEventListener } from '~/task/task-manager';
import type { ChangedPaths } from '~/file-watcher/file-watcher';
import type { TaskOptions, TaskEvent } from '~/task/task-runner';

use(ChaiAsPromised);
use(sinonChai);

let taskRunnerProcessAdapter: SinonStubbedInstance<TaskRunnerProcessAdapter>;
let taskRunnerProcessAdapterCreateStub: SinonStub;
let handleEventStub: TaskEventListener<TaskEvent>;

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

    handleEventStub = Sinon.stub();
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

      TaskRunner.create(createTaskOptions());

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
      TaskRunner.create(options);

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
      const task = TaskRunner.create(options);
      task.setTaskEventListener(handleEventStub);

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
      const task = TaskRunner.create(options);
      task.setTaskEventListener(handleEventStub);

      taskRunnerProcessAdapter.run.resolves();

      await expect(task.run(changedPaths)).to.eventually.not.be.null;
      expect(taskRunnerProcessAdapter.run).to.be.calledWith(expectedPaths);
    });

    it(`Expect to skip task if all task are excluded`, async function () {
      const options: TaskOptions = {
        module: __filename,
        exclude: [includePath, excludePath],
      };
      const task = TaskRunner.create(options);
      task.setTaskEventListener(handleEventStub);

      await task.run(changedPaths);

      expect(handleEventStub).to.be.calledWith(SKIPPED_EVENT);
      expect(taskRunnerProcessAdapter.run).to.not.be.called;
    });
  });

  it('Expect to receive an event', async function () {
    const task = TaskRunner.create(createTaskOptions());
    task.setTaskEventListener(handleEventStub);

    task.handleEvent(RESULT_EVENT);

    expect(handleEventStub).to.be.calledWith(RESULT_EVENT);
  });

  it('Expect to receive a stop message', async function () {
    const task = TaskRunner.create(createTaskOptions());
    task.setTaskEventListener(handleEventStub);

    taskRunnerProcessAdapter.run.resolves();

    taskRunnerProcessAdapter.stop.callsFake(() => {
      task.handleEvent(RESULT_EVENT);
    });

    await task.run(createChangedPaths());
    task.stop();

    expect(handleEventStub).to.be.calledWith(RESULT_EVENT);
  });

  it('Expect to receive error "TaskStopTimeoutError"', async function () {
    const fakeTimer = Sinon.useFakeTimers();

    const options = createTaskOptions();

    const task = TaskRunner.create(options);
    task.setTaskEventListener(handleEventStub);

    taskRunnerProcessAdapter.run.resolves();

    await task.run(createChangedPaths());
    task.stop();

    await fakeTimer.runAllAsync();

    expect(handleEventStub).to.be.calledWith(
      Sinon.match
        .hasNested('eventType', TaskEventType.error)
        .and(
          Sinon.match.hasNested(
            'error',
            Sinon.match.instanceOf(TaskStopTimeoutError),
          ),
        ),
    );
  });
});
