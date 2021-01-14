export * from './fake-promise';

export async function wait(time = 100): Promise<void> {
  return await new Promise((resolve): void => {
    setTimeout(resolve, time);
  });
}
