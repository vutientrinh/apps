export type AppLocale = 'vi-VN' | 'en';

export function formatDate(value: string, locale: AppLocale = 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '—';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'medium',
  }).format(date);
}

export function formatDateTime(value: string, locale: AppLocale = 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '—';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
