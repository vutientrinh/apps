import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ApiError } from '@/lib/api';
import { registerSchema, registerShopper } from '@/lib/auth';
import { AuthFooter, AuthLayout, CheckRow, FormAlert, PasswordStrength } from '@/ui/auth';
import { Button, Icon, PasswordToggle, TextField } from '@/ui';
import { useTokens } from '@/theme/theme';
import { type } from '@/theme/tokens';

export default function RegisterScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; acceptTerms?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const tokens = useTokens();
  const mutation = useMutation({
    mutationFn: () => registerShopper(phone.trim(), password),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.push('/verify-otp');
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.status === 409) {
        setErrors((previous) => ({ ...previous, phone: error.problem.detail ?? 'This phone number is already registered.' }));
        return;
      }
      setMessage(error instanceof ApiError ? error.problem.detail ?? error.message : 'Unable to create your account. Check your connection and try again.');
    },
  });

  function submit() {
    setMessage(null);
    setErrors({});
    const result = registerSchema.safeParse({ phone: phone.trim(), password, acceptTerms: termsAccepted });
    if (!result.success) {
      const next: { phone?: string; password?: string; acceptTerms?: string } = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === 'phone' || field === 'password' || field === 'acceptTerms') next[field] = issue.message;
      }
      setErrors(next);
      return;
    }
    mutation.mutate();
  }

  return <AuthLayout title="Create your account" description="Use your phone number to start shopping and manage payments." footer={<AuthFooter prompt="Already have an account?" href="/login" label="Sign in" />}>
    <View style={{ gap: 16 }}>
      <TextField label="Phone number" value={phone} onChangeText={(value) => { setPhone(value); setErrors((prev) => ({ ...prev, phone: undefined })); }} error={errors.phone} keyboardType="phone-pad" autoComplete="tel" maxLength={10} hint="10 digits, starting with 0" />
      <TextField label="Create password" value={password} onChangeText={(value) => { setPassword(value); setErrors((prev) => ({ ...prev, password: undefined })); }} error={errors.password} secureTextEntry={!showPassword} trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />} autoCapitalize="none" autoComplete="new-password" />
      <PasswordStrength password={password} />
      <CheckRow checked={termsAccepted} onToggle={() => { setTermsAccepted((value) => !value); setErrors((prev) => ({ ...prev, acceptTerms: undefined })); }} title="I agree to the Terms and Privacy Policy" />
      {errors.acceptTerms ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="CircleExclamationPoint" size={16} color={tokens.destructive} /><Text accessibilityRole="alert" style={[type.small, { color: tokens.destructive, flex: 1 }]}>{errors.acceptTerms}</Text></View> : null}
      <FormAlert message={message} />
      <Button title="Create account" onPress={submit} loading={mutation.isPending} />
      <Text style={[type.small, { color: tokens.mutedForeground }]}>We’ll text a 6-digit code to this number. Your account is active once you enter it.</Text>
    </View>
  </AuthLayout>;
}
