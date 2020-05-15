import chokidar from 'chokidar';
import { Stats } from 'fs';
import _ from 'lodash';

import * as logger from './logger';
import importConfig from './config';
import TaskExecutor from './task-executor';

import {
    FP_ADD,
    FP_REMOVE,
    DEFAULT_WATCH_PATH,
    DEFAULT_EXCLUDE,
} from './constants';

import { Config } from './config/config';

type UpdateOperation = typeof FP_ADD | typeof FP_REMOVE;

export default class Perkulator {
    private changedFiles: Set<string>;
    private ready: boolean;
    private readonly taskRunner: TaskExecutor;
    private readonly watcher: chokidar.FSWatcher;
    private readonly config: Config;

    private constructor(watcher: chokidar.FSWatcher, config: Config) {
        this.changedFiles = new Set();
        this.ready = false;
        this.taskRunner = new TaskExecutor();
        this.watcher = watcher;
        this.config = config;

        // Add listeners
        this.watcher.on('add', this.handleAdd.bind(this));
        this.watcher.on('change', this.handleChange.bind(this));
        this.watcher.on('ready', this.handleReady.bind(this));
        this.watcher.on('unlink', this.handleUnlink.bind(this));
        this.watcher.on('error', this.handleError.bind(this));
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
        void this.exit(1);
    }

    private async update(
        changedPaths?: [UpdateOperation, string],
    ): Promise<void> {
        logger.clear();
        // Stop all running tasks to avoid race conditions and possibly
        // removing the changed file from the list of files.
        await this.taskRunner.stopCurrentRun();

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

    public static create(
        options: Partial<Config>,
        confPath?: string,
    ): Perkulator {
        const config = importConfig(options, confPath);

        const watchPaths = _.isUndefined(config.include)
            ? DEFAULT_WATCH_PATH
            : config.include;

        const ignorePaths = [DEFAULT_EXCLUDE].concat(
            !_.isUndefined(config.exclude) ? config.exclude : [],
        );

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

        return new Perkulator(watcher, config);
    }

    private async run(): Promise<void> {
        if (!this.ready) {
            return;
        }

        const success = await this.taskRunner.runTasks(
            Array.from(this.changedFiles),
            this.config.tasks,
        );

        success && (this.changedFiles = new Set());
    }

    private async exit(exitCode?: number): Promise<void> {
        _.isUndefined(exitCode) && (exitCode = 0);

        // Don't allow any more changes
        this.ready = false;

        // Stop everything before exiting
        void this.taskRunner.stopCurrentRun();

        // Close the watcher
        await this.watcher.close();

        process.exit(exitCode);
    }
}
