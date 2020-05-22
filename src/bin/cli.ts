import { program } from 'commander';

program.usage(`[options] \n\n`);

program.option(`-c, --config <path>`, 'Set custom config.\n\r');

program.option('-C, --clear', 'Clear output every new run.');

program.option('-S, --silent', 'Silence output.');

program.option(
    '-L, --log-level <level>',
    'Set log level. [verbose, debug, info, warn, error, fatal]',
);

export default (): typeof program => {
    program.parse();
    return program;
};
