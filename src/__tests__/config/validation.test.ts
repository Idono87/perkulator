import { expect } from 'chai';

import validateOptions from '~/config/validation';
import ValidationError from '~/errors/validation-error';
import { createPerkulatorOptions, createTaskOptions } from '~/__tests__/utils';

import type { PerkulatorOptions } from '~/perkulator';

describe('Configuration Validation', function () {
  it('Expect to pass', function () {
    const options: PerkulatorOptions = createPerkulatorOptions();

    expect(() => validateOptions(options)).to.not.throw(ValidationError);
  });

  describe('watcher', function () {
    it('Expect to fail when not an object', function () {
      const options: PerkulatorOptions = createPerkulatorOptions();
      options.watcher = [] as any;

      expect(() => validateOptions(options)).to.throw(ValidationError);
    });

    describe('include', function () {
      it(`Expect to fail when "include" is not an array`, function () {
        const options: PerkulatorOptions = createPerkulatorOptions();
        options.watcher!.include = {} as any;

        expect(() => validateOptions(options)).to.throw(ValidationError);
      });

      it(`Expect to fail when "include" has non string value`, function () {
        const options: PerkulatorOptions = createPerkulatorOptions();
        options.watcher!.include?.push({} as any);

        expect(() => validateOptions(options)).to.throw(ValidationError);
      });
    });

    describe('exclude', function () {
      it(`Expect to fail when "exclude" is not an array`, function () {
        const options: PerkulatorOptions = createPerkulatorOptions();
        options.watcher!.exclude = {} as any;

        expect(() => validateOptions(options)).to.throw(ValidationError);
      });

      it(`Expect to fail when "exclude" has non string value`, function () {
        const options: PerkulatorOptions = createPerkulatorOptions();
        options.watcher!.exclude?.push({} as any);

        expect(() => validateOptions(options)).to.throw(ValidationError);
      });
    });
  });

  describe('tasks', function () {
    it('Expect to fail when not an array', function () {
      const options: PerkulatorOptions = createPerkulatorOptions();
      options.tasks = {} as any;

      expect(() => validateOptions(options)).to.throw(ValidationError);
    });

    it(`Expect to fail when values are not an object`, function () {
      const options: PerkulatorOptions = createPerkulatorOptions();
      options.tasks = [[] as any];

      expect(() => validateOptions(options)).to.throw(ValidationError);
    });

    it(`Expect to fail when object is not a TaskObject or TaskGroupObject`, function () {
      const options: PerkulatorOptions = createPerkulatorOptions();
      options.tasks = [{} as any];

      expect(() => validateOptions(options)).to.throw(ValidationError);
    });

    describe('TaskObject', function () {
      it(`Expect to fail when "module" is not a string`, function () {
        const options: PerkulatorOptions = createPerkulatorOptions();
        options.tasks = [{ module: {} as any }];

        expect(() => validateOptions(options)).to.throw(ValidationError);
      });

      describe('include', function () {
        it('Expect undefined include to pass', function () {
          const options: PerkulatorOptions = createPerkulatorOptions();
          options.tasks.push({ module: '/test', include: undefined });

          expect(() => validateOptions(options)).to.not.throw(ValidationError);
        });

        it('Expect to fail when include is not an array', function () {
          const options: PerkulatorOptions = createPerkulatorOptions();
          options.tasks.push({ module: '/test', include: {} as any });

          expect(() => validateOptions(options)).to.throw(ValidationError);
        });

        it('Expect to fail when include value is not a string', function () {
          const options: PerkulatorOptions = createPerkulatorOptions();
          options.tasks.push({ module: '/test', include: [{} as any] });

          expect(() => validateOptions(options)).to.throw(ValidationError);
        });
      });

      describe('exclude', function () {
        it('Expect undefined exclude to pass', function () {
          const options: PerkulatorOptions = createPerkulatorOptions();
          options.tasks.push({ module: '/test', exclude: undefined });

          expect(() => validateOptions(options)).to.not.throw(ValidationError);
        });

        it('Expect to fail when exclude is not an array', function () {
          const options: PerkulatorOptions = createPerkulatorOptions();
          options.tasks.push({ module: '/test', exclude: {} as any });

          expect(() => validateOptions(options)).to.throw(ValidationError);
        });

        it('Expect to fail when exclude value is not a string', function () {
          const options: PerkulatorOptions = createPerkulatorOptions();
          options.tasks.push({ module: '/test', exclude: [{} as any] });

          expect(() => validateOptions(options)).to.throw(ValidationError);
        });
      });
    });

    describe('TaskGroupObject', function () {
      it('Expect to fail when tasks are not objects', function () {
        const options: PerkulatorOptions = createPerkulatorOptions();
        options.tasks.push([] as any);

        expect(() => validateOptions(options)).to.throw(ValidationError);
      });

      it('Expect to fail when tasks are not TaskObjects', function () {
        const options: PerkulatorOptions = createPerkulatorOptions();
        options.tasks.push({} as any);

        expect(() => validateOptions(options)).to.throw(ValidationError);
      });

      it('Expect to pass when parallel is boolean', function () {
        const options: PerkulatorOptions = createPerkulatorOptions();
        options.tasks.push({
          tasks: [createTaskOptions()],
          parallel: true,
        });

        expect(() => validateOptions(options)).to.not.throw(ValidationError);
      });

      it('Expect to fail when parallel is not boolean', function () {
        const options: PerkulatorOptions = createPerkulatorOptions();
        options.tasks.push({
          tasks: [createTaskOptions()],
          parallel: {} as any,
        });

        expect(() => validateOptions(options)).to.throw(ValidationError);
      });
    });
  });
});
