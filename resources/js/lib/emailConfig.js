export function isSmtpConfigured(email = {}) {
  return Boolean(email?.smtpConfigured);
}
