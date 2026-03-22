/**
 * Utilitarios para mascarar dados sensiveis (PII) em logs.
 * Usar APENAS para logging — nunca substituir o dado real usado no envio.
 */

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '***';
  if (phone.length <= 4) return '****';
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '***';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return local[0] + '***@' + domain;
}
