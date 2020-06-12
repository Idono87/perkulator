#!/usr/bin/env node
import Perkulator from '../perkulator';
import cli from './cli';

import Options from './options';

const cliOptions = cli();

const options: Options = {
    clear: cliOptions.clear,
    silent: cliOptions.silent,
    logLevel: cliOptions.logLevel,
    config: cliOptions.config,
    group: cliOptions.group.size > 0 ? cliOptions.group : undefined,
};

const perkulator = Perkulator.create(options);

process.on('unhandledRejection', (err) => {
    console.log(err);
    void (async () => {
        await perkulator.stop();
        process.exit(2);
    })();
});
