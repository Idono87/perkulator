import { expect, use } from 'chai';
import {
  createSandbox,
  createStubInstance,
  SinonStub,
  SinonStubbedInstance,
} from 'sinon';
import sinonChai from 'sinon-chai';
import worker from 'worker_threads';

import TaskWorkerInitializationError from '~/errors/task-worker-initialization-error';
import TaskProxy from '~/task/task-proxy';
import { awaitResult, RESULT_EVENT, RUN_DIRECTIVE } from '~/test-utils';
import {
  WorkerLifecycleDirectiveType,
  WorkerEventType,
  TaskWorkerFinishedEvent,
} from '~/worker/worker-pool';
import WorkerError from '~/errors/worker-error';
import { TaskEventType } from '~/task/task-runner';

import type { WorkerInitDirective } from '~/worker/worker-pool';

use(sinonChai);
const Sinon = createSandbox();

describe('Worker', function () {
  let taskPortStubbedInstance: SinonStubbedInstance<worker.MessagePort>;
  let parentPortStubbedInstance: SinonStubbedInstance<worker.MessagePort>;
  let taskProxyCreateStub: SinonStub;
  let taskProxyStubbedInstance: SinonStubbedInstance<TaskProxy>;

  beforeEach(function () {
    taskPortStubbedInstance = createStubInstance(worker.MessagePort);
    parentPortStubbedInstance = createStubInstance(worker.MessagePort);
    taskProxyStubbedInstance = Sinon.createStubInstance(TaskProxy);
    taskProxyCreateStub = Sinon.stub(TaskProxy, 'create').returns(
      (taskProxyStubbedInstance as unknown) as TaskProxy,
    );

    Sinon.stub(worker, 'isMainThread').get(() => false);
    Sinon.stub(worker, 'parentPort').get(() => parentPortStubbedInstance);
  });

  afterEach(function () {
    Sinon.restore();

    /* eslint-disable-next-line */
    delete require.cache[require.resolve('~/worker/worker')];
  });

  describe('Worker initialization', function () {
    it(`Expect to throw ${TaskWorkerInitializationError.name} when module is initialized in main thread`, async function () {
      Sinon.stub(worker, 'isMainThread').get(() => true);

      expect(() => require('~/worker/worker')).to.throw(
        TaskWorkerInitializationError,
        'Worker can not be run in the main thread.',
      );
    });

    it(`Expect to throw ${TaskWorkerInitializationError.name} when module is missing the parent port`, async function () {
      Sinon.stub(worker, 'parentPort').get(() => null);

      expect(() => require('~/worker/worker')).to.throw(
        TaskWorkerInitializationError,
        'Parent port is missing. Could not initialize the task worker.',
      );
    });

    it('Expect to throw when initializing before a finished event', async function () {
      require('~/worker/worker');

      const INIT_DIRECTIVE: WorkerInitDirective = {
        type: WorkerLifecycleDirectiveType.INIT,
        port: (taskPortStubbedInstance as unknown) as worker.MessagePort,
      };

      const init = (): void =>
        parentPortStubbedInstance.on
          .withArgs('message', Sinon.match.func)
          .callArgWith(1, INIT_DIRECTIVE);

      init();
      expect(init).to.throw(WorkerError, 'Worker is already busy');
    });

    it('Expect worker to throw an error if an unknown directive is received', async function () {
      require('~/worker/worker');

      const UNKNOWN_DIRECTIVE = { type: 'unknown' };

      expect(() =>
        parentPortStubbedInstance.on
          .withArgs('message', Sinon.match.func)
          .callArgWith(1, UNKNOWN_DIRECTIVE),
      ).to.throw(WorkerError, 'Unknown directive received');
    });
  });

  describe('Running task', function () {
    const postMessage = (message: any): void =>
      taskPortStubbedInstance.on
        .withArgs('message', Sinon.match.func)
        .callArgWith(/* registered listener */ 1, message);

    beforeEach(function () {
      require('~/worker/worker');

      const INIT_DIRECTIVE: WorkerInitDirective = {
        type: WorkerLifecycleDirectiveType.INIT,
        port: (taskPortStubbedInstance as unknown) as worker.MessagePort,
      };

      parentPortStubbedInstance.on
        .withArgs('message', Sinon.match.func)
        .callArgWith(/* registered listener */ 1, INIT_DIRECTIVE);
    });

    it('Expect task to be run once', function () {
      taskProxyStubbedInstance.run.resolves();

      postMessage(RUN_DIRECTIVE);

      expect(taskProxyStubbedInstance.run).to.be.calledOnce;
    });

    it('Expect a task event to be passed to the message port', function () {
      taskProxyStubbedInstance.run.callsFake(async () =>
        taskProxyCreateStub.firstCall.callArgWith(1, RESULT_EVENT),
      );

      postMessage(RUN_DIRECTIVE);

      expect(taskPortStubbedInstance.postMessage).to.be.calledOnceWith(
        RESULT_EVENT,
      );
    });

    it('Expect task error to be posted as task event', async function () {
      const error = new Error('Test Error');
      taskProxyCreateStub.throws(error);

      postMessage(RUN_DIRECTIVE);

      expect(taskPortStubbedInstance.postMessage).to.be.calledWith({
        eventType: TaskEventType.error,
        error: error,
      });
    });
  });

  describe('Cleanup', function () {
    const FINISHED_EVENT: TaskWorkerFinishedEvent = {
      type: WorkerEventType.FINISHED,
    };

    beforeEach(function () {
      require('~/worker/worker');

      taskProxyStubbedInstance.run.callsFake(async () =>
        taskProxyCreateStub.firstCall.callArgWith(1, RESULT_EVENT),
      );

      const INIT_DIRECTIVE: WorkerInitDirective = {
        type: WorkerLifecycleDirectiveType.INIT,
        port: (taskPortStubbedInstance as unknown) as worker.MessagePort,
      };

      parentPortStubbedInstance.on
        .withArgs('message', Sinon.match.func)
        .callArgWith(/* registered listener */ 1, INIT_DIRECTIVE);

      taskPortStubbedInstance.on
        .withArgs('message', Sinon.match.func)
        .callArgWith(/* registered listener */ 1, RUN_DIRECTIVE);
    });

    it('Expect parent to be notified when task finishes', async function () {
      await awaitResult(() => {
        expect(parentPortStubbedInstance.postMessage).to.be.calledOnceWith(
          FINISHED_EVENT,
        );
      });
    });

    it('Expect worker to allow re-initialization after a finished event', async function () {
      await awaitResult(() => {
        expect(parentPortStubbedInstance.postMessage).to.be.calledOnceWith(
          FINISHED_EVENT,
        );

        const INIT_DIRECTIVE: WorkerInitDirective = {
          type: WorkerLifecycleDirectiveType.INIT,
          port: (taskPortStubbedInstance as unknown) as worker.MessagePort,
        };

        expect(() =>
          parentPortStubbedInstance.on
            .withArgs('message', Sinon.match.func)
            .callArgWith(1, INIT_DIRECTIVE),
        ).to.not.throw();
      });
    });
  });
});
