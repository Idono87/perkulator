#!/usr/bin/env node
import { Command } from 'commander';

import * as pkg from '../../package.json';
import Perkulator from '~/perkulator';
import validateOptions from '~/config/validation';
import ValidationError from '~/errors/validation-error';
import CLIValidationError from '~/errors/cli-validation-error';
import { logger } from '~/loggers/internal';
import { RunCommandOptions } from './types';
import { PerkulatorOptions } from '~/types';

/**
 * Start perkulator
 *
 * @param options
 *
 * @internal
 */
function runCommand(paths: string[], cliOptions: RunCommandOptions): void {
  const options: PerkulatorOptions = { paths, ...cliOptions };

  try {
    validateOptions(options);
  } catch (e) {
    let err = e;
    if (e instanceof ValidationError) {
      err = new CLIValidationError(e.property, e.expected, e.actual);
    }

    throw err;
  }

  Perkulator.watch(options);
}

/**
 * Run the CLI
 *
 * @param argv
 */
export function runCli(argv?: string[]): void {
  const program = new Command();
  program.storeOptionsAsProperties(false).passCommandToAction(false);

  program.version(pkg.version);

  program
    .arguments('[paths...]')
    .description('Run perkulator', {
      path: 'A list of paths to watch. Defaults to "./"',
    })
    .action(runCommand);

  try {
    program.parse(argv);
  } catch (e) {
    logger.log('error', e);
  }
}

if (process.env.NODE_ENV !== 'test') {
  runCli();
}
