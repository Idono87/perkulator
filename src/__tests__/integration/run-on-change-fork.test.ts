import { expect, use } from 'chai';
import { createSandbox, SinonMatcher, SinonSpy } from 'sinon';
import sinonChai from 'sinon-chai';
import subprocess, { ChildProcess } from 'child_process';

import Perkulator from '~/perkulator';
import FileWatcher from '~/file-watcher/file-watcher';
import {
  createPerkulatorOptions,
  createChildProcessFake,
  getTempPath,
  generateFakeFiles,
  deleteAllFakeFiles,
  awaitResult,
} from '~/test-utils';
import {
  TaskDirective,
  TaskProcessDirective,
} from '~/task/enum-task-directive';
import {
  TaskEventType,
  TaskProcessEventType,
} from '~/task/enum-task-event-type';

import type {
  TaskProcessEvent,
  TaskProcessDirectiveMessage,
} from '~/task/task-runner-process-adapter';
import type { ChangedPaths } from '~/file-watcher/file-watcher';
import type { TaskOptions, TaskEvent } from '~/task/task-runner';

use(sinonChai);

const Sinon = createSandbox();

let childProcessFake: ReturnType<typeof createChildProcessFake>;
let fwSpy: SinonSpy;

let perkulator: Perkulator;

const options = createPerkulatorOptions(1);
options.watcher = { include: [getTempPath()] };
options.tasks = [{ module: __filename }];

const startDirective: TaskProcessDirectiveMessage = {
  directive: TaskProcessDirective.start,
  options: options.tasks[0] as TaskOptions,
};

const stopDirective: TaskProcessDirectiveMessage = {
  directive: TaskDirective.stop,
};

const readyEvent: TaskProcessEvent = {
  eventType: TaskProcessEventType.ready,
};

const resultEvent: TaskEvent = {
  eventType: TaskEventType.result,
  result: {},
};

const stopEvent: TaskEvent = {
  eventType: TaskEventType.stop,
};

function changedPathsMatcher(changedPaths: ChangedPaths): SinonMatcher {
  return Sinon.match
    .hasNested('directive', TaskDirective.run)
    .and(
      Sinon.match.hasNested(
        'changedPaths.add',
        Sinon.match.array.contains(changedPaths.add),
      ),
    )
    .and(
      Sinon.match.hasNested(
        'changedPaths.change',
        Sinon.match.array.contains(changedPaths.change),
      ),
    )
    .and(
      Sinon.match.hasNested(
        'changedPaths.remove',
        Sinon.match.array.contains(changedPaths.remove),
      ),
    );
}

describe('Perkulator integration tests forked', function () {
  beforeEach(function () {
    childProcessFake = createChildProcessFake();
    Sinon.stub(subprocess, 'fork').returns(
      (childProcessFake as unknown) as ChildProcess,
    );
    fwSpy = Sinon.spy(FileWatcher.prototype, 'clear');
  });

  afterEach(async function () {
    Sinon.restore();
    await perkulator.close();
    deleteAllFakeFiles();
  });

  it('Expect tasks to finish and clear the change list', async function () {
    const changedPaths: ChangedPaths = {
      add: [...generateFakeFiles()],
      change: [],
      remove: [],
    };

    childProcessFake.send.withArgs(startDirective).callsFake(() => {
      setImmediate(() => childProcessFake.emit('message', readyEvent));
      return true;
    });

    childProcessFake.send
      .withArgs(changedPathsMatcher(changedPaths))
      .callsFake(() => {
        setImmediate(() => childProcessFake.emit('message', resultEvent));
        return true;
      });

    childProcessFake.disconnect.callsFake(() => {
      childProcessFake.emit('exit');
    });

    perkulator = Perkulator.watch(options);

    await awaitResult(function () {
      expect(fwSpy).to.be.calledOnce;
    });
  });

  it('Expect a running task to be terminated when new changes occurs', async function () {
    const initChangedPaths: ChangedPaths = {
      add: [...generateFakeFiles(10)],
      change: [],
      remove: [],
    };

    const expectedChangedPaths: ChangedPaths = {
      add: initChangedPaths.add.slice(5),
      change: [],
      remove: [],
    };

    childProcessFake.send.withArgs(startDirective).callsFake(() => {
      setImmediate(() => childProcessFake.emit('message', readyEvent));
      return true;
    });

    childProcessFake.send.withArgs(stopDirective).callsFake(() => {
      childProcessFake.emit('message', stopEvent);
      return true;
    });

    childProcessFake.send
      .withArgs(changedPathsMatcher(initChangedPaths))
      .callsFake(() => {
        setImmediate(() => {
          expectedChangedPaths.change = [...generateFakeFiles(5)];
        });
        return true;
      });

    childProcessFake.send
      .withArgs(changedPathsMatcher(expectedChangedPaths))
      .callsFake(() => {
        setImmediate(() => childProcessFake.emit('message', resultEvent));
        return true;
      });

    childProcessFake.disconnect.callsFake(() => {
      childProcessFake.emit('exit');
    });

    perkulator = Perkulator.watch(options);

    await awaitResult(function () {
      expect(fwSpy).to.be.calledOnce;
    });
  });

  it('Expect a failed task to not clear the path list', async function () {
    childProcessFake.send.withArgs(startDirective).callsFake(() => {
      setImmediate(() => childProcessFake.emit('message', readyEvent));
      return true;
    });

    childProcessFake.send
      .withArgs(Sinon.match.hasNested('directive', TaskDirective.run))
      .callsFake(() => {
        setImmediate(() => childProcessFake.emit('message', resultEvent));
        return true;
      });

    childProcessFake.disconnect.callsFake(() => {
      childProcessFake.emit('exit');
    });

    perkulator = Perkulator.watch(options);

    await awaitResult(function () {
      expect(fwSpy).to.not.be.calledOnce;
    });
  });
});
