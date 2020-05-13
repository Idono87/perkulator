import { program } from 'commander';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';

import { Config } from '../config/config';
import Perkulator from '../index';
import { TaskConfig } from '../config/task';

process.env.PERKULATOR_CONFIG_PATH = '.perkulatorrc.json';

const config: Partial<Config> = {};

program
    .arguments(`[include...]`)
    .usage(
        `[options] [include...]\n\nWatch files by passing glob strings as arguments. Overrides configuration file. Defaults to cwd.`,
    )
    .action((paths: string | undefined) => {
        !_.isEmpty(paths) && (config.include = paths);
        run();
    });

program.option(
    `-e, --exclude <path>`,
    `Exclude paths from being watched.`,

    (path) => {
        !_.isArray(config.exclude) && (config.exclude = []);
        config.exclude.push(path);
    },
);

program.option(
    `-s, --script <path>`,
    `Add a script task to run.\n\r`,

    (value: string) => {
        const isExtJs = /.*?\.js$/.test(value);
        if (!isExtJs) {
            throw new Error(`"${value}" has to end with ".js"`);
        }
        const isReal = fs.existsSync(path.join(process.cwd(), value));
        if (!isReal) {
            throw new Error(`"${value}" is not a valid path.`);
        }

        const task: TaskConfig = {
            script: value,
        };

        !_.isArray(config.tasks) && (config.tasks = []);
        config.tasks.push(task);
    },
);

program.option(
    `-c, --config <path>`,
    'Set custom config.\n\r',
    (configPath: string) => {
        process.env.PERKULATOR_CONFIG_PATH = configPath;
    },
);

program.option('-C, --clear', 'Clear console for each file change.');

const run = (): void => {
    program.clear === true && (config.clear = program.clear);

    Perkulator.run(config);
};

program.parse();
