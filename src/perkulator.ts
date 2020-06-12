import chokidar from 'chokidar';
import { Stats } from 'fs';
import _ from 'lodash';

import * as logger from './logger';
import TaskExecutor from './task-executor';
import importConfig from './config';

import {
    FP_ADD,
    FP_REMOVE,
    DEFAULT_WATCH_PATH,
    DEFAULT_EXCLUDE,
} from './constants';

import Options from './bin/options';
import Config from './config/config';
import { consolidateArgumentsWithConfig } from './utils';

type UpdateOperation = typeof FP_ADD | typeof FP_REMOVE;

export default class Perkulator {
    private changedFiles: Set<string>;
    private ready: boolean;
    private readonly taskExecutor: TaskExecutor;
    private readonly watcher: chokidar.FSWatcher;

    private constructor(
        watcher: chokidar.FSWatcher,
        taskExecutor: TaskExecutor,
    ) {
        this.changedFiles = new Set();
        this.ready = false;
        this.taskExecutor = taskExecutor;
        this.watcher = watcher;

        // Add listeners
        this.watcher.on('add', this.handleAdd.bind(this));
        this.watcher.on('change', this.handleChange.bind(this));
        this.watcher.on('ready', this.handleReady.bind(this));
        this.watcher.on('unlink', this.handleUnlink.bind(this));
        this.watcher.on('error', this.handleError.bind(this));
    }

    public static create(options: Options = {}): Perkulator {
        const config: Config = importConfig(options.config);

        consolidateArgumentsWithConfig(config, options);

        options.clear && logger.setClear(options.clear);
        options.silent && logger.setSilent(options.silent);
        _.isString(options.logLevel) && logger.setLogLevel(options.logLevel);

        const watchPaths = _.isUndefined(config.include)
            ? DEFAULT_WATCH_PATH
            : config.include;

        const ignorePaths = _.isUndefined(config.exclude)
            ? [DEFAULT_EXCLUDE]
            : config.exclude;

        // Always stat and run atomic.
        const watcher = chokidar.watch(watchPaths, {
            ignored: ignorePaths,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 100,
            },
            alwaysStat: true,
            atomic: true,
        });

        const taskExecutor = new TaskExecutor(
            config.tasks,
            config.defaultGroup,
        );

        return new Perkulator(watcher, taskExecutor);
    }

    private handleChange(path: string, stats: Stats | undefined): void {
        if (stats && stats.isFile()) {
            void this.update([FP_ADD, path]);
        }
    }

    private handleReady(): void {
        this.ready = true;
        void this.update();
    }

    private handleAdd(path: string, stats: Stats | undefined): void {
        if (stats && stats.isFile()) {
            this.watcher.add(path);
            void this.update([FP_ADD, path]);
        }
    }

    private handleUnlink(path: string): void {
        // Garbage docs says to await for unwatch to finish to avoid bugs.
        // Can't find anything in source to warrant that.
        // If any bugs happen try to promisify.
        this.watcher.unwatch(path);
        void this.update([FP_REMOVE, path]);
    }

    handleError(error: Error): void {
        logger.fatal(error);
        void this.stop();
    }

    private async update(
        changedPaths?: [UpdateOperation, string],
    ): Promise<void> {
        logger.clear();
        // Stop all running tasks to avoid race conditions and possibly
        // removing the changed file from the list of files.
        await this.taskExecutor.stopCurrentRun();

        // Skip if theres no changes
        if (!_.isUndefined(changedPaths)) {
            this.ready && logger.clear();
            this.ready && logger.info('Detected file changes');

            const [operation, path] = changedPaths;

            // Add or Remove changed file paths
            if (operation === FP_ADD) {
                this.changedFiles.add(path);
            } else {
                this.changedFiles.delete(path);
            }
        }

        void this.run();
    }

    private async run(): Promise<void> {
        if (!this.ready) {
            return;
        }

        const success = await this.taskExecutor.runTasks(
            Array.from(this.changedFiles),
        );

        success && (this.changedFiles = new Set());
    }

    public async stop(): Promise<void> {
        // Don't allow any more changes
        this.ready = false;

        // Stop everything before exiting
        await this.taskExecutor.stopCurrentRun();

        // Close the watcher
        await this.watcher.close();
    }
}
