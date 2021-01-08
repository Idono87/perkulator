import { expect, use } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import ChaiAsPromised from 'chai-as-promised';

import Task from '~/task/task';
import type { TaskOptions } from '~/types';
import TaskModuleNotFoundError from '~/errors/task-module-not-found-error';
import InvalidRunnableTaskError from '~/errors/invalid-runnable-task-error';
import TaskTerminationTimeoutError from '~/errors/task-termination-timeout-error';
import MissingInterfaceError from '~/errors/missing-interface-error';

use(ChaiAsPromised);

export let runTask: SinonStub | undefined;
export let stopTask: SinonStub | undefined;

describe('Task', function () {
  const Sinon = createSandbox();

  after(function () {
    Sinon.restore();
  });

  it('Expect to successfully create a task object', function () {
    runTask = Sinon.stub();
    stopTask = Sinon.stub();

    const path = __filename;
    const options: TaskOptions = {
      path,
    };

    expect(Task.createTask(options)).to.be.instanceOf(Task);
  });

  it('Expect task to be run and finish execution', function () {
    runTask = Sinon.stub().resolves();
    stopTask = Sinon.stub();

    const path = __filename;
    const options: TaskOptions = {
      path,
    };
    const task = Task.createTask(options);

    return expect(task.run()).to.be.fulfilled;
  });

  it('Expect task to be stopped', async function () {
    let res: any;

    runTask = Sinon.stub().callsFake(
      async (): Promise<void> => {
        await new Promise((resolve, reject) => {
          res = resolve;
        });
      },
    );

    stopTask = Sinon.stub().callsFake(() => {
      res();
      return true;
    });

    const path = __filename;
    const options: TaskOptions = {
      path,
    };
    const task = Task.createTask(options);
    const promise = task.run();

    await expect(task.stop()).to.be.fulfilled;
    return expect(promise).to.be.fulfilled;
  });

  it(`Expect run to throw a "${TaskModuleNotFoundError.name}" if module doesn't exist`, function () {
    const path = './not/a/real/module';
    const options: TaskOptions = {
      path,
    };

    expect(() => Task.createTask(options)).to.throw(TaskModuleNotFoundError);
  });

  it(`Expect run to throw a "${InvalidRunnableTaskError.name}" if modules doesn't implement RunnableTask interface`, function () {
    runTask = undefined;
    stopTask = undefined;

    const path = __filename;
    const options: TaskOptions = {
      path,
    };

    expect(() => Task.createTask(options)).to.throw(InvalidRunnableTaskError);
  });

  it(`Expect to throw ${TaskTerminationTimeoutError.name} when task termination times out.
  Unresolved "stopTask"`, function () {
    runTask = Sinon.stub().returns(
      new Promise<void>((resolve, reject) => {
        setTimeout(resolve, 10000);
      }),
    );

    stopTask = Sinon.stub().returns(
      new Promise<void>((resolve, reject) => {
        setTimeout(resolve, 10000);
      }),
    );

    const path = __filename;
    const options: TaskOptions = {
      path,
    };
    const task = Task.createTask(options);
    void task.run();
    return expect(task.stop()).to.be.rejectedWith(TaskTerminationTimeoutError);
  });

  it(`Expect to throw ${TaskTerminationTimeoutError.name} when task termination times out. 
  Unresolved "runTask"`, function () {
    runTask = Sinon.stub().returns(
      new Promise<void>((resolve, reject) => {
        setTimeout(resolve, 10000);
      }),
    );

    stopTask = Sinon.stub().returns(Promise.resolve());

    const path = __filename;
    const options: TaskOptions = {
      path,
    };
    const task = Task.createTask(options);
    void task.run();
    return expect(task.stop()).to.be.rejectedWith(TaskTerminationTimeoutError);
  });

  it(`Expect to throw ${MissingInterfaceError.name} when interface function "stopTask" isn't implemented`, function () {
    runTask = Sinon.stub().returns(
      new Promise<void>((resolve, reject) => {
        setTimeout(resolve, 10000);
      }),
    );

    stopTask = undefined;

    const path = __filename;
    const options: TaskOptions = {
      path,
    };
    const task = Task.createTask(options);
    void task.run();
    return expect(task.stop()).to.be.rejectedWith(MissingInterfaceError);
  });
});
