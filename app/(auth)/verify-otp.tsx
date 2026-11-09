import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { clearAuthChallenge, getAuthChallenge, type AuthChallenge } from '@/lib/auth-flow';
import { otpSchema, resendChallenge, verifyChallenge } from '@/lib/auth';
import { useTokens } from '@/theme/theme';
import { fontFamily, radius, touchTarget, type, withAlpha } from '@/theme/tokens';
import { Button, Icon, OtpInput, type OtpInputHandle } from '@/ui';
import { AuthFooter, AuthLayout, FormAlert } from '@/ui/auth';

function safeReturnTo(value: string | null | undefined): Href {
  if (!value?.startsWith('/') || value.startsWith('//') || /^\/(login|register|verify-otp)(\/|$)/.test(value)) return '/';
  return value as Href;
}

function countdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Local mock API only: shows the code the mock sent, as a chip that fills it in (never looks like typed input). */
function DevCodeChip({ code, onFill }: { code: string; onFill: () => void }) {
  const tokens = useTokens();
  return <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingLeft: 12, borderRadius: radius.full, borderWidth: 1, borderStyle: 'dashed', borderColor: tokens.input, backgroundColor: withAlpha(tokens.warning, 0.08) }}>
    <Icon name="FlaskConical" size={16} color={tokens.warning} />
    <Text style={[type.small, { color: tokens.mutedForeground }]}>Dev code · <Text style={{ color: tokens.foreground, fontFamily: fontFamily.money, fontVariant: ['tabular-nums'], letterSpacing: 1 }}>{code}</Text></Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Fill development code ${code.split('').join(' ')}`} onPress={onFill} style={({ pressed }) => ({ minHeight: touchTarget - 8, paddingHorizontal: 14, justifyContent: 'center', borderRadius: radius.full, backgroundColor: pressed ? tokens.muted : 'transparent' })}>
      <Text style={[type.small, { color: tokens.primary, fontWeight: '600' }]}>Fill</Text>
    </Pressable>
  </View>;
}

export default function VerifyOtpScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const otpRef = useRef<OtpInputHandle>(null);
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [code, setCode] = useState('');
  const [now, setNow] = useState(0);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let active = true;
    void getAuthChallenge().then((value) => {
      if (!active) return;
      setNow(Date.now());
      if (!value) router.replace('/login');
      else setChallenge(value);
    });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; clearInterval(timer); };
  }, [router]);

  const secondsToResend = useMemo(() => challenge ? Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000)) : 0, [challenge, now]);
  const secondsToExpire = useMemo(() => challenge ? Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - now) / 1000)) : 0, [challenge, now]);
  const codeExpired = expired || (challenge !== null && now > 0 && secondsToExpire === 0);

  const verifyMutation = useMutation({
    mutationFn: async (value: string) => {
      if (!challenge) throw new Error('Verification request expired. Start again.');
      const parsed = otpSchema.safeParse(value);
      if (!parsed.success) throw parsed.error;
      return verifyChallenge(challenge, parsed.data);
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.replace(challenge?.flow === 'login' ? safeReturnTo(challenge.returnTo) : '/');
    },
    onError: (error: unknown) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      if (error instanceof z.ZodError) { setCodeError(error.issues[0]?.message ?? 'Enter the 6-digit code.'); return; }
      if (error instanceof ApiError && error.status >= 400 && error.status < 500 && !/expired|wait|attempt/i.test(error.problem.detail ?? '')) {
        setCodeError(error.problem.detail ?? "That code doesn't match. Check the SMS and try again.");
        return;
      }
      setMessage(error instanceof ApiError ? error.problem.detail ?? error.message : error instanceof Error ? error.message : 'Unable to verify this code.');
    },
  });
  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!challenge) throw new Error('Verification request expired. Start again.');
      return resendChallenge(challenge);
    },
    onSuccess: (nextChallenge) => { setChallenge(nextChallenge); setNow(Date.now()); setCode(''); setExpired(false); setMessage(null); setCodeError(null); otpRef.current?.focus(); },
    onError: async (error: unknown) => {
      const detail = error instanceof ApiError ? error.problem.detail ?? error.message : 'Unable to resend the code.';
      setMessage(detail);
      if (error instanceof ApiError && error.status === 422 && /expired/i.test(detail)) {
        setExpired(true);
        await clearAuthChallenge();
      }
    },
  });

  function submit(value: string) {
    setMessage(null);
    setCodeError(null);
    if (!verifyMutation.isPending) verifyMutation.mutate(value);
  }

  if (!challenge) return null;
  const title = challenge.flow === 'register' ? 'Verify your phone' : 'Confirm this device';
  const description = challenge.flow === 'register'
    ? `Enter the 6-digit code we sent to ${challenge.phone}.`
    : `This device is new to your account. Enter the code we sent to ${challenge.phone}.`;

  return <AuthLayout title={title} description={description} footer={<AuthFooter prompt="Wrong number?" href={challenge.flow === 'register' ? '/register' : '/login'} label="Go back" />}>
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <OtpInput ref={otpRef} value={code} error={Boolean(codeError)} disabled={codeExpired || verifyMutation.isPending}
          onChange={(value) => { setCode(value); setCodeError(null); setMessage(null); }}
          onComplete={submit} />
        {codeError ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="CircleExclamationPoint" size={16} color={tokens.destructive} /><Text accessibilityRole="alert" style={[type.small, { color: tokens.destructive, flex: 1 }]}>{codeError}</Text></View> : null}
        <Text accessibilityLiveRegion="polite" style={[type.small, { color: codeExpired ? tokens.destructive : tokens.mutedForeground, fontVariant: ['tabular-nums'] }]}>{codeExpired ? 'This code has expired. Send a new one.' : `Code expires in ${countdown(secondsToExpire)}`}</Text>
      </View>
      {__DEV__ && challenge.mockOtp && !codeExpired ? <DevCodeChip code={challenge.mockOtp} onFill={() => { const value = challenge.mockOtp ?? ''; setCode(value); submit(value); }} /> : null}
      <FormAlert message={message} />
      <Button title={challenge.flow === 'register' ? 'Verify and create account' : 'Verify and sign in'} loading={verifyMutation.isPending} disabled={codeExpired || code.length < 6} onPress={() => submit(code)} />
      {expired
        ? <Button title="Start over" variant="secondary" onPress={() => router.replace(challenge.flow === 'register' ? '/register' : '/login')} />
        : <Button title={secondsToResend > 0 ? `Resend code in ${secondsToResend}s` : 'Resend code'} variant="ghost" loading={resendMutation.isPending} disabled={secondsToResend > 0} onPress={() => resendMutation.mutate()} />}
    </View>
  </AuthLayout>;
}
