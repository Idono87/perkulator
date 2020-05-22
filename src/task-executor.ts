import _ from 'lodash';

import * as logger from './logger';
import TaskRunner from './task/task-runner';

import { TaskConfig } from './task/task';

export default class TaskExecutor {
    private runningTasks: Set<TaskRunner>;
    private currentRun: Promise<null | number> | undefined;
    private readonly taskList: Array<TaskConfig | TaskConfig[]>;

    public constructor(taskList: Array<TaskConfig | TaskConfig[]>) {
        this.runningTasks = new Set();
        this.currentRun = undefined;
        this.taskList = taskList;
    }

    public async runTasks(filePaths: string[]): Promise<boolean> {
        logger.debug('Starting new run.');

        // Schedule a new run.
        this.currentRun = this.scheduleNewRun(filePaths);

        // Wait for the run to finish
        const exitCode = await this.currentRun;

        // Mark as finished.
        this.currentRun = undefined;

        exitCode === 0 && logger.info('Done');
        if (!_.isNull(exitCode) && exitCode > 0) {
            logger.error('Task failed. Terminating remaining tasks.');
        }

        this.runningTasks = new Set();
        return exitCode === 0;
    }

    private async scheduleNewRun(filePaths: string[]): Promise<number | null> {
        // Delay the execution of the tasks until currentRun is set
        // otherwise executors will instantly return with null.
        return new Promise((resolve) => {
            setImmediate(() => {
                const code = this.executeNextTask(
                    filePaths,
                    this.taskList.entries(),
                );

                resolve(code);
            });
        });
    }

    public async stopCurrentRun(): Promise<void> {
        // If a run is active stop it.
        if (!_.isUndefined(this.currentRun)) {
            logger.debug('Stopping current run.');

            // Move reference and set the current run to undefined to
            // Stop any other tasks from executing when stopping tasks.
            const terminatingRun = this.currentRun;
            this.currentRun = undefined;

            // Stop all running tasks and wait for the terminated run to
            // exit.
            this.stopTasks();
            await terminatingRun;
        }
    }

    private async executeNextTask(
        filePaths: string[],
        tasksIterator: IterableIterator<[number, TaskConfig | TaskConfig[]]>,
    ): Promise<null | number> {
        const iteratorValue = tasksIterator.next();

        if (iteratorValue.done) {
            logger.debug('Tasks Done');
            return 0;
        }

        // Extract task from iterator object.
        const task = iteratorValue.value[1];
        let exitCode: number | null = 0;

        if (_.isArray(task)) {
            exitCode = await this.executeParallelTasks(filePaths, task);
        } else {
            exitCode = await this.executeSingleTask(filePaths, task);
        }

        !_.isNull(exitCode) &&
            exitCode > 0 &&
            logger.debug(`Task exited with an error. Stopping current run.`);

        return exitCode === 0
            ? this.executeNextTask(filePaths, tasksIterator)
            : exitCode;
    }

    private async executeParallelTasks(
        filePaths: string[],
        taskList: TaskConfig[],
    ): Promise<null | number> {
        logger.debug(`Executing parallel tasks.`);
        // Execute each task in parallel
        const parallelTasks = taskList.map(async (task) => {
            const exitCode = await this.executeSingleTask(filePaths, task);

            // If a task is terminated with an error the terminate all other tasks
            if (!_.isNull(exitCode) && exitCode > 0) {
                logger.debug(
                    `Error detected on parallel run. Stopping all remaining tasks.`,
                );
                this.stopTasks();
            }

            return exitCode;
        });

        // Wait for tasks to end
        const result = await Promise.all(parallelTasks);

        // Find exit codes
        const isNull = result.some((exitCode) => _.isNull(exitCode));
        const errorIndex = result.findIndex(
            (exitCode) => !_.isNull(exitCode) && exitCode > 0,
        );

        if (errorIndex > -1) return result[errorIndex]; // Return the first occurring error code.
        if (isNull) return null; // Return null
        return 0; // Normal exit.
    }

    private async executeSingleTask(
        filePaths: string[],
        task: TaskConfig,
    ): Promise<null | number> {
        // If the current run is not listed then prevent any more executions
        if (_.isUndefined(this.currentRun)) {
            logger.debug(`Stopped. Preventing task from running.`);
            return null;
        }

        // Create an run a task runner.
        const runner = new TaskRunner(task, filePaths);
        this.runningTasks.add(runner);
        return runner.run();
    }

    private stopTasks(): void {
        logger.debug('Stopping remaining tasks.');

        // Close all running child processes
        for (const runner of this.runningTasks) {
            runner.stop();
        }
    }
}
