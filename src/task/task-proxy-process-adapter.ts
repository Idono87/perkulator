import TaskProxy from '~/task/task-proxy';

import {
  TaskProcessEventType,
  TaskProcessDirective,
} from '~/task/task-runner-process-adapter';
import { TaskEventType } from '~/task/task-runner';

import type {
  TaskProcessEvent,
  TaskProcessDirectiveMessage,
} from '~/task/task-runner-process-adapter';
import type { TaskOptions } from '~/task/task-runner';

/**
 * Handles process related tasks and communication with perkulator.
 *
 * @internal
 */

let taskProxy: TaskProxy | null = null;

/**
 * Handle all incoming messages from perkulator.
 *
 * @param message
 */
function handleDirective(message: TaskProcessDirectiveMessage): void {
  switch (message.directive) {
    case TaskProcessDirective.start:
      create(message.options);
      handleEvent({ eventType: TaskProcessEventType.ready });
      break;
    case TaskProcessDirective.exit:
      taskProxy?.stop();
      exit(0);
      break;
    case TaskProcessDirective.run:
      taskProxy?.run(message.changedPaths);
      break;
    case TaskProcessDirective.stop:
      taskProxy?.stop();
      break;
  }
}

/**
 *
 * Handle all messages to be sent to the main app.
 *
 * @param message
 */
function handleEvent(message: TaskProcessEvent): void {
  if (process.connected && process.send !== undefined) {
    process.send(message);
  } else {
    exit(0);
  }
}

/**
 * Create an instance of the TaskProxy
 *
 * @param options
 */
function create(options: TaskOptions): void {
  taskProxy = TaskProxy.create(options, handleEvent);
}

/**
 * Exit the process
 */
function exit(code: number): void {
  process.exit(code);
}

/**
 * Catch any uncaught exceptions, send them to the main application and quite the child process.
 */
function handleUncaughtException(error: Error): void {
  handleEvent({ eventType: TaskEventType.error, error });
  process.exitCode = 0;
}

process.addListener('message', handleDirective);
process.addListener('uncaughtException', handleUncaughtException);
