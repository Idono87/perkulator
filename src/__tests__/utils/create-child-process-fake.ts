import Sinon, { SinonStub } from 'sinon';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

class FakeChildProcess extends EventEmitter {
  public connected = true;
  public exitCode = null;
  public pid = 1999;
  public signalCode = null;
  public spawnargs = [];
  public spawnfile = __filename;
  public stdin = null;
  public stdout = null;
  public stderr = null;
  public channel = null;
  public stdio = [null, null, null, null, null] as ChildProcess['stdio'];
  public killed = false;

  public kill: SinonStub<
    Parameters<ChildProcess['kill']>,
    ReturnType<ChildProcess['kill']>
  >;

  public disconnect: SinonStub<
    Parameters<ChildProcess['disconnect']>,
    ReturnType<ChildProcess['disconnect']>
  >;

  public send: SinonStub<
    Parameters<ChildProcess['send']>,
    ReturnType<ChildProcess['send']>
  >;

  public unref: SinonStub<
    Parameters<ChildProcess['unref']>,
    ReturnType<ChildProcess['unref']>
  >;

  public ref: SinonStub<
    Parameters<ChildProcess['ref']>,
    ReturnType<ChildProcess['ref']>
  >;

  public constructor() {
    super();
    this.kill = Sinon.stub();
    this.disconnect = Sinon.stub();
    this.send = Sinon.stub();
    this.unref = Sinon.stub();
    this.ref = Sinon.stub();
  }
}

/**
 * Creates an entire child process fake.
 */
export function createChildProcessFake(): FakeChildProcess {
  return new FakeChildProcess();
}
