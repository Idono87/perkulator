import { expect } from 'chai';

import { PerkulatorOptions } from '~/types';
import validateOptions from '~/config/validation';
import ValidationError from '~/errors/validation-error';

describe('Configuration Validation', function () {
  describe('paths', function () {
    it('Expect string array to pass', function () {
      const options: PerkulatorOptions = { paths: ['/test/path'] };

      expect(() => validateOptions(options)).to.not.throw(ValidationError);
    });

    it('Expect non-array to fail', function () {
      const options: PerkulatorOptions = { paths: {} as any };

      expect(() => validateOptions(options)).to.throw(ValidationError);
    });

    it('Expect non-string array to fail', function () {
      const options: PerkulatorOptions = { paths: [12345 as any] };

      expect(() => validateOptions(options)).to.throw(ValidationError);
    });
  });
});
