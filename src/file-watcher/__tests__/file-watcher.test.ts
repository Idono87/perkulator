import { expect } from 'chai';
import { createSandbox, SinonSpy, SinonStub } from 'sinon';
import { wait } from '../../__tests__/utils';

import chokidar, { WatchOptions } from 'chokidar';
import { EventEmitter } from 'events';

import FileWatcher from '~/file-watcher';
import { configureLogger } from '~/loggers/internal';

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
    const options: WatchOptions = {
      depth: 5,
    };

    const include = ['/paths/to/watch'];

    FileWatcher.watch({
      include,
      onChange: () => {},
      onChangeTimeout: 20,
      ...options,
    });

    expect(watchStub.args[0][0]).to.deep.equal(include);
    expect(watchStub.args[0][1]).to.deep.equal(options);
  });

  it('Expect onChange to be called when an add event has been fired', async function () {
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout: 0 });

    watcherEventEmitter.emit('add', path);
    await wait(0);
    const changeList = onChangeFake.args[0][0];
    return expect(changeList).to.deep.equal({
      add: [path],
      change: [],
      remove: [],
    });
  });

  it('Expect onChange to be called when a change event has been fired', async function () {
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout: 0 });

    watcherEventEmitter.emit('change', path);

    await wait(0);
    const changeList = onChangeFake.args[0][0];
    return expect(changeList).to.deep.equal({
      add: [],
      change: [path],
      remove: [],
    });
  });

  it('Expect onChange to be called when an unlink even has been fired', async function () {
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout: 10 });

    watcherEventEmitter.emit('unlink', path);

    // Wait for onChangeTimeout of 10ms to expire.
    await wait(20);
    const changeList = onChangeFake.args[0][0];
    return expect(changeList).to.deep.equal({
      add: [],
      change: [],
      remove: [path],
    });
  });

  it('Expect existing tracked change to be updated', async function () {
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout: 10 });

    watcherEventEmitter.emit('unlink', path);
    watcherEventEmitter.emit('add', path);

    // Wait for onChangeTimeout of 10ms to expire.
    await wait(20);
    const changeList = onChangeFake.args[0][0];
    return expect(changeList).to.deep.equal({
      add: [path],
      change: [],
      remove: [],
    });
  });

  it('Expect onChange to not be called before timeout', async function () {
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout: 100 });

    watcherEventEmitter.emit('change', path);

    await wait(0);
    expect(onChangeFake.calledOnce).to.be.false;

    await wait(100);
    expect(onChangeFake.calledOnce).to.be.true;
  });

  it('Expect onChangeTimeout grace period to be moved for each watcher event', async function () {
    const onChangeFake = Sinon.fake();
    const onChangeTimeout = 100;
    FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout });

    // Add event and move the grace period by 10 ms.
    const waitTime = 10;
    const count = 5;
    for (let i = 0; i < count; i++) {
      watcherEventEmitter.emit('add', `/path/${i}`);
      await wait(waitTime);
    }

    // Wait remaining time of onChangeTimeout
    const remainingTimeLeft = onChangeTimeout - waitTime * count;
    await wait(remainingTimeLeft);
    expect(onChangeFake.calledOnce, 'Did not move the grace period').to.be
      .false;

    // Wait remaining expected wait time
    const expectedTimeLeft = onChangeTimeout - remainingTimeLeft + 10;
    await wait(expectedTimeLeft);
    expect(onChangeFake.calledOnce, 'Called before grace period ended').to.be
      .true;
  });

  it('Expect change list to be cleared', async function () {
    const onChangeFake = Sinon.fake();
    const onChangeTimeout = 100;
    const fw = FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout });

    for (let i = 0; i < 10; i++) {
      watcherEventEmitter.emit('add', `/path/${i}`);
    }

    fw.clear();

    await wait(onChangeTimeout + 10);
    expect(onChangeFake.calledOnce).to.be.false;

    const path = '/fake/path';
    watcherEventEmitter.emit('add', path);

    await wait(onChangeTimeout + 10);
    expect(onChangeFake.args[0][0]).to.deep.equal({
      add: [path],
      change: [],
      remove: [],
    });
  });

  it('Expect watcher close to be called', async function () {
    const fw = FileWatcher.watch({ onChange: () => {} });
    await fw.close();

    expect((watcherEventEmitter.close as SinonSpy).calledOnce).to.be.true;
  });
});
