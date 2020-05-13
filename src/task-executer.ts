import childProcess from 'child_process';
import path from 'path';
import anymatch from 'anymatch';
import _ from 'lodash';
import slash from 'slash';

import * as logger from './logger';

import { Config } from './config/config';
import { TaskConfig } from './config/task';

export default class TaskExecuter {
    private readonly runningTasks: Set<childProcess.ChildProcess>;
    private readonly tasksConfig: Config;
    private stop: boolean;

    constructor(tasksConfig: Config) {
        this.runningTasks = new Set();
        this.tasksConfig = tasksConfig;
        this.stop = true;
    }

    public async executeTasks(filePaths: string[]): Promise<boolean> {
        this.tasksConfig.clear ? logger.clear() : logger.space();
        logger.info('Detected file changes');
        if (!this.stop) {
            logger.warn('Stopping remaining tasks.');
            this.stopTaskRunner();
        }

        this.stop = false;

        const success = await this.iterateOverTasks(filePaths);

        if (success) {
            logger.info('Done');
        }

        this.stop = true;

        return success;
    }

    private static filterPaths(
        filePaths: string[],
        include?: string | string[],
        exclude?: string | string[],
    ): string[] {
        return filePaths
            .filter((pathToFilter) => {
                pathToFilter = slash(pathToFilter);
                let pass = !_.isUndefined(include)
                    ? anymatch(include, pathToFilter)
                    : true;
                pass =
                    !_.isUndefined(exclude) && anymatch(exclude, pathToFilter)
                        ? false
                        : pass;
                return pass;
            })
            .map((filePath) => path.join(process.cwd(), filePath));
    }

    private async iterateOverTasks(filePaths: string[]): Promise<boolean> {
        for (let parallelTask of this.tasksConfig.tasks) {
            if (this.stop) {
                return false;
            }

            if (!_.isArray(parallelTask)) {
                parallelTask = [parallelTask];
            }

            const awaitTasks: Array<Promise<number | null>> = [];
            const taskNames: string[] = [];
            for (const task of parallelTask) {
                const filteredPaths = TaskExecuter.filterPaths(
                    filePaths,
                    task.include,
                    task.exclude,
                );

                if (filteredPaths.length === 0) {
                    continue;
                }

                _.isString(task.name)
                    ? taskNames.push(`Task ${task.name},`)
                    : taskNames.push(`Script ${task.script},`);
                awaitTasks.push(this.forkTask(filePaths, task));
            }

            if (awaitTasks.length === 0) {
                continue;
            }

            logger.info('Running:', ...taskNames);

            try {
                // Await for all promises to finish.
                await Promise.all(awaitTasks);
            } catch (exitCode) {
                if (exitCode === null) {
                    // Task was intentionally killed. Don't throw an error.
                    return false;
                } else {
                    // Task exited with an error.
                    logger.error('Task failed. Terminating remaining tasks.');
                    this.stopTaskRunner();
                    return false;
                }
            }
        }

        return true;
    }

    private async forkTask(
        filteredPaths: string[],
        task: TaskConfig,
    ): Promise<number | null> {
        const isTs = /\.ts$/.test(task.script);
        const execArgv = isTs ? ['-r', 'ts-node/register'] : [];

        const cProcess = childProcess.fork(task.script, filteredPaths, {
            execArgv,
            cwd: process.cwd(),
            silent: false,
        });

        this.runningTasks.add(cProcess);

        return new Promise((resolve, reject) => {
            cProcess.on('close', (exitCode) => {
                this.runningTasks.delete(cProcess);
                exitCode === 0 ? resolve() : reject(exitCode);
            });
        });
    }

    public stopTaskRunner(): void {
        this.stop = true;

        for (const cProcess of this.runningTasks) {
            cProcess.kill('SIGINT');
            this.runningTasks.delete(cProcess);
        }
    }
}
