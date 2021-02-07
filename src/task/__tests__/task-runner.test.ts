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

import type {
  ChangedPaths,
  TaskEvent,
  TaskEventListener,
  TaskOptions,
} from '~/types';

use(ChaiAsPromised);
use(sinonChai);

let taskRunnerProcessAdapter: SinonStubbedInstance<TaskRunnerProcessAdapter>;
let taskRunnerProcessAdapterCreateStub: SinonStub;
let handleEventStub: TaskEventListener;

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

      TaskRunner.create(createPerkulatorOptions(1).tasks[0], handleEventStub);

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
      TaskRunner.create(options, handleEventStub);

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
      const task = TaskRunner.create(options, handleEventStub);

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
      const task = TaskRunner.create(options, handleEventStub);

      taskRunnerProcessAdapter.run.resolves();

      await expect(task.run(changedPaths)).to.eventually.not.be.null;
      expect(taskRunnerProcessAdapter.run).to.be.calledWith(expectedPaths);
    });

    it(`Expect to skip task if all task are excluded`, async function () {
      const expectedEvent: TaskEvent = { eventType: TaskEventType.skipped };

      const options: TaskOptions = {
        module: __filename,
        exclude: [includePath, excludePath],
      };
      const task = TaskRunner.create(options, handleEventStub);
      await task.run(changedPaths);

      expect(handleEventStub).to.be.calledWith(expectedEvent);
      expect(taskRunnerProcessAdapter.run).to.not.be.called;
    });
  });

  it('Expect to receive an event', async function () {
    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.result,
      result: {},
    };

    const task = TaskRunner.create(
      createPerkulatorOptions().tasks[0],
      handleEventStub,
    );

    task.handleEvent(expectedMessage);

    expect(handleEventStub).to.be.calledWith(expectedMessage);
  });

  it('Expect to receive a stop message', async function () {
    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.stop,
    };

    const task = TaskRunner.create(
      createPerkulatorOptions().tasks[0],
      handleEventStub,
    );

    taskRunnerProcessAdapter.run.resolves();

    taskRunnerProcessAdapter.stop.callsFake(() => {
      task.handleEvent(expectedMessage);
    });

    await task.run(createChangedPaths());
    task.stop();

    expect(handleEventStub).to.be.calledWith(expectedMessage);
  });

  it('Expect to receive error "TaskStopTimeoutError"', async function () {
    const fakeTimer = Sinon.useFakeTimers();

    const options = createPerkulatorOptions().tasks[0];

    const task = TaskRunner.create(options, handleEventStub);

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
