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
  PROCESS_READY_EVENT,
  RESULT_EVENT,
  STOP_EVENT,
} from '~/test-utils';
import { TaskProcessDirective } from '~/task/task-runner-process-adapter';
import { STOP_DIRECTIVE } from '~/test-utils/process-directives';

import type { ChangedPaths } from '~/file-watcher/file-watcher';
import type { TaskOptions } from '~/task/task-runner';
import type { TaskProcessDirectiveMessage } from '~/task/task-runner-process-adapter';

use(sinonChai);

const Sinon = createSandbox();

let childProcessFake: ReturnType<typeof createChildProcessFake>;
let fwSpy: SinonSpy;

let perkulator: Perkulator;

const options = createPerkulatorOptions(1);
options.watcher = { include: [getTempPath()] };
options.tasks = [
  { module: __filename },
  { tasks: [{ module: __filename }, { module: __filename }], parallel: true },
];

const START_DIRECTIVE: TaskProcessDirectiveMessage = {
  directive: TaskProcessDirective.start,
  options: options.tasks[0] as TaskOptions,
};

function changedPathsMatcher(changedPaths: ChangedPaths): SinonMatcher {
  return Sinon.match
    .hasNested('directive', TaskProcessDirective.run)
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

    childProcessFake.send.withArgs(START_DIRECTIVE).callsFake(() => {
      setImmediate(() => childProcessFake.emit('message', PROCESS_READY_EVENT));
      return true;
    });

    childProcessFake.send
      .withArgs(changedPathsMatcher(changedPaths))
      .callsFake(() => {
        setImmediate(() => childProcessFake.emit('message', RESULT_EVENT));
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

    childProcessFake.send.withArgs(START_DIRECTIVE).callsFake(() => {
      setImmediate(() => childProcessFake.emit('message', PROCESS_READY_EVENT));
      return true;
    });

    childProcessFake.send.withArgs(STOP_DIRECTIVE).callsFake(() => {
      childProcessFake.emit('message', STOP_EVENT);
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
        setImmediate(() => childProcessFake.emit('message', RESULT_EVENT));
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
    childProcessFake.send.withArgs(START_DIRECTIVE).callsFake(() => {
      setImmediate(() => childProcessFake.emit('message', PROCESS_READY_EVENT));
      return true;
    });

    childProcessFake.send
      .withArgs(Sinon.match.hasNested('directive', TaskProcessDirective.run))
      .callsFake(() => {
        setImmediate(() => childProcessFake.emit('message', RESULT_EVENT));
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
