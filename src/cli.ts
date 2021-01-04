import { program } from 'commander';

import * as pkg from '../package.json';
import Perkulator from '~/perkulator';

program.storeOptionsAsProperties(false).passCommandToAction(false);

program.version(pkg.version);

/**
 * Start perkulator
 *
 * @param options
 *
 * @internal
 */
function run(paths: string[], options: any): void {
  Perkulator.watch({ paths });
}

/**
 * Default command. Run Perkulator.
 *
 * @internal
 */
program
  .arguments('[path...]')
  .description('Run perkulator', {
    path: 'A list of paths to watch. Defaults to "./"',
  })
  .action(run);

program.parse();
