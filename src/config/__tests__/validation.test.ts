import { expect } from 'chai';

import validateOptions from '~/config/validation';
import ValidationError from '~/errors/validation-error';
import { createPerkulatorOptions } from '~/__tests__/utils';
import type { PerkulatorOptions } from '~/types';

describe('Configuration Validation', function () {
  describe('paths', function () {
    it('Expect string array to pass', function () {
      const options: PerkulatorOptions = createPerkulatorOptions();

      expect(() => validateOptions(options)).to.not.throw(ValidationError);
    });

    it('Expect non-array to fail', function () {
      const options: PerkulatorOptions = createPerkulatorOptions();
      options.paths = {} as any;

      expect(() => validateOptions(options)).to.throw(ValidationError);
    });

    it('Expect non-string array to fail', function () {
      const options: PerkulatorOptions = createPerkulatorOptions();
      options.paths = [123456 as any];

      expect(() => validateOptions(options)).to.throw(ValidationError);
    });
  });
});
