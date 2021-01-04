import { expect } from 'chai';

import { PerkulatorOptions } from '~/types';
import { consolidateOptions } from '../config';

describe('Config', function () {
  it('Expect consolidated config to be returned', function () {
    const optionsOne: PerkulatorOptions = { paths: ['/test/pathOne'] };
    const optionsTwo: PerkulatorOptions = {
      paths: ['/test/pathTwo', '/test/pathThree'],
    };

    const expectedOptions: Required<PerkulatorOptions> = {
      paths: ['/test/pathOne', '/test/pathThree'],
    };

    expect(consolidateOptions(optionsOne, optionsTwo)).to.deep.equal(
      expectedOptions,
    );
  });
});
