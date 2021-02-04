import TaskProxy from '~/task/task-proxy';

import { TaskDirective, TaskProcessDirective } from './enum-task-directive';
import { TaskEventType, TaskProcessEventType } from './enum-task-event-type';

import type {
  TaskProcessDirectiveMessage,
  TaskOptions,
  TaskProcessEvent,
} from '~/types';

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
      handleMessage({ eventType: TaskProcessEventType.ready });
      break;
    case TaskProcessDirective.exit:
      taskProxy?.stop();
      exit(0);
      break;
    case TaskDirective.run:
      taskProxy?.run(message.changedPaths);
      break;
    case TaskDirective.stop:
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
function handleMessage(message: TaskProcessEvent): void {
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
  taskProxy = TaskProxy.create(options, { handleMessage });
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
  handleMessage({ eventType: TaskEventType.error, error });
  process.exitCode = 0;
}

process.addListener('message', handleDirective);
process.addListener('uncaughtException', handleUncaughtException);
