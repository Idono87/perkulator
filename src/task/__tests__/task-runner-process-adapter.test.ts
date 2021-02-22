import { expect, use } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import subprocess, { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

import {
  awaitResult,
  createChangedPaths,
  createTaskOptions,
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
import UnexpectedTaskTerminationError from '~/errors/unexpected-task-termination-error';

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

let childProcessStub: ChildProcessStub;
let runnerMessageListener: SinonStub;

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

    runnerMessageListener = Sinon.stub();
  });

  afterEach(function () {
    Sinon.restore();
  });

  it('Expect to emit a result message', async function () {
    const changedPaths = createChangedPaths();
    const options = createTaskOptions();

    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.result,
      result: {},
    };

    emitResponseOnDirective(
      { directive: TaskProcessDirective.start, options },
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
      createTaskOptions(),
      runnerMessageListener,
    );

    await adapter.run(changedPaths);

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledOnceWith(expectedMessage);
    });
  });

  it('Expect to emit a stop message', async function () {
    const changedPaths = createChangedPaths();
    const options = createTaskOptions();

    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.stop,
    };

    emitResponseOnDirective(
      { directive: TaskProcessDirective.start, options },
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
      options,
      runnerMessageListener,
    );

    void adapter.run(changedPaths);
    adapter.stop();

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledOnceWith(expectedMessage);
    });
  });

  it('Expect to emit an update message', async function () {
    const changedPaths = createChangedPaths();
    const options = createTaskOptions();

    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.update,
      update: 'Hello World!',
    };

    emitResponseOnDirective(
      { directive: TaskProcessDirective.start, options },
      { eventType: TaskProcessEventType.ready },
    );

    const adapter = TaskRunnerProcessAdapter.create(
      options,
      runnerMessageListener,
    );

    void adapter.run(changedPaths);

    childProcessStub.emit('message', expectedMessage);

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledOnceWith(expectedMessage);
    });
  });

  it('Expect child process to receive a "SIGKILL"', async function () {
    const fakeTimer = Sinon.useFakeTimers();
    const changedPaths = createChangedPaths();
    const options = createTaskOptions(__filename, true, false);

    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.stop,
    };

    emitResponseOnDirective(
      { directive: TaskProcessDirective.start, options },
      { eventType: TaskProcessEventType.ready },
    );

    emitResponseOnDirective(
      {
        directive: TaskDirective.stop,
      },
      expectedMessage,
    );

    const adapter = TaskRunnerProcessAdapter.create(
      options,
      runnerMessageListener,
    );

    void adapter.run(changedPaths);
    adapter.stop();

    await fakeTimer.tickAsync(11000);

    void fakeTimer.runAllAsync();

    await awaitResult(() => {
      expect(childProcessStub.kill).to.be.calledWith('SIGKILL');
    }, 15000);
  });

  it('Expect child process to be persistent', async function () {
    const changedPaths = createChangedPaths();
    const options = createTaskOptions();

    const expectedMessage: TaskEvent = {
      eventType: TaskEventType.result,
      result: {},
    };

    emitResponseOnDirective(
      { directive: TaskProcessDirective.start, options },
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
      createTaskOptions(),
      runnerMessageListener,
    );

    await adapter.run(changedPaths);

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledOnceWith(expectedMessage);
      expect(childProcessStub.disconnect).to.not.be.called;
    });
  });

  it('Expect unexpected process exit to send task exit event', async function () {
    const changedPaths = createChangedPaths();
    const options = createTaskOptions();

    emitResponseOnDirective(
      { directive: TaskProcessDirective.start, options },
      { eventType: TaskProcessEventType.ready },
    );

    childProcessStub.send
      .withArgs({
        directive: TaskDirective.run,
        changedPaths,
      })
      .callsFake(() => {
        setImmediate(() => {
          childProcessStub.emit('exit');
        });
      });

    const adapter = TaskRunnerProcessAdapter.create(
      createTaskOptions(),
      runnerMessageListener,
    );

    await adapter.run(changedPaths);

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledOnceWith(
        Sinon.match
          .hasNested('eventType', TaskEventType.error)
          .and(
            Sinon.match.hasNested(
              'error',
              Sinon.match.instanceOf(UnexpectedTaskTerminationError),
            ),
          ),
      );

      expect(childProcessStub.disconnect).to.not.be.called;
    });
  });
});
