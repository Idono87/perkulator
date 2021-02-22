import subprocess, { ChildProcess } from 'child_process';

import { TaskEventType, TaskProcessEventType } from './enum-task-event-type';
import { TaskDirective, TaskProcessDirective } from './enum-task-directive';
import DeferredTimeout from '~/utils/deferred-timeout';
import UnexpectedTaskTerminationError from '~/errors/unexpected-task-termination-error';

import type { TaskEventListener } from '~/task/task-manager';
import type { ChangedPaths } from '~/file-watcher/file-watcher';
import type { TaskOptions, TaskEvent } from '~/task/task-runner';

type TRunnerProcessAdapter = TaskEventListener<TaskEvent>;

/**
 * Messages sent from the task child process to the task process adapter
 */

export type TaskProcessEvent =
  | {
      eventType: TaskProcessEventType.ready;
    }
  | TaskEvent;

/**
 * Directives sent from the application to the task
 */

export type TaskProcessDirectiveMessage =
  | {
      directive: TaskProcessDirective.exit;
    }
  | {
      directive: TaskProcessDirective.start;
      options: TaskOptions;
    }
  | {
      directive: TaskDirective.run;
      changedPaths: ChangedPaths;
    }
  | {
      directive: TaskDirective.stop;
    };

const TERMINATION_TIMEOUT = 10000;
const PROXY_PATH = './task-proxy-process-adapter.ts';

/**
 * Creates and communicates with the task running as a child process.
 *
 * @internal
 */
export default class TaskRunnerProcessAdapter {
  /** Task options reference */
  private readonly options: TaskOptions;

  /** Running task process */
  private childProcess?: ChildProcess;

  /** Registered message listener */
  private readonly runnerEventListener: TRunnerProcessAdapter;

  /** Used when starting the child process */
  private _handleReady?: () => void;

  /** Pending exit timeout timer. */
  private pendingExitTimeout?: DeferredTimeout<void>;

  public constructor(
    options: TaskOptions,
    runnerEventListener: TRunnerProcessAdapter,
  ) {
    this.options = options;
    this.runnerEventListener = runnerEventListener;
  }

  public static create(
    options: TaskOptions,
    runnerEventListener: TRunnerProcessAdapter,
  ): TaskRunnerProcessAdapter {
    return new TaskRunnerProcessAdapter(options, runnerEventListener);
  }

  /**
   * Run the task
   */
  public async run(changedPaths: ChangedPaths): Promise<void> {
    if (this.childProcess === undefined) {
      await this.startChildProcess();
    }

    const message: TaskProcessDirectiveMessage = {
      directive: TaskDirective.run,
      changedPaths: changedPaths,
    };

    this.childProcess?.send(message);
  }

  /**
   * Stop the running task
   */
  public stop(): void {
    const message: TaskProcessDirectiveMessage = {
      directive: TaskDirective.stop,
    };

    this.childProcess?.send(message);
  }

  /**
   * Handle incoming task messages and redistribute them to the task runner.
   *
   * @param message
   */
  private handleMessage(message: TaskProcessEvent): void {
    switch (message.eventType) {
      case TaskEventType.result:
      case TaskEventType.stop:
        if (this.options.persistent === false) {
          this.exitChildProcess().finally(() =>
            this.runnerEventListener(message),
          );
          return;
        }
        break;

      case TaskProcessEventType.ready:
        this._handleReady?.();
        return;
    }

    this.runnerEventListener(message);
  }

  /**
   * Exit the child process. Killed if child
   * process doesn't exit within a set time
   */
  private async exitChildProcess(): Promise<void> {
    if (
      this.childProcess?.exitCode === null &&
      this.childProcess?.signalCode === null
    ) {
      this.pendingExitTimeout = new DeferredTimeout(
        undefined,
        TERMINATION_TIMEOUT,
      );

      this.childProcess.disconnect();

      try {
        await this.pendingExitTimeout;
      } catch (err) {
        this.childProcess.kill('SIGKILL');
      }
    }
  }

  /**
   * Handle all exit conditions.
   */
  private handleExit(): void {
    this.childProcess = undefined;

    if (this.pendingExitTimeout !== undefined) {
      this.pendingExitTimeout.stop();
      this.pendingExitTimeout = undefined;
    } else {
      this.handleMessage({
        eventType: TaskEventType.error,
        error: new UnexpectedTaskTerminationError(this.options.module),
      });
    }
  }

  /**
   * Star the child process
   */
  private async startChildProcess(): Promise<void> {
    this.childProcess = subprocess.fork(require.resolve(PROXY_PATH), [], {
      cwd: process.cwd(),
      silent: true,
    });

    const directive: TaskProcessDirectiveMessage = {
      directive: TaskProcessDirective.start,
      options: this.options,
    };

    this.childProcess.on('message', this.handleMessage.bind(this));
    this.childProcess.on('exit', this.handleExit.bind(this));
    this.childProcess.send(directive);

    return await new Promise((resolve) => {
      this._handleReady = resolve;
    });
  }
}
