import { expect, use } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import subprocess, { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

import { TaskProcessDirective } from '~/task/task-runner-process-adapter';
import { TaskEventType } from '~/task/task-runner';
import TaskRunnerProcessAdapter from '../task-runner-process-adapter';
import UnexpectedTaskTerminationError from '~/errors/unexpected-task-termination-error';
import {
  awaitResult,
  createChangedPaths,
  createTaskOptions,
  PROCESS_READY_EVENT,
  RESULT_EVENT,
  STOP_EVENT,
  UPDATE_EVENT,
} from '~/test-utils';

import type {
  TaskProcessEvent,
  TaskProcessDirectiveMessage,
} from '~/task/task-runner-process-adapter';
import type { TaskEvent } from '~/task/task-runner';
import {
  RUN_DIRECTIVE,
  START_DIRECTIVE,
} from '~/test-utils/process-directives';

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
  directiveMessage: TaskProcessDirectiveMessage,
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
    emitResponseOnDirective(START_DIRECTIVE, PROCESS_READY_EVENT);

    emitResponseOnDirective(RUN_DIRECTIVE, RESULT_EVENT);

    childProcessStub.disconnect.callsFake(() => childProcessStub.emit('exit'));

    const adapter = TaskRunnerProcessAdapter.create(
      createTaskOptions(),
      runnerMessageListener,
    );

    await adapter.run((RUN_DIRECTIVE as any).changedPaths);

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledOnceWith(RESULT_EVENT);
    });
  });

  it('Expect to emit a stop message', async function () {
    const changedPaths = createChangedPaths();

    emitResponseOnDirective(START_DIRECTIVE, PROCESS_READY_EVENT);

    emitResponseOnDirective(
      {
        directive: TaskProcessDirective.stop,
      },
      STOP_EVENT,
    );

    childProcessStub.disconnect.callsFake(() => childProcessStub.emit('exit'));

    const adapter = TaskRunnerProcessAdapter.create(
      (START_DIRECTIVE as any).options,
      runnerMessageListener,
    );

    void adapter.run(changedPaths);
    adapter.stop();

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledOnceWith(STOP_EVENT);
    });
  });

  it('Expect to emit an update message', async function () {
    const changedPaths = createChangedPaths();

    emitResponseOnDirective(START_DIRECTIVE, PROCESS_READY_EVENT);

    const adapter = TaskRunnerProcessAdapter.create(
      (START_DIRECTIVE as any).options,
      runnerMessageListener,
    );

    void adapter.run(changedPaths);

    childProcessStub.emit('message', UPDATE_EVENT);

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledOnceWith(UPDATE_EVENT);
    });
  });

  it('Expect child process to receive a "SIGKILL"', async function () {
    const fakeTimer = Sinon.useFakeTimers();
    const changedPaths = createChangedPaths();
    const options = createTaskOptions(__filename, true, false);

    emitResponseOnDirective(START_DIRECTIVE, PROCESS_READY_EVENT);

    emitResponseOnDirective(
      {
        directive: TaskProcessDirective.stop,
      },
      STOP_EVENT,
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
    emitResponseOnDirective(START_DIRECTIVE, PROCESS_READY_EVENT);

    emitResponseOnDirective(RUN_DIRECTIVE, RESULT_EVENT);

    childProcessStub.disconnect.callsFake(() => childProcessStub.emit('exit'));

    const adapter = TaskRunnerProcessAdapter.create(
      createTaskOptions(),
      runnerMessageListener,
    );

    await adapter.run((RUN_DIRECTIVE as any).changedPaths);

    await awaitResult(() => {
      expect(runnerMessageListener).to.be.calledOnceWith(RESULT_EVENT);
      expect(childProcessStub.disconnect).to.not.be.called;
    });
  });

  it('Expect unexpected process exit to send task exit event', async function () {
    emitResponseOnDirective(START_DIRECTIVE, PROCESS_READY_EVENT);

    childProcessStub.send.withArgs(RUN_DIRECTIVE).callsFake(() => {
      setImmediate(() => {
        childProcessStub.emit('exit');
      });
    });

    const adapter = TaskRunnerProcessAdapter.create(
      createTaskOptions(),
      runnerMessageListener,
    );

    await adapter.run((RUN_DIRECTIVE as any).changedPaths);

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
