import { clearSession, initializeSession } from './session';
import { hasCompletedIntro } from './onboarding';
import { initializeTheme } from '../theme/theme';

export async function runStartup(
  redirect: (route: '/intro') => void,
  releaseRenderGate: () => void,
): Promise<void> {
  try {
    await initializeTheme();
    await initializeSession();
    if (!(await hasCompletedIntro())) redirect('/intro');
  } catch (error) {
    console.error('App startup initialization failed; continuing signed out.', error);
    try {
      await clearSession();
    } catch (clearError) {
      console.error('Unable to clear the session after startup failure.', clearError);
    }
    redirect('/intro');
  } finally {
    releaseRenderGate();
  }
}
