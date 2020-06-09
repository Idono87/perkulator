import { ChildProcess, fork, spawn } from 'child_process';
import _ from 'lodash';
import anymatch from 'anymatch';
import slash from 'slash';
import path from 'path';

import * as logger from '../logger';
import TaskLogger from './task-logger';
import { ConfigError } from '../errors/config-error';
import { MESSAGE_TYPE_INIT, MESSAGE_TYPE_DATA } from '../constants';

import { TaskConfig, TaskRunnerConfig, TaskExecConfig } from './task';
import { Message } from './message';

export default class TaskRunner {
    private childProcess: ChildProcess | undefined;
    private readonly paths: string[];
    private readonly config: TaskConfig;

    public constructor(config: TaskConfig, paths: string[]) {
        this.config = config;
        this.paths = filterPaths(paths, config.include, config.exclude);
    }

    // Sends a sigint to the task child process.
    public stop(): void {
        this.childProcess && this.childProcess.kill('SIGINT');
    }

    // Run the task.
    public async run(): Promise<number | null> {
        // Skip the task run?
        if (this.paths.length === 0 && !this.config.alwaysRun) return 0;

        const taskName: string = !_.isUndefined(this.config.name)
            ? `task ${this.config.name}`
            : 'task';

        logger.info('Running', taskName);

        // Create an empty args list if there are no existing args.
        const args = this.config.args ? this.config.args : [];

        // Fork the task if it's a script or a runner.
        if (!_.isUndefined(this.config.runner)) {
            this.childProcess = this.forkTask(
                this.config as TaskRunnerConfig,
                args,
            );
        } else if (!_.isUndefined(this.config.exec)) {
            // Spawn process if it's an exec.
            this.childProcess = this.spawnTask(
                this.config as TaskExecConfig,
                args,
            );
        } else {
            throw new ConfigError(
                'Could not launch task. Missing execution properties "exec" or "runner"',
            );
        }

        // Attach to a task logger.
        void new TaskLogger(
            this.childProcess.stdout,
            this.childProcess.stderr,
            this.config.delayLog,
        );

        this.childProcess.on('message', this.handleMessage.bind(this));

        // Bind the promise to the close listener.
        return new Promise((resolve) => {
            this.childProcess?.on('close', (exitCode) => {
                resolve(exitCode);
            });
        });
    }

    private forkTask(config: TaskRunnerConfig, args: string[]): ChildProcess {
        logger.debug(`Forking task`);

        // Resolve the path to the script file.
        const runnerPath = path.resolve(config.runner);

        // ts or js?
        const isTs = /\.ts$/.test(runnerPath);
        const execArgv = isTs ? ['-r', 'ts-node/register'] : [];

        return fork(runnerPath, args.concat(this.paths), {
            env: getEnv(),
            execArgv,
            stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
        });
    }

    private spawnTask(config: TaskExecConfig, args: string[]): ChildProcess {
        logger.debug('Spawning task');

        // Concat the changed path names to end of args if the skipPaths flag
        // isn't set or is false.
        !this.config.skipPaths && (args = args.concat(this.paths));

        return spawn(config.exec, args, {
            cwd: process.cwd(),
            env: getEnv(),
            stdio: ['inherit', 'pipe', 'pipe'],
        });
    }

    private handleMessage(msg: string): void {
        const message: Message = JSON.parse(msg);

        // Send the paths to the task after receiving an init message.
        if (message.type === MESSAGE_TYPE_INIT) {
            const dataMessage: Message = {
                type: MESSAGE_TYPE_DATA,
                data: {
                    paths: this.paths,
                    options: this.config.options,
                },
            };

            this.childProcess?.send(JSON.stringify(dataMessage));
        }
    }
}

const getEnv = (): NodeJS.ProcessEnv => {
    return Object.assign({}, process.env, {
        FORCE_COLOR: '2',
        PERKULATOR_CHILD_PROCESS: 'true',
    });
};

const filterPaths = (
    filePaths: string[],
    include?: string | string[],
    exclude?: string | string[],
): string[] => {
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
};
