const spec = process.env.INTEGRATION_TEST
  ? 'dist/src/__tests__/integration/**/*.test.js'
  : 'src/__tests__/unit/**/*.test.ts';

module.exports = {
  allowUncaught: false,
  bail: false,
  delay: false,
  ui: 'bdd',
  timeout: 5000,
  recursive: true,
  exit: true,
  useStrict: true,
  extensions: ['.ts'],
  require: ['ts-node/register', 'tsconfig-paths/register'],
  reporter: 'min',
  spec,
};
