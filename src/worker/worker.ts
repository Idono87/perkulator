import { isMainThread, parentPort } from 'worker_threads';

import TaskWorkerInitializationError from '~/errors/task-worker-initialization-error';
import TaskWorkerError from '~/errors/task-worker-error';
import TaskProxy from '~/task/task-proxy';
import { ChangedPaths } from '~/file-watcher/file-watcher';
import { TaskWorkerDirectiveType, TaskWorkerEventType } from './worker-pool';
import { TaskEventType } from '~/task/task-runner';

import type { TaskEvent, TaskOptions } from '~/task/task-runner';
import type {
  TaskWorkerDirective,
  TaskWorkerFinishedEvent,
  TaskWorkerErrorEvent,
} from './worker-pool';

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
parentPort.on('message', (directive: TaskWorkerDirective) => {
  if (directive.type === TaskWorkerDirectiveType.RUN) {
    if (runningTask !== null) {
      const errorEvent: TaskWorkerErrorEvent = {
        type: TaskWorkerEventType.ERROR,
        error: new TaskWorkerError(
          'Unexpected run directive. Task is already running',
        ),
      };

      parentPort?.postMessage(errorEvent);

      return;
    }

    // There should be no unexpected errors from the run function.
    /* eslint-disable-next-line no-void */
    void run(directive.taskOptions, directive.changedPaths, directive.port);
  } else if (
    directive.type === TaskWorkerDirectiveType.STOP &&
    runningTask !== null
  ) {
  }
});

/* Terminate worker if the message port between the parent and worker has been closed */
parentPort.on('close', () => {
  process.exit(0);
});

async function run(
  taskOptions: TaskOptions,
  changedPaths: ChangedPaths,
  port: MessagePort,
): Promise<void> {
  try {
    const handleEvent = (event: TaskEvent): void =>
      handleTaskEvent(event, port);

    runningTask = TaskProxy.create(taskOptions, handleEvent);
    await runningTask.run(changedPaths);
  } catch (error) {
    const errorEvent: TaskEvent = {
      eventType: TaskEventType.error,
      error,
    };

    port.postMessage(errorEvent);
  }

  const finishedEvent: TaskWorkerFinishedEvent = {
    type: TaskWorkerEventType.FINISHED,
  };

  runningTask = null;
  parentPort?.postMessage(finishedEvent);
}

function handleTaskEvent(event: TaskEvent, port: MessagePort): void {
  port.postMessage(event);
}
