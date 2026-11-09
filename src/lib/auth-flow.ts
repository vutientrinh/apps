import { z } from 'zod';
import { deleteItemAsync, getItemAsync, setItemAsync } from './secure-storage';

export const authChallengeSchema = z.object({
  flow: z.enum(['register', 'login']),
  otpId: z.string().min(1),
  phone: z.string().min(1),
  expiresAt: z.string().datetime(),
  resendAvailableAt: z.string().datetime(),
  mockOtp: z.string().nullable(),
  rememberMe: z.boolean(),
  returnTo: z.string().nullable().default(null),
});

export type AuthChallenge = z.infer<typeof authChallengeSchema>;
const CHALLENGE_KEY = 'auth-challenge';
let challenge: AuthChallenge | null = null;

export async function setAuthChallenge(value: AuthChallenge): Promise<void> {
  challenge = authChallengeSchema.parse(value);
  await setItemAsync(CHALLENGE_KEY, JSON.stringify(challenge));
}

export async function getAuthChallenge(): Promise<AuthChallenge | null> {
  if (challenge) return challenge;
  try {
    const saved = await getItemAsync(CHALLENGE_KEY);
    if (!saved) return null;
    challenge = authChallengeSchema.parse(JSON.parse(saved));
    return challenge;
  } catch {
    await clearAuthChallenge();
    return null;
  }
}

export async function updateAuthChallenge(value: AuthChallenge): Promise<void> {
  await setAuthChallenge(value);
}

export async function clearAuthChallenge(): Promise<void> {
  challenge = null;
  try {
    await deleteItemAsync(CHALLENGE_KEY);
  } catch {
    // The challenge is cleared in memory even if storage is unavailable.
  }
}
