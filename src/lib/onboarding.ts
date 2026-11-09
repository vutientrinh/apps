import { getItemAsync, setItemAsync } from './secure-storage';

const INTRO_COMPLETE_KEY = 'intro-complete';

export async function hasCompletedIntro(): Promise<boolean> {
  return (await getItemAsync(INTRO_COMPLETE_KEY)) === 'true';
}

export async function completeIntro(): Promise<void> {
  await setItemAsync(INTRO_COMPLETE_KEY, 'true');
}
