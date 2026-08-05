/**
 * Format a client's free-text phone number into WhatsApp's wa.me digit format.
 * Phone numbers in this app are unvalidated free text (no guaranteed country code),
 * so this makes a best-effort guess: numbers that already look like they carry a
 * country code (11+ digits) are left as-is; bare 10-digit numbers are assumed to
 * be Indian mobile numbers and prefixed with 91.
 */
export function formatWhatsAppPhone(rawPhone) {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length > 10) return digits;
  if (digits.length === 10) return `91${digits}`;
  return null; // too short to be a usable number
}

export function buildWhatsAppMessage({ clientContact, companyName, proposalId, amountLabel, publicUrl }) {
  const greeting = clientContact ? `Hi ${clientContact},` : "Hi,";
  const linkPart = publicUrl ? ` View it here: ${publicUrl}` : "";
  return `${greeting} please find your proposal ${proposalId} from ${companyName} — ${amountLabel}.${linkPart}`;
}

export function buildWhatsAppShareUrl(phoneDigits, message) {
  return `https://wa.me/${phoneDigits || ""}?text=${encodeURIComponent(message)}`;
}
