import { useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { loginSchema, loginShopper } from '@/lib/auth';
import { Button, PasswordToggle, TextField } from '@/ui';
import { AuthFooter, AuthLayout, CheckRow, FormAlert } from '@/ui/auth';
import { useTokens } from '@/theme/theme';
import { type } from '@/theme/tokens';

function safeRedirect(value: string | string[] | undefined): Href {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate?.startsWith('/') || candidate.startsWith('//') || /^\/(login|register|verify-otp)(\/|$)/.test(candidate)) return '/';
  return candidate as Href;
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string | string[] }>();
  const redirect = safeRedirect(params.redirect);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const tokens = useTokens();
  const mutation = useMutation({
    mutationFn: () => loginShopper(login, password, rememberMe, String(redirect)),
    onSuccess: async (result) => {
      if (typeof result === 'object' && result !== null && 'otpId' in result) {
        await Haptics.selectionAsync().catch(() => undefined);
        router.push('/verify-otp');
        return;
      }
      router.replace(redirect);
    },
    onError: (error: unknown) => {
      if (error instanceof z.ZodError) {
        const fields: { login?: string; password?: string } = {};
        for (const issue of error.issues) {
          const field = issue.path[0];
          if (field === 'login' || field === 'password') fields[field] = issue.message;
        }
        setErrors(fields);
        return;
      }
      setMessage(error instanceof ApiError ? error.problem.detail ?? error.message : 'Unable to sign in. Check your connection and try again.');
    },
  });

  function submit() {
    setMessage(null);
    setErrors({});
    const result = loginSchema.safeParse({ login, password });
    if (!result.success) {
      const fields: { login?: string; password?: string } = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === 'login' || field === 'password') fields[field] = issue.message;
      }
      setErrors(fields);
      return;
    }
    mutation.mutate();
  }

  return <AuthLayout title="Sign in" description="Continue to your shopper account." footer={<AuthFooter prompt="New here?" href="/register" label="Create an account" />}>
    <View style={{ gap: 16 }}>
      <TextField label="Phone or email" value={login} onChangeText={setLogin} error={errors.login} autoCapitalize="none" autoCorrect={false} autoComplete="username" returnKeyType="next" />
      <TextField label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry={!showPassword} trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />} autoCapitalize="none" autoComplete="current-password" returnKeyType="go" onSubmitEditing={submit} />
      <CheckRow checked={rememberMe} onToggle={() => setRememberMe((value) => !value)} title="Remember me on this device" description="Your session stays in secure device storage." />
      <FormAlert message={message} />
      <Button title="Sign in" onPress={submit} loading={mutation.isPending} />
      <Text style={[type.small, { color: tokens.mutedForeground, textAlign: 'center' }]}>New devices may ask for a one-time code.</Text>
    </View>
  </AuthLayout>;
}

