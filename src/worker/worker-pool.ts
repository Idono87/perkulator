import { MessageChannel, Worker, MessagePort } from 'worker_threads';
import WorkerError from '../errors/worker-error';

import WorkerTask from '../worker/worker-task';

/* Expand typings for Worker class to attach 
a WorkerTask object during it's run. */
declare module 'worker_threads' {
  interface Worker {
    [WORKER_TASK_KEY]?: WorkerTask;
  }
}

export interface WorkerPoolOptions {
  poolSize?: number;
}

export const enum WorkerLifecycleDirectiveType {
  INIT = 'init',
}

export interface WorkerInitDirective {
  type: WorkerLifecycleDirectiveType.INIT;
  port: MessagePort;
}

export const enum WorkerEventType {
  FINISHED = 'finished',
}

export interface TaskWorkerFinishedEvent {
  type: WorkerEventType.FINISHED;
}

const WORKER_TASK_KEY = Symbol('workerTask');
export const RUN_WORKER_TASK_KEY = Symbol('runWorkerTask');
export const EMIT_WORKER_TASK_ERROR_KEY = Symbol('emitWorkerTaskError');

export default class WorkerPool {
  private readonly workerSet: Set<Worker> = new Set();
  private readonly idleWorkerList: Worker[] = [];
  private readonly queuedWorkerTaskList: WorkerTask[] = [];
  private isTerminating: boolean = false;

  public constructor(poolSize: number) {
    while (this.workerSet.size < poolSize) {
      this.createWorker();
    }
  }

  public runTask(workerTask: WorkerTask): void {
    const worker = this.idleWorkerList.shift();

    if (worker === undefined) {
      this.queuedWorkerTaskList.push(workerTask);
      return;
    }

    const messageChannel = new MessageChannel();

    const directive: WorkerInitDirective = {
      type: WorkerLifecycleDirectiveType.INIT,
      port: messageChannel.port1,
    };
    worker.postMessage(directive, [messageChannel.port1]);

    worker[WORKER_TASK_KEY] = workerTask;

    workerTask[RUN_WORKER_TASK_KEY](messageChannel.port2);
  }

  public async terminateAllWorkers(): Promise<void> {
    const pendingTermination: Array<Promise<number>> = [];

    this.isTerminating = true;
    this.workerSet.forEach((worker) => {
      pendingTermination.push(worker.terminate());
    });
    await Promise.all(pendingTermination);
  }

  private createWorker(): void {
    const worker = new Worker(require.resolve(`./worker`));
    this.workerSet.add(worker);
    this.idleWorkerList.push(worker);

    worker.on('error', () => {
      // TODO: Log errors related to worker status
    });

    worker.on('exit', () => {
      if (!this.isTerminating) this.handleWorkerExit(worker);
    });

    worker.on('message', (event: TaskWorkerFinishedEvent) => {
      this.handleWorkerEvent(event, worker);
    });
  }

  private deQueueWorkerTask(): void {
    const workerTask = this.queuedWorkerTaskList.shift();

    if (workerTask !== undefined) {
      this.runTask(workerTask);
    }
  }

  private handleWorkerEvent(
    event: TaskWorkerFinishedEvent,
    worker: Worker,
  ): void {
    if (event.type === WorkerEventType.FINISHED) {
      // TODO: Log finished event
      worker[WORKER_TASK_KEY] = undefined;
      this.idleWorkerList.push(worker);
      this.deQueueWorkerTask();
    }
    // TODO: Log unknown messages
  }

  private handleWorkerExit(worker: Worker): void {
    // TODO: Log
    const index = this.idleWorkerList.findIndex(
      (idleWorker) => idleWorker === worker,
    );
    this.idleWorkerList.splice(index, index + 1);
    this.workerSet.delete(worker);

    worker[WORKER_TASK_KEY]?.[EMIT_WORKER_TASK_ERROR_KEY](
      new WorkerError('Unexpected worker failure. Failed to run task.'),
    );

    this.createWorker();
  }
}
