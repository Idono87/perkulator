import { isMainThread, parentPort, MessagePort } from 'worker_threads';

import TaskWorkerInitializationError from '~/errors/task-worker-initialization-error';
import WorkerError from '~/errors/worker-error';
import TaskProxy from '~/task/task-proxy';
import {
  WorkerEventType,
  WorkerInitDirective,
  WorkerLifecycleDirectiveType,
} from './worker-pool';
import { TaskDirectiveType } from './worker-task';
import { TaskEventType } from '~/task/task-runner';

import type { ChangedPaths } from '~/file-watcher/file-watcher';
import type { TaskEvent, TaskOptions } from '~/task/task-runner';
import type { TaskWorkerFinishedEvent } from './worker-pool';
import type { TaskDirective } from './worker-task';

let attachedPort: MessagePort | null = null;
let runningTask: TaskProxy | null = null;

if (isMainThread) {
  throw new TaskWorkerInitializationError(
    'Worker can not be run in the main thread.',
  );
}

if (parentPort === null) {
  throw new TaskWorkerInitializationError(
    'Parent port is missing. Could not initialize the task worker.',
  );
}

/* Handle all messages sent from the worker pool */
parentPort.on('message', (directive: WorkerInitDirective) => {
  if (directive.type === WorkerLifecycleDirectiveType.INIT) {
    initializeRun(directive.port);
  } else {
    throw new WorkerError('Unknown directive received');
  }
});

/* Terminate worker if the message port between the parent and worker has been closed */
parentPort.on('close', () => {
  process.exit(0);
});

function initializeRun(port: MessagePort): void {
  if (attachedPort !== null) {
    throw new WorkerError('Worker is already busy');
  }

  attachedPort = port;
  attachedPort.on('message', handleTaskDirective);
}

/* Cleanup the worker and post a finished event to the parent */
function finishRun(): void {
  attachedPort?.removeAllListeners();
  attachedPort = null;
  runningTask = null;

  const finishedEvent: TaskWorkerFinishedEvent = {
    type: WorkerEventType.FINISHED,
  };
  parentPort?.postMessage(finishedEvent);
}

function handleTaskDirective(directive: TaskDirective): void {
  if (directive.type === TaskDirectiveType.RUN) {
    // All errors are handled within the run function
    /* eslint-disable-next-line no-void */
    void run(directive.taskOptions, directive.changedPaths);
  } else if (directive.type === TaskDirectiveType.STOP) {
    runningTask?.stop();
  }
}

async function run(
  taskOptions: TaskOptions,
  changedPaths: ChangedPaths,
): Promise<void> {
  try {
    runningTask = TaskProxy.create(taskOptions, handleTaskEvent);
    await runningTask.run(changedPaths);
  } catch (error) {
    const errorEvent: TaskEvent = {
      eventType: TaskEventType.error,
      error,
    };

    handleTaskEvent(errorEvent);
  }

  finishRun();
}

function handleTaskEvent(event: TaskEvent): void {
  attachedPort?.postMessage(event);
}
