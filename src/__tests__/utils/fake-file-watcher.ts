import chokidar, { FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { createSandbox } from 'sinon';

const Sinon = createSandbox();

export function restoreFSWatcher(): void {
  Sinon.restore();
}

export function replaceFSWatcherWithFake(): FSWatcher {
  const fake = (new EventEmitter() as unknown) as FSWatcher;
  Sinon.stub(chokidar, 'watch').returns(fake);

  return fake;
}
