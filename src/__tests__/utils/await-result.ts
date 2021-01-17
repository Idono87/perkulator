import { wait } from './wait';

/**
 * Runs a function until an expected results is reached or
 * the function times out.
 *
 * @param runnable Runnable function
 * @param timeout  Time before function throws an error.
 * @param interval Interval between each run.
 *
 * @throws Throws when a timeout occurs.
 *
 * @internal
 */
export default async function awaitResult(
  runnable: () => void | Promise<void>,
  timeout = 2000,
  interval = 10,
): Promise<void> {
  let timedout: Boolean = false;
  const timerHandle = setTimeout(() => {
    timedout = true;
  }, timeout);

  while (true) {
    if (timedout === true) {
      throw new Error('Awaiting result timed out.');
    }

    await wait(interval);

    try {
      await (async () => await runnable())();
    } catch (e) {
      continue;
    }

    break;
  }

  clearTimeout(timerHandle);
}
