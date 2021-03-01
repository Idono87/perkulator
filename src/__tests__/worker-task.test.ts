import { expect, use } from 'chai';
import { worker } from 'cluster';
import { createSandbox, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';
import { MessagePort } from 'worker_threads';
import { TaskEvent, TaskEventType } from '~/task/task-runner';

import { createChangedPaths, createTaskOptions } from '~/__tests__/utils';
import {
  EMIT_WORKER_TASK_ERROR_KEY,
  RUN_WORKER_TASK_KEY,
} from '~/worker/worker-pool';
import WorkerTask, {
  TaskDirectiveType,
  TaskRunDirective,
} from '~/worker/worker-task';

use(sinonChai);
const Sinon = createSandbox();

describe('WorkerTask', function () {
  afterEach(function () {
    Sinon.restore();
  });

  describe('WorkerTask.[RUN_WORKER_TASK_KEY]', function () {
    it('Expect method to post a run directive to passed port', function () {
      const portStubbedInstance = Sinon.createStubInstance(MessagePort);
      const taskOptions = createTaskOptions();
      const changedPaths = createChangedPaths();

      const workerTask = new WorkerTask(taskOptions, changedPaths, () => {});
      workerTask[RUN_WORKER_TASK_KEY](portStubbedInstance);

      const expectedDirective: TaskRunDirective = {
        type: TaskDirectiveType.RUN,
        taskOptions,
        changedPaths,
      };
      expect(portStubbedInstance.postMessage).to.be.calledOnceWith(
        expectedDirective,
      );
    });

    it('Expect port messages to emit an event to the attached event listener', function () {
      const expectedMessage = 'TestMessage';
      const eventListener = Sinon.stub();
      const portStubbedInstance = Sinon.createStubInstance(MessagePort);

      const workerTask = new WorkerTask(
        createTaskOptions(),
        createChangedPaths(),
        eventListener,
      );
      workerTask[RUN_WORKER_TASK_KEY](portStubbedInstance);
      portStubbedInstance.on
        .withArgs('message', Sinon.match.func)
        .callArgWith(/* listener */ 1, expectedMessage);

      expect(eventListener).to.be.calledOnceWith(expectedMessage);
    });

    it('Expect port close event to emit an error to the attached event listener', function () {
      const eventListener = Sinon.stub();
      const portStubbedInstance = Sinon.createStubInstance(MessagePort);

      const workerTask = new WorkerTask(
        createTaskOptions(),
        createChangedPaths(),
        eventListener,
      );
      workerTask[RUN_WORKER_TASK_KEY](portStubbedInstance);
      portStubbedInstance.on
        .withArgs('close', Sinon.match.func)
        .callArg(/* listener */ 1);

      expect(eventListener).to.be.calledOnceWith(
        Sinon.match
          .has('eventType', TaskEventType.error)
          .and(
            Sinon.match.has(
              'error',
              Sinon.match
                .instanceOf(Error)
                .and(
                  Sinon.match.has('message', 'Message port has been closed'),
                ),
            ),
          ),
      );
    });
  });

  describe('WorkerTask.stop', function () {
    it('Expect stop to send a directive to the attached port', function () {
      const portStubbedInstance = Sinon.createStubInstance(MessagePort);

      const workerTask = new WorkerTask(
        createTaskOptions(),
        createChangedPaths(),
        () => {},
      );
      workerTask[RUN_WORKER_TASK_KEY](portStubbedInstance);
      workerTask.stop();

      expect(portStubbedInstance.postMessage).to.be.calledWith(
        Sinon.match.has('type', TaskDirectiveType.STOP),
      );
    });

    it('Expect stop to not throw when there is not attached port', function () {
      const portStubbedInstance = Sinon.createStubInstance(MessagePort);

      const workerTask = new WorkerTask(
        createTaskOptions(),
        createChangedPaths(),
        () => {},
      );
      workerTask.stop();

      expect(portStubbedInstance.postMessage).to.not.be.called;
    });
  });

  describe('WorkerTask.[EMIT_WORKER_TASK_ERROR_KEY]', function () {
    it('Expect a call to error to emit an event to the attached event listener', function () {
      const error = new Error('Test Error');
      const eventListener = Sinon.stub();

      const workerTask = new WorkerTask(
        createTaskOptions(),
        createChangedPaths(),
        eventListener,
      );
      workerTask[EMIT_WORKER_TASK_ERROR_KEY](error);

      const expectedDirective: TaskEvent = {
        eventType: TaskEventType.error,
        error,
      };
      expect(eventListener).to.be.calledOnceWith(expectedDirective);
    });
  });
});
