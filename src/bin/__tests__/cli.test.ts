import { expect } from 'chai';

describe('Cli input', function () {
    const args = process.argv;

    afterEach(function () {
        /* eslint-disable-next-line */
        delete require.cache[require.resolve('../cli')];
        /* eslint-disable-next-line */
        delete require.cache[require.resolve('commander')];
        process.argv = args;
    });

    it('Expect config object to match cli input.', function () {
        process.argv = [
            '',
            '',
            '--silent',
            '--clear',
            '--log-level',
            'info',
            '--config',
            'config',
        ];

        const program = require('../cli').default();

        expect(program.silent, 'Silent').to.be.true;
        expect(program.clear, 'Clear').to.be.true;
        expect(program.logLevel, 'Log Level').to.equal('info');
        expect(program.config, 'Config').to.equal('config');
    });

    it('Expect config object to have empty lists when no arguments are passed', function () {
        process.argv = ['', ''];

        const program = require('../cli').default();

        expect(program.silent).to.be.undefined;
        expect(program.clear).to.be.undefined;
        expect(program.logLevel).to.be.undefined;
        expect(program.config).to.be.undefined;
    });
});
