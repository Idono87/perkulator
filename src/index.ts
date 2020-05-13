import chokidar from 'chokidar';
import fs from 'fs';
import _ from 'lodash';

import * as logger from './logger';
import { importConfig } from './config/config-parser';
import TaskExecuter from './task-executer';

import { Config } from './config/config';

export default class Perkulator {
    private changedFiles: Set<string>;
    private ready: boolean;
    private readonly taskRunner: TaskExecuter;
    private readonly config: Config;
    private readonly watcher: chokidar.FSWatcher;

    private constructor(watcher: chokidar.FSWatcher, config: Config) {
        this.config = config;
        this.changedFiles = new Set();
        this.ready = false;
        this.taskRunner = new TaskExecuter(this.config);
        this.watcher = watcher;

        this.watcher.on('add', this.handleAdd);
        this.watcher.on('change', this.handleChange);
        this.watcher.on('ready', this.handleReady);
        this.watcher.on('unlink', this.handleUnlink);
        this.watcher.on('error', this.handleError);
    }

    private readonly handleChange = (path: string, stats: fs.Stats): void => {
        if (stats && stats.isFile()) {
            this.changedFiles.add(path);
            void this.runTasks();
        }
    };

    private readonly handleReady = (): void => {
        this.ready = true;
        void this.runTasks();
    };

    private readonly handleAdd = (path: string, stats: fs.Stats): void => {
        if (stats && stats.isFile()) {
            this.watcher.add(path);
            this.changedFiles.add(path);
            void this.runTasks();
        }
    };

    private readonly handleUnlink = (path: string): void => {
        this.taskRunner.stopTaskRunner();

        // Garbage docs says to await for unwatch to finish to avoid bugs.
        // Can't find anything in source to warrant that.
        // If any bugs happen try to promisify.
        this.watcher.unwatch(path);
        this.changedFiles.delete(path);
        void this.runTasks();
    };

    readonly handleError = (error: Error): void => {
        logger.fatal(error);
        //  Quite the app if an error has occured.
        void this.exit(1);
    };

    public static run(options?: Partial<Config>): Perkulator {
        let config = importConfig(process.env.PERKULATOR_CONFIG_PATH);
        options && (config = Object.assign({}, config, options));

        const watchPaths = _.isUndefined(config.include)
            ? './'
            : config.include;

        const ignorePaths = ['**/node_modules'].concat(
            !_.isUndefined(config.exclude) ? config.exclude : [],
        );

        const watcher = chokidar.watch(watchPaths, {
            ignored: ignorePaths,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 100,
            },
            alwaysStat: true,
            atomic: true,
        });

        return new Perkulator(watcher, config);
    }

    private readonly runTasks = async (): Promise<void> => {
        if (!this.ready) {
            return;
        }

        const success = await this.taskRunner.executeTasks(
            Array.from(this.changedFiles),
        );

        success && (this.changedFiles = new Set());
    };

    private readonly exit = async (exitCode: number): Promise<void> => {
        this.ready = false;
        this.taskRunner.stopTaskRunner();
        await this.watcher.close();
        process.exit(exitCode);
    };
}
