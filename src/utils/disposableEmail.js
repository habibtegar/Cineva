/**
 * List of known disposable / temporary email provider domains.
 */
export const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'guerrillamailblock.com',
  'throwawaymail.com',
  'fake.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'dispostable.com',
  'sharklasers.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'grr.la',
  'nada.ltd',
  'getnada.com',
  'mohmal.com',
  'fakemailgenerator.com',
  'burnermail.io',
  'maildrop.cc',
  'inboxkitten.com',
  'crazymailing.com',
  'mytemp.email',
  '10mail.org',
  'dropmail.me',
  'getairmail.com',
  'emailondeck.com',
  'tempinbox.com',
  'generator.email',
  'mintemail.com',
  'spam4.me',
  'tempr.email',
  'discard.email',
];

const DISPOSABLE_DOMAINS_SET = new Set(DISPOSABLE_EMAIL_DOMAINS);

/**
 * Checks whether the given email address uses a disposable / temporary email domain.
 * @param {string} email - Email address to validate
 * @returns {boolean} True if disposable, false otherwise
 */
export const isDisposableEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1].trim();
  if (!domain) return false;

  if (DISPOSABLE_DOMAINS_SET.has(domain)) {
    return true;
  }

  return DISPOSABLE_EMAIL_DOMAINS.some((item) => domain.endsWith(`.${item}`));
};
