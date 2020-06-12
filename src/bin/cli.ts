import { program } from 'commander';

program.usage(`[options] \n\n`);

program.option(`-c, --config <path>`, 'Set custom config.\n\r');

program.option('-C, --clear', 'Clear output every new run.');

program.option('-S, --silent', 'Silence output.');

program.option(
    '-L, --log-level <level>',
    'Set log level. [verbose, debug, info, warn, error, fatal]',
);

program.option(
    '-g, --group <name>',
    'Set the group to run.',
    (groupName: string, groupSet: Set<string>) => groupSet.add(groupName),
    new Set(),
);

export default (): typeof program => {
    program.parse();
    return program;
};
