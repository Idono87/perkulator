import sinon from 'sinon';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import fs from 'fs';

import Perkulator from '../../index';

use(chaiAsPromised);

describe('Default Start Command', function () {
    let perkulatorStub: sinon.SinonStub;
    let existSyncStub: sinon.SinonStub;

    const defaultArgs = process.argv;

    before(function () {
        perkulatorStub = sinon.stub(Perkulator, 'create');
        existSyncStub = sinon.stub(fs, 'existsSync');
    });

    afterEach(function () {
        perkulatorStub.resetHistory();
        existSyncStub.resetBehavior();

        process.argv = defaultArgs;

        /* eslint-disable */
        delete require.cache[require.resolve('../perkulator')];
        delete require.cache[require.resolve('commander')];
        /* eslint-enable */
    });

    after(function () {
        perkulatorStub.restore();
        existSyncStub.restore();
    });

    it('run without any arguments or options', function () {
        const args: string[] = [process.argv[0], process.argv[1]];

        process.argv = args;

        require('../perkulator');

        expect(perkulatorStub.args[0][0]).to.deep.equal({});
    });

    it('run with a list of includes', function () {
        const args: string[] = [
            process.argv[0],
            process.argv[1],
            'test',
            'includes',
        ];

        process.argv = args;

        require('../perkulator');

        expect(perkulatorStub.args[0][0]).to.deep.equal({
            include: ['test', 'includes'],
        });
    });

    it('run with a list of excludes', function () {
        const args: string[] = [
            process.argv[0],
            process.argv[1],
            '-e',
            'test',
            '--exclude=excludePath',
        ];

        process.argv = args;

        require('../perkulator');

        expect(perkulatorStub.args[0][0]).to.deep.equal({
            exclude: ['test', 'excludePath'],
        });
    });

    it('run with a list of tasks', function () {
        const args: string[] = [
            process.argv[0],
            process.argv[1],
            '-s',
            'testScript1.js',
            `--script=testScript2.js`,
        ];
        process.argv = args;
        existSyncStub.returns(true);

        require('../perkulator');

        expect(perkulatorStub.args[0][0]).to.deep.equal({
            tasks: [{ script: 'testScript1.js' }, { script: 'testScript2.js' }],
        });
    });

    it('run with custom config', function () {
        const args: string[] = [
            process.argv[0],
            process.argv[1],
            '--config=customConfig.json',
        ];
        process.argv = args;
        existSyncStub.returns(true);

        require('../perkulator');

        expect(perkulatorStub.args[0][1]).to.equal('customConfig.json');
    });

    it('run with all arguments and options.', function () {
        const args: string[] = [
            process.argv[0],
            process.argv[1],
            '--silence',
            '--log-level=info',
            '-s',
            'testScript1.js',
            `--script=testScript2.js`,
            '-e',
            'test',
            '--exclude=excludePath',
            'test',
            'includes',
        ];
        process.argv = args;
        existSyncStub.returns(true);

        require('../perkulator');

        expect(perkulatorStub.args[0][0]).to.deep.equal({
            include: ['test', 'includes'],
            exclude: ['test', 'excludePath'],
            tasks: [{ script: 'testScript1.js' }, { script: 'testScript2.js' }],
        });
    });

    it(`throw when task script isn't a js file`, function () {
        const args: string[] = [
            process.argv[0],
            process.argv[1],
            '-s',
            'testScript1.ts',
        ];
        process.argv = args;
        existSyncStub.returns(true);

        expect(() => {
            require('../perkulator');
        }).to.throw(Error);
    });

    it('run with silence', function () {
        const args: string[] = [process.argv[0], process.argv[1], '--silence'];
        process.argv = args;

        require('../perkulator');

        expect(process.env.PERKULATOR_CLEAR_OUTPUT).to.equal('true');
    });

    it('run with log-level', function () {
        const args: string[] = [
            process.argv[0],
            process.argv[1],
            '--log-level=verbose',
        ];
        process.argv = args;

        require('../perkulator');

        expect(process.env.PERKULATOR_LOG_LEVEL).to.equal('verbose');
    });

    it('throw with invalid log-level', function () {
        const args: string[] = [
            process.argv[0],
            process.argv[1],
            '--log-level=notValid',
        ];
        process.argv = args;

        expect(() => require('../perkulator')).to.throw(
            Error,
            'Invalid log level.',
        );
    });

    it(`throw when task script doesn't exist`, function () {
        const args: string[] = [
            process.argv[0],
            process.argv[1],
            '-s',
            'testScript1.js',
        ];
        process.argv = args;
        existSyncStub.returns(false);

        expect(() => {
            require('../perkulator');
        }).to.throw(Error);
    });
});
