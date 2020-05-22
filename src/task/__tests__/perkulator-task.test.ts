import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { expect, use } from 'chai';

import { Message } from '../message';
import { EVENT_TYPE_CLOSE, MESSAGE_TYPE_DATA } from '../../constants';

use(sinonChai);

describe('Perkulator task test', function () {
    this.beforeEach(function () {
        process.send = sinon.stub();
        process.connected = true;
    });

    afterEach(function () {
        /* eslint-disable-next-line */
        delete require.cache[require.resolve('../perkulator-task')];
        process.env.PERKULATOR_CHILD_PROCESS = 'true';
    });

    after(function () {
        delete process.env.PERKULATOR_CHILD_PROCESS;
        process.connected && delete process.connected;
        process.send && delete process.send;
    });

    it('Expect to throw when env PERKULATOR_CHILD_PROCESS is not true', function () {
        process.env.PERKULATOR_CHILD_PROCESS = 'false';

        expect(() => require('../perkulator-task')).to.throw(
            Error,
            'Task did not start as child process to Perkulator.',
        );
    });

    it('Expect to throw when IPC connection is missing.', function () {
        process.send = undefined;
        process.connected = false;

        expect(() => require('../perkulator-task')).to.throw(
            Error,
            'Task requires an IPC connection',
        );
    });

    it('Expect to get task object', function () {
        /* eslint-disable-next-line */
        expect(require('../perkulator-task')).to.be.instanceOf(Object);
    });

    it('Expect to get a data object passed from the data event.', function (done) {
        const message: Message = {
            type: 'data',
            data: {
                some: 'data',
            },
        };

        /* eslint-disable-next-line */
        const perkulatorTask = require('../perkulator-task');
        perkulatorTask.on('data', (data: any) => {
            expect(data).to.deep.equal(message.data);
            done();
        });
        process.emit('message' as any, JSON.stringify(message) as any);
    });

    it('Expect an IPC disconnect to fire the close event.', function (done) {
        /* eslint-disable-next-line */
        const perkulatorTask = require('../perkulator-task');
        perkulatorTask.on(EVENT_TYPE_CLOSE, () => {
            done();
        });

        process.emit('disconnect' as any);
    });

    it('Expect to send an init request when the first data listener is registered.', function () {
        /* eslint-disable-next-line */
        const perkulatorTask = require('../perkulator-task');
        perkulatorTask.on('data', () => {});

        expect(process.send).to.have.been.calledWith(
            JSON.stringify({ type: 'init' }),
        );
    });

    it('Expect an error when trying to send on a closed IPC connection', function () {
        /* eslint-disable-next-line */
        const perkulatorTask = require('../perkulator-task');

        process.connected = false;

        expect(() => perkulatorTask.on(MESSAGE_TYPE_DATA, () => {})).to.throw(
            Error,
            'IPC connection is closed.',
        );
    });

    it(`Expect an error when receiving message types that don't emit`, function () {
        /* eslint-disable-next-line */
        const perkulatorTask = require('../perkulator-task');
        const message = {
            types: 'wrong type',
        };

        expect(() =>
            process.emit('message' as any, JSON.stringify(message) as any),
        ).to.throw(Error, 'Unknown data received.');
    });

    it(`Expect only one init request when registering a data handler.`, function () {
        /* eslint-disable-next-line */
        const perkulatorTask = require('../perkulator-task');
        perkulatorTask.on('data', () => {});
        perkulatorTask.on('data', () => {});

        expect(process.send).to.have.been.calledOnce.and.calledWith(
            JSON.stringify({ type: 'init' }),
        );
    });
});
