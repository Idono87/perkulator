import subprocess, { ChildProcess } from 'child_process';

import { TaskEventType, TaskProcessEventType } from './enum-task-event-type';
import { TaskDirective, TaskProcessDirective } from './enum-task-directive';
import DeferredTimeout from '~/utils/deferred-timeout';

import type {
  ChangedPaths,
  TaskDirectiveMessage,
  TaskProcessDirectiveMessage,
  TaskOptions,
  TaskProcessEvent,
  RunnerMessageListener,
} from '~/types';

const TERMINATION_TIMEOUT = 10000;

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
  private readonly runnerMessageListener: RunnerMessageListener;

  /** Used when starting the child process */
  private _handleReady?: () => void;

  /** Pending exit timeout timer. */
  private pendingExitTimeout?: DeferredTimeout<void>;

  public constructor(
    options: TaskOptions,
    runnerMessageListener: RunnerMessageListener,
  ) {
    this.options = options;
    this.runnerMessageListener = runnerMessageListener;
  }

  public static create(
    options: TaskOptions,
    taskRunner: RunnerMessageListener,
  ): TaskRunnerProcessAdapter {
    return new TaskRunnerProcessAdapter(options, taskRunner);
  }

  /**
   * Run the task
   */
  public async run(changedPaths: ChangedPaths): Promise<void> {
    if (this.childProcess === undefined) {
      await this.startChildProcess();
    }

    const message: TaskDirectiveMessage = {
      directive: TaskDirective.run,
      changedPaths: changedPaths,
    };

    this.childProcess?.send(message);
  }

  /**
   * Stop the running task
   */
  public stop(): void {
    const message: TaskDirectiveMessage = {
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
        this.exitChildProcess().finally(() =>
          this.runnerMessageListener.handleMessage(message),
        );
        return;

      case TaskProcessEventType.ready:
        this._handleReady?.();
        return;
    }

    this.runnerMessageListener.handleMessage(message);
  }

  /**
   * Exit the child process. Killed if child
   * process doesn't exit within a reasonable time
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

      this.childProcess = undefined;
    }
  }

  private handleExit(): void {
    this.pendingExitTimeout?.stop();
    this.pendingExitTimeout = undefined;
  }

  /**
   * Star the child process
   */
  private async startChildProcess(): Promise<void> {
    this.childProcess = subprocess.fork('./', [], {
      cwd: process.cwd(),
      silent: true,
    });

    const directive: TaskProcessDirectiveMessage = {
      directive: TaskProcessDirective.start,
    };

    this.childProcess.on('message', this.handleMessage.bind(this));
    this.childProcess.on('exit', this.handleExit.bind(this));
    this.childProcess.send(directive);

    return await new Promise((resolve) => {
      this._handleReady = resolve;
    });
  }
}
