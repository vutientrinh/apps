import { loginSchema, otpSchema, registerSchema } from './auth';

describe('authentication input schemas', () => {
  it('accepts a valid Vietnamese phone, password and terms selection', () => {
    expect(registerSchema.safeParse({ phone: '0901234567', password: 'safe-pass-123', acceptTerms: true }).success).toBe(true);
  });

  it('rejects invalid registration inputs and requires explicit terms acceptance', () => {
    expect(registerSchema.safeParse({ phone: '901234567', password: 'safe-pass-123', acceptTerms: true }).success).toBe(false);
    expect(registerSchema.safeParse({ phone: '0901234567', password: 'short', acceptTerms: true }).success).toBe(false);
    expect(registerSchema.safeParse({ phone: '0901234567', password: 'safe-pass-123', acceptTerms: false }).success).toBe(false);
  });

  it('requires a login identifier and password', () => {
    expect(loginSchema.safeParse({ login: '0901234567', password: 'secret' }).success).toBe(true);
    expect(loginSchema.safeParse({ login: '  ', password: 'secret' }).success).toBe(false);
    expect(loginSchema.safeParse({ login: '0901234567', password: '' }).success).toBe(false);
  });

  it('accepts exactly six numeric OTP digits', () => {
    expect(otpSchema.safeParse('012345').success).toBe(true);
    expect(otpSchema.safeParse('12345').success).toBe(false);
    expect(otpSchema.safeParse('12345a').success).toBe(false);
  });
});
