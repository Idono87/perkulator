import { expect } from 'chai';
import { createSandbox, SinonSpy, SinonStub } from 'sinon';
import chokidar from 'chokidar';
import { EventEmitter } from 'events';

import { createPerkulatorOptions } from '../utils';
import FileWatcher from '~/file-watcher/file-watcher';
import { configureLogger } from '~/loggers/internal';

import type { WatcherOptions } from '~/file-watcher/file-watcher';

const Sinon = createSandbox();

class TestEventEmitter extends EventEmitter {
  public close(): void {}
}

describe('FileWatcher Test', function () {
  let watchStub: SinonStub;
  const watcherEventEmitter = new TestEventEmitter();

  beforeEach(function () {
    configureLogger({ silent: true });
    watchStub = Sinon.stub(chokidar, 'watch');
    watchStub.returns(watcherEventEmitter);
    watcherEventEmitter.close = Sinon.fake();
  });

  afterEach(async function () {
    Sinon.restore();
    watcherEventEmitter.removeAllListeners();
  });

  it('Expect properties to be assigned to watcher', async function () {
    const {
      include,
      exclude,
      ...options
    }: WatcherOptions = createPerkulatorOptions().watcher!;

    FileWatcher.watch({
      onChange: () => {},
      onChangeTimeout: 20,
      include,
      exclude,
      ...options,
    });

    expect(watchStub.args[0][0]).to.deep.equal(include);
    expect(watchStub.args[0][1]).to.deep.equal({
      ignored: exclude,
      ...options,
    });
  });

  it('Expect paths to be added', async function () {
    const fakeTimer = Sinon.useFakeTimers();
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    const fw = FileWatcher.watch({
      onChange: onChangeFake,
      onChangeTimeout: 0,
    });

    watcherEventEmitter.emit('ready');
    watcherEventEmitter.emit('add', path);

    await fakeTimer.tickAsync(100);

    expect(onChangeFake).to.be.calledOnce;
    expect(fw.changedPaths).to.deep.equal({
      add: [path],
      change: [],
      remove: [],
    });
  });

  it('Expect paths to be changed', async function () {
    const fakeTimer = Sinon.useFakeTimers();
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    const fw = FileWatcher.watch({
      onChange: onChangeFake,
      onChangeTimeout: 0,
    });

    watcherEventEmitter.emit('ready');
    watcherEventEmitter.emit('change', path);

    await fakeTimer.tick(100);

    expect(onChangeFake).to.be.calledOnce;
    expect(fw.changedPaths).to.deep.equal({
      add: [],
      change: [path],
      remove: [],
    });
  });

  it('Expect paths to be removed', async function () {
    const fakeTimer = Sinon.useFakeTimers();
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    const fw = FileWatcher.watch({
      onChange: onChangeFake,
      onChangeTimeout: 0,
    });

    watcherEventEmitter.emit('ready');
    watcherEventEmitter.emit('unlink', path);

    await fakeTimer.tick(100);

    expect(onChangeFake).to.be.calledOnce;
    expect(fw.changedPaths).to.deep.equal({
      add: [],
      change: [],
      remove: [path],
    });
  });

  it('Expect to update existing change', async function () {
    const fakeTimer = Sinon.useFakeTimers();
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    const fw = FileWatcher.watch({
      onChange: onChangeFake,
      onChangeTimeout: 10,
    });

    watcherEventEmitter.emit('unlink', path);
    watcherEventEmitter.emit('add', path);

    fakeTimer.tick(200);

    return expect(fw.changedPaths).to.deep.equal({
      add: [path],
      change: [],
      remove: [],
    });
  });

  it('Expect onChange to not be called before timeout', async function () {
    const fakeTimer = Sinon.useFakeTimers();
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout: 100 });

    watcherEventEmitter.emit('ready');
    watcherEventEmitter.emit('change', path);

    fakeTimer.tick(50);
    expect(onChangeFake.calledOnce).to.be.false;

    fakeTimer.tick(100);
    expect(onChangeFake.calledOnce).to.be.true;
  });

  it('Expect onChangeTimeout grace period to be moved for each watcher event', async function () {
    const fakeTimer = Sinon.useFakeTimers();
    const onChangeFake = Sinon.fake();
    const onChangeTimeout = 100;
    FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout });
    watcherEventEmitter.emit('ready');

    // Add event and move the grace period by 10 ms.
    const waitTime = 10;
    const count = 5;
    for (let i = 0; i < count; i++) {
      watcherEventEmitter.emit('add', `/path/${i}`);
      fakeTimer.tick(waitTime);
    }

    // Wait remaining time of onChangeTimeout
    const remainingTimeLeft = onChangeTimeout - waitTime * count;
    fakeTimer.tick(remainingTimeLeft);
    expect(onChangeFake.calledOnce, 'Did not move the grace period').to.be
      .false;

    // Wait remaining expected wait time
    const expectedTimeLeft = onChangeTimeout - remainingTimeLeft + 10;
    fakeTimer.tick(expectedTimeLeft);
    expect(onChangeFake.calledOnce, 'Called before grace period ended').to.be
      .true;
  });

  it('Expect change list to be cleared', async function () {
    const fakeTimer = Sinon.useFakeTimers();
    const onChangeFake = Sinon.fake();
    const onChangeTimeout = 100;
    const fw = FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout });

    for (let i = 0; i < 10; i++) {
      watcherEventEmitter.emit('add', `/path/${i}`);
    }

    fw.clear();

    fakeTimer.tick(200);

    expect(fw.changedPaths).to.deep.equal({
      add: [],
      change: [],
      remove: [],
    });
    expect(onChangeFake).to.not.be.called;
  });

  it('Expect watcher close to be called', async function () {
    const fw = FileWatcher.watch({ onChange: () => {} });
    await fw.close();

    expect((watcherEventEmitter.close as SinonSpy).calledOnce).to.be.true;
  });
});
