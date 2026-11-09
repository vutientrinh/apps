import { clearSession, initializeSession } from './session';
import { hasCompletedIntro } from './onboarding';
import { runStartup } from './startup';
import { initializeTheme } from '../theme/theme';

jest.mock('./session', () => ({
  clearSession: jest.fn(),
  initializeSession: jest.fn(),
}));
jest.mock('./onboarding', () => ({ hasCompletedIntro: jest.fn() }));
jest.mock('../theme/theme', () => ({ initializeTheme: jest.fn() }));

describe('app startup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('releases the render gate and routes to intro signed out when storage initialization throws', async () => {
    const error = new Error('storage unavailable');
    jest.mocked(initializeTheme).mockRejectedValue(error);
    jest.mocked(clearSession).mockResolvedValue();
    const redirect = jest.fn();
    const releaseRenderGate = jest.fn();
    const logError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await runStartup(redirect, releaseRenderGate);
      expect(logError).toHaveBeenCalledWith('App startup initialization failed; continuing signed out.', error);
    } finally {
      logError.mockRestore();
    }

    expect(clearSession).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/intro');
    expect(releaseRenderGate).toHaveBeenCalledTimes(1);
  });

  it('releases the render gate and shows intro for a first launch', async () => {
    jest.mocked(initializeTheme).mockResolvedValue();
    jest.mocked(initializeSession).mockResolvedValue();
    jest.mocked(hasCompletedIntro).mockResolvedValue(false);
    const redirect = jest.fn();
    const releaseRenderGate = jest.fn();

    await runStartup(redirect, releaseRenderGate);

    expect(redirect).toHaveBeenCalledWith('/intro');
    expect(releaseRenderGate).toHaveBeenCalledTimes(1);
  });
});
