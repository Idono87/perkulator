import childProcess from 'child_process';
import anymatch from 'anymatch';
import _ from 'lodash';
import slash from 'slash';

import * as logger from './logger';

import { TaskConfig } from './config/task';

export default class TaskExecutor {
    private readonly runningTasks: Set<childProcess.ChildProcess>;
    private currentRun: Promise<null | number> | undefined;

    constructor() {
        this.runningTasks = new Set();
        this.currentRun = undefined;
    }

    public async runTasks(
        filePaths: string[],
        taskList: Array<TaskConfig | TaskConfig[]>,
    ): Promise<boolean> {
        logger.debug('Starting new run.');

        // Schedule a new run.
        this.currentRun = this.scheduleNewRun(filePaths, taskList);

        // Wait for the run to finish
        const exitCode = await this.currentRun;

        // Mark as finished.
        this.currentRun = undefined;

        exitCode === 0 && logger.info('Done');
        if (!_.isNull(exitCode) && exitCode > 0) {
            logger.error('Task failed. Terminating remaining tasks.');
        }

        return exitCode === 0;
    }

    private async scheduleNewRun(
        filePaths: string[],
        taskList: Array<TaskConfig | TaskConfig[]>,
    ): Promise<number | null> {
        // Delay the execution of the tasks until currentRun is set
        // otherwise executors will instantly return with null.
        return new Promise((resolve) => {
            setImmediate(() => {
                const code = this.executeNextTask(
                    filePaths,
                    taskList.entries(),
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

    private static filterPaths(
        filePaths: string[],
        include?: string | string[],
        exclude?: string | string[],
    ): string[] {
        return filePaths.filter((pathToFilter) => {
            // Normalize the paths to contain forward slashes
            // to allow glob comparisons.
            pathToFilter = slash(pathToFilter);

            // Compare with includes.
            let pass = !_.isUndefined(include)
                ? anymatch(include, pathToFilter)
                : true;

            // Compare with excludes.
            pass =
                !_.isUndefined(exclude) && anymatch(exclude, pathToFilter)
                    ? false
                    : pass;
            return pass;
        });
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
        const runningTasks = taskList.map(async (task) => {
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
        const result = await Promise.all(runningTasks);

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

        // Filter paths.
        const filteredPaths = TaskExecutor.filterPaths(
            filePaths,
            task.include,
            task.exclude,
        );

        // Skip if there are no paths left.
        if (filteredPaths.length > 0) {
            // Name the task
            const taskName: string = !_.isUndefined(task.name)
                ? `Task ${task.name}`
                : `Script ${task.script}`;

            logger.info('Running:', taskName);

            return this.createFork(filteredPaths, task);
        }

        logger.debug(`Skipping task. Empty path list.`);

        return 0;
    }

    private async createFork(
        filteredPaths: string[],
        task: TaskConfig,
    ): Promise<number | null> {
        logger.debug(`Creating fork.`);

        // ts or js?
        const isTs = /\.ts$/.test(task.script);
        const execArgv = isTs ? ['-r', 'ts-node/register'] : [];

        // Fork into a child process and inherit the std input output.
        const cProcess = childProcess.fork(task.script, filteredPaths, {
            execArgv,
            cwd: process.cwd(),
            silent: false,
        });

        // Store the process incase it needs to be stopped.
        this.runningTasks.add(cProcess);

        // Listen for close events and resolve once the child process has finished.
        return new Promise((resolve) => {
            cProcess.on('close', (exitCode) => {
                this.runningTasks.delete(cProcess);
                resolve(exitCode);
            });
        });
    }

    private stopTasks(): void {
        logger.debug('Stopping remaining tasks.');

        // Close all running child processes
        for (const cProcess of this.runningTasks) {
            cProcess.kill('SIGINT');
            this.runningTasks.delete(cProcess);
        }
    }
}
