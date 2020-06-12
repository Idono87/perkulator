import { expect } from 'chai';

import coerceConfigObject from '../coerce-config';

describe('Coerce Root Config', function () {
    it('Expect groups to be coerced.', function () {
        const config = {
            groups: {
                testGroup: ['group 1', 'group 2', 'group 3', 'group 3'],
            },
        };

        expect(coerceConfigObject(config)).to.deep.equal({
            groups: new Map(Object.entries(config.groups)),
        });
    });

    describe('Expect defaultGroup to be coerced into a list for tasks to run.', function () {
        it('Single string', function () {
            const config = {
                defaultGroup: 'group1',
                groups: {
                    group1: ['task1', 'task2'],
                },
            };

            expect(coerceConfigObject(config))
                .to.to.have.property('defaultGroup')
                .and.have.keys(...config.groups.group1);
        });

        it('List of string', function () {
            const config = {
                defaultGroup: ['group1', 'group2'],
                groups: {
                    group1: ['task1', 'task2'],
                    group2: ['task3', 'task4'],
                },
            };

            expect(coerceConfigObject(config))
                .to.have.property('defaultGroup')
                .and.have.keys(
                    config.groups.group1.concat(config.groups.group2),
                );
        });
    });
});
