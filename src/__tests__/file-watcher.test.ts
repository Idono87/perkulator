import { expect } from 'chai';
import { createSandbox, SinonSpy, SinonStub } from 'sinon';
import { wait } from './test-utils';

import chokidar, { WatchOptions } from 'chokidar';
import { EventEmitter } from 'events';

import FileWatcher from '~/file-watcher';

const Sinon = createSandbox();

class TestEventEmitter extends EventEmitter {
  public close(): void {}
}

describe('FileWatcher Test', function () {
  let watchStub: SinonStub;
  const watcherEventEmitter = new TestEventEmitter();

  beforeEach(function () {
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

    const paths = ['/paths/to/watch'];

    FileWatcher.watch({
      paths,
      onChange: () => {},
      onChangeTimeout: 20,
      ...options,
    });

    expect(watchStub.args[0][0]).to.deep.equal(paths);
    expect(watchStub.args[0][1]).to.deep.equal(options);
  });

  it('Expect onChange to be called when an add event has been fired', async function () {
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout: 0 });

    watcherEventEmitter.emit('add', path);
    await wait(0);
    const changeList = onChangeFake.args[0][0];
    return expect(changeList).to.deep.equal([path]);
  });

  it('Expect onChange to be called when a change event has been fired', async function () {
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout: 0 });

    watcherEventEmitter.emit('change', path);

    await wait(0);
    const changeList = onChangeFake.args[0][0];
    return expect(changeList).to.deep.equal([path]);
  });

  it('Expect onChange to be called when an unlink event has been fired and there are remaining paths in the change list.', async function () {
    const path = '/fake/path/one';
    const path2 = '/fake/path/two';
    const onChangeFake = Sinon.fake();
    FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout: 10 });

    watcherEventEmitter.emit('add', path);
    watcherEventEmitter.emit('add', path2);
    watcherEventEmitter.emit('unlink', path2);

    // Wait for onChangeTimeout of 10ms to expire.
    await wait(20);
    const changeList = onChangeFake.args[0][0];
    return expect(changeList).to.deep.equal([path]);
  });

  it('Expect onChange to not be called when there are no paths in the change list', async function () {
    const path = '/fake/path';
    const onChangeFake = Sinon.fake();
    FileWatcher.watch({ onChange: onChangeFake, onChangeTimeout: 10 });

    watcherEventEmitter.emit('add', path);
    watcherEventEmitter.emit('unlink', path);

    // Wait for onChangeTimeout of 10ms to expire.
    await wait(20);
    return expect(onChangeFake.calledOnce).to.be.false;
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
    expect(onChangeFake.args[0][0]).to.deep.equal([path]);
  });

  it('Expect watcher close to be called', async function () {
    const fw = FileWatcher.watch({ onChange: () => {} });
    await fw.close();

    expect((watcherEventEmitter.close as SinonSpy).calledOnce).to.be.true;
  });
});
