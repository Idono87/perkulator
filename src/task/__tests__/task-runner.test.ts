import { expect, use } from 'chai';
import { createSandbox, SinonStubbedInstance } from 'sinon';
import ChaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

import TaskRunner from '~/task/task-runner';
import TaskProxyRunner from '~/task/task-proxy-runner';
import type { ChangedPaths, TaskOptions, TaskResults } from '~/types';
import { TaskResultCode } from '../enum-task-result-code';

use(ChaiAsPromised);
use(sinonChai);

let taskProxyRunnerStub: SinonStubbedInstance<TaskProxyRunner>;

const taskResults: TaskResults = {
  resultCode: TaskResultCode.Finished,
};

describe('Task Runner', function () {
  const Sinon = createSandbox();

  beforeEach(function () {
    taskProxyRunnerStub = Sinon.createStubInstance(TaskProxyRunner);
    taskProxyRunnerStub.run.resolves(taskResults);
    Sinon.stub(TaskProxyRunner, 'create').returns(
      (taskProxyRunnerStub as unknown) as TaskProxyRunner,
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

    it(`Expect runnable task to be called with included paths`, async function () {
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

      await task.run(changedPaths);
      expect(taskProxyRunnerStub.run).to.be.calledOnceWith(expectedPaths);
    });

    it(`Expect runnable task to be called without excluded paths`, async function () {
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

      await task.run(changedPaths);
      expect(taskProxyRunnerStub.run).to.be.calledOnceWith(expectedPaths);
    });

    it(`Expect runnable task to not be called when there are no paths`, async function () {
      const options: TaskOptions = {
        module: __filename,
        exclude: [includePath, excludePath],
      };
      const task = TaskRunner.createTask(options);

      await expect(task.run(changedPaths)).to.eventually.have.property(
        'resultCode',
        TaskResultCode.Skipped,
      );
      expect(taskProxyRunnerStub.run).to.not.be.called;
    });
  });
});
