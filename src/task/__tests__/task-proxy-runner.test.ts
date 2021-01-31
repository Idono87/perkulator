import { expect, use } from 'chai';
import { createSandbox, SinonFakeTimers, SinonStub } from 'sinon';
import ChaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

import TaskProxyRunner from '~/task/task-proxy-runner';
import TaskProxy from '~/task/task-proxy';
import type { ChangedPaths, TaskOptions, TaskResults } from '~/types';
import TaskTerminationTimeoutError from '~/errors/task-termination-timeout-error';
import {
  createChangedPaths,
  createFakePromise,
  resolveFakePromises,
} from '~/test-utils';
import { TaskResultCode } from '../enum-task-result-code';

use(ChaiAsPromised);
use(sinonChai);

let TaskProxyStub: SinonStub;
let taskProxyStubbedMethods: { runTask: SinonStub; stopTask: SinonStub };

const taskResults: TaskResults = {
  resultCode: TaskResultCode.Finished,
};

const changedPaths: ChangedPaths = createChangedPaths();

describe('Task Proxy Runner', function () {
  const Sinon = createSandbox();

  beforeEach(function () {
    taskProxyStubbedMethods = Sinon.createStubInstance(TaskProxy);

    TaskProxyStub = Sinon.stub(TaskProxy, 'create').returns(
      (taskProxyStubbedMethods as unknown) as TaskProxy,
    );
  });

  afterEach(function () {
    Sinon.restore();
  });

  it('Expect to successfully create a task runner object', function () {
    const path = __filename;
    const options: TaskOptions = {
      module: path,
    };

    TaskProxyRunner.create(options);
    expect(TaskProxyStub).to.be.calledWith(path, {});
  });

  it('Expect task to be run and finish execution', async function () {
    taskProxyStubbedMethods.runTask.resolves(taskResults);

    const path = __filename;
    const options: TaskOptions = {
      module: path,
    };
    const task = TaskProxyRunner.create(options);

    await expect(task.run(changedPaths)).to.be.fulfilled;
    expect(taskProxyStubbedMethods.runTask).to.be.calledOnceWith(changedPaths);
  });

  describe('Task termination tests', function () {
    let timer: SinonFakeTimers;

    beforeEach(() => {
      timer = Sinon.useFakeTimers();
    });

    afterEach(() => {
      timer.restore();
      resolveFakePromises();
    });

    it('Expect task to be stopped', async function () {
      let res: any;

      taskProxyStubbedMethods.runTask.callsFake(
        async (): Promise<void> => {
          await new Promise((resolve, reject) => {
            res = resolve;
          });
        },
      );

      taskProxyStubbedMethods.stopTask.callsFake(() => {
        res();
        return true;
      });

      const path = __filename;
      const options: TaskOptions = {
        module: path,
      };
      const task = TaskProxyRunner.create(options);
      const promise = task.run(changedPaths);

      await expect(task.stop()).to.be.fulfilled;
      return expect(promise).to.be.fulfilled;
    });

    it(`Expect to throw ${TaskTerminationTimeoutError.name} when pending stop request doesn't resolve before the timeout.`, function () {
      taskProxyStubbedMethods.runTask.returns(createFakePromise());
      taskProxyStubbedMethods.stopTask.returns(createFakePromise());

      const path = __filename;
      const options: TaskOptions = {
        module: path,
      };
      const task = TaskProxyRunner.create(options);
      void task.run(changedPaths);

      void timer.nextAsync();
      return expect(task.stop()).to.be.rejectedWith(
        TaskTerminationTimeoutError,
      );
    });

    it(`Expect to throw ${TaskTerminationTimeoutError.name} when pending task run doesn't terminate before the timeout`, function () {
      taskProxyStubbedMethods.runTask.returns(createFakePromise());
      taskProxyStubbedMethods.stopTask.returns(Promise.resolve());

      const path = __filename;
      const options: TaskOptions = {
        module: path,
      };
      const task = TaskProxyRunner.create(options);
      void task.run(changedPaths);

      void timer.nextAsync();
      return expect(task.stop()).to.be.rejectedWith(
        TaskTerminationTimeoutError,
      );
    });
  });
});