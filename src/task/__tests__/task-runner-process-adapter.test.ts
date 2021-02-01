import { expect, use } from 'chai';
import { createSandbox, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';
import subprocess, { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

import TaskRunner from '../task-runner';
import {
  awaitResult,
  createChangedPaths,
  createPerkulatorOptions,
} from '~/test-utils';
import type {
  TaskDirectiveMessage,
  TaskEvent,
  TaskProcessDirectiveMessage,
  TaskProcessEvent,
} from '~/types';
import { TaskDirective, TaskProcessDirective } from '../enum-task-directive';
import { TaskEventType, TaskProcessEventType } from '../enum-task-event-type';
import TaskRunnerProcessAdapter from '../task-runner-process-adapter';

use(sinonChai);

const Sinon = createSandbox();

class ChildProcessStub extends EventEmitter {
  kill = Sinon.stub();
  send = Sinon.stub();
  disconnect = Sinon.stub();
  killed = Sinon.stub();
  exitCode = null;
  signalCode = null;
}

let taskRunnerStub: SinonStubbedInstance<TaskRunner>;
let childProcessStub: ChildProcessStub;

// Emits responses to the child process.
function emitResponseOnDirective(
  directiveMessage: TaskProcessDirectiveMessage | TaskDirectiveMessage,
  responseMessage: TaskProcessEvent | TaskEvent,
): void {
  childProcessStub.send.withArgs(directiveMessage).callsFake(() => {
    setImmediate(() => {
      childProcessStub.emit('message', responseMessage);
    });
  });
}

describe('Task runner process adapter', function () {
  beforeEach(function () {
    childProcessStub = new ChildProcessStub();
    Sinon.stub(subprocess, 'fork').returns(
      (childProcessStub as unknown) as ChildProcess,
    );

    taskRunnerStub = Sinon.createStubInstance(TaskRunner);
    Sinon.stub(TaskRunner, 'createTask').returns(
      (taskRunnerStub as unknown) as TaskRunner,
    );
  });

  afterEach(function () {
    Sinon.restore();
  });

  it('Expect to emit a result message', async function () {
    const changedPaths = createChangedPaths();
    const options = createPerkulatorOptions();

    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.result,
      result: {},
    };

    emitResponseOnDirective(
      { directive: TaskProcessDirective.start, options: options.tasks[0] },
      { eventType: TaskProcessEventType.ready },
    );

    emitResponseOnDirective(
      {
        directive: TaskDirective.run,
        changedPaths,
      },
      expectedMessage,
    );

    childProcessStub.disconnect.callsFake(() => childProcessStub.emit('exit'));

    const adapter = TaskRunnerProcessAdapter.create(
      createPerkulatorOptions().tasks[0],
      TaskRunner.createTask(createPerkulatorOptions().tasks[0]),
    );

    await adapter.run(changedPaths);

    await awaitResult(() => {
      expect(taskRunnerStub.handleMessage).to.be.calledOnceWith(
        expectedMessage,
      );
    });
  });

  it('Expect to emit a stop message', async function () {
    const changedPaths = createChangedPaths();
    const options = createPerkulatorOptions();

    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.stop,
    };

    emitResponseOnDirective(
      { directive: TaskProcessDirective.start, options: options.tasks[0] },
      { eventType: TaskProcessEventType.ready },
    );

    emitResponseOnDirective(
      {
        directive: TaskDirective.stop,
      },
      expectedMessage,
    );

    childProcessStub.disconnect.callsFake(() => childProcessStub.emit('exit'));

    const adapter = TaskRunnerProcessAdapter.create(
      options.tasks[0],
      TaskRunner.createTask(options.tasks[0]),
    );

    void adapter.run(changedPaths);
    adapter.stop();

    await awaitResult(() => {
      expect(taskRunnerStub.handleMessage).to.be.calledOnceWith(
        expectedMessage,
      );
    });
  });

  it('Expect to emit an update message', async function () {
    const changedPaths = createChangedPaths();
    const options = createPerkulatorOptions();

    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.update,
      update: 'Hello World!',
    };

    emitResponseOnDirective(
      { directive: TaskProcessDirective.start, options: options.tasks[0] },
      { eventType: TaskProcessEventType.ready },
    );

    const adapter = TaskRunnerProcessAdapter.create(
      options.tasks[0],
      TaskRunner.createTask(options.tasks[0]),
    );

    void adapter.run(changedPaths);

    childProcessStub.emit('message', expectedMessage);

    await awaitResult(() => {
      expect(taskRunnerStub.handleMessage).to.be.calledOnceWith(
        expectedMessage,
      );
    });
  });

  it('Expect child process to receive a "SIGKILL"', async function () {
    const fakeTimer = Sinon.useFakeTimers();
    const changedPaths = createChangedPaths();
    const options = createPerkulatorOptions();

    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.stop,
    };

    emitResponseOnDirective(
      { directive: TaskProcessDirective.start, options: options.tasks[0] },
      { eventType: TaskProcessEventType.ready },
    );

    emitResponseOnDirective(
      {
        directive: TaskDirective.stop,
      },
      expectedMessage,
    );

    const adapter = TaskRunnerProcessAdapter.create(
      options.tasks[0],
      TaskRunner.createTask(options.tasks[0]),
    );

    void adapter.run(changedPaths);
    adapter.stop();

    await fakeTimer.tickAsync(11000);

    void fakeTimer.runAllAsync();

    await awaitResult(() => {
      expect(childProcessStub.kill).to.be.calledWith('SIGKILL');
    }, 15000);
  });
});
