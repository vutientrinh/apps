import { z } from 'zod';
import type { User, Tokens } from '@web/features/banking/types';
import { apiRequest, apiRequestWithResponse, jsonBody } from './api';
import { getDeviceId, saveTokens } from './session';
import { clearAuthChallenge, setAuthChallenge, type AuthChallenge } from './auth-flow';

export const registerSchema = z.object({
  phone: z.string().regex(/^0\d{9}$/, 'Enter a 10-digit Vietnamese phone number.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  acceptTerms: z.literal(true, { error: 'Accept the terms to create an account.' }),
});

export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Enter your phone number or email.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const otpSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.');

const challengeResponseSchema = z.object({
  otpId: z.string().min(1),
  expiresAt: z.string().datetime(),
  resendAvailableAt: z.string().datetime(),
});
const loginChallengeResponseSchema = challengeResponseSchema.extend({ otpRequired: z.literal(true) });
const tokensSchema = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1), user: z.unknown() });
export type ShopperUser = User;
export type AuthTokensResponse = Tokens;

function challengeFromResponse(
  response: Response,
  values: z.infer<typeof challengeResponseSchema>,
  flow: AuthChallenge['flow'],
  phone: string,
  rememberMe: boolean,
  returnTo: string | null = null,
): AuthChallenge {
  return {
    ...values,
    flow,
    phone,
    rememberMe,
    returnTo,
    mockOtp: __DEV__ ? response.headers.get('X-Mock-OTP') : null,
  };
}

export async function registerShopper(phone: string, password: string): Promise<AuthChallenge> {
  const result = await apiRequestWithResponse<unknown>('/auth/register', {
    method: 'POST',
    body: jsonBody({ phone, password }),
  });
  const payload = challengeResponseSchema.parse(result.data);
  const challenge = challengeFromResponse(result.response, payload, 'register', phone, true);
  await setAuthChallenge(challenge);
  return challenge;
}

export async function loginShopper(login: string, password: string, rememberMe: boolean, returnTo: string | null = null): Promise<AuthChallenge | ShopperUser> {
  const deviceId = await getDeviceId();
  const result = await apiRequestWithResponse<unknown>('/auth/login', {
    method: 'POST',
    headers: { 'X-Mock-Device': deviceId },
    body: jsonBody({ login: login.trim(), password }),
  });
  if (typeof result.data === 'object' && result.data !== null && 'otpRequired' in result.data) {
    const payload = loginChallengeResponseSchema.parse(result.data);
    const challenge = challengeFromResponse(result.response, payload, 'login', login.trim(), rememberMe, returnTo);
    await setAuthChallenge(challenge);
    return challenge;
  }
  const tokens = tokensSchema.parse(result.data) as Tokens;
  await saveTokens(tokens, rememberMe);
  await clearAuthChallenge();
  return tokens.user as ShopperUser;
}

export async function resendChallenge(challenge: AuthChallenge): Promise<AuthChallenge> {
  const result = await apiRequestWithResponse<unknown>('/auth/otp/resend', {
    method: 'POST',
    body: jsonBody({ otpId: challenge.otpId }),
  });
  const payload = challengeResponseSchema.parse(result.data);
  const updated = challengeFromResponse(result.response, payload, challenge.flow, challenge.phone, challenge.rememberMe, challenge.returnTo);
  await setAuthChallenge(updated);
  return updated;
}

export async function verifyChallenge(challenge: AuthChallenge, code: string): Promise<ShopperUser> {
  const deviceId = await getDeviceId();
  const tokens = tokensSchema.parse(await apiRequest<unknown>('/auth/otp/verify', {
    method: 'POST',
    headers: { 'X-Mock-Device': deviceId },
    body: jsonBody({ otpId: challenge.otpId, code }),
  })) as Tokens;
  await saveTokens(tokens, challenge.rememberMe);
  await clearAuthChallenge();
  return tokens.user as ShopperUser;
}
