#!/usr/bin/env node
import { Command } from 'commander';

import Perkulator from '../perkulator';
import { importConfig } from '../config/config';
import { logger } from '../logger';

/**
 * Start perkulator
 *
 * @param options
 *
 * @internal
 */
function runCommand(configPath: string): void {
  const options = importConfig(configPath);
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

  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  program.version(require('../../package.json').version);

  program
    .arguments('[config]')
    .description('Run perkulator', {
      config: 'Optionally specify location of configuration file.',
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
