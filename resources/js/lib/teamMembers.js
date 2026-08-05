/**
 * Resolve a display name for who created a record (proposal, client, ...).
 *
 * teamMembers: { [userId]: { name, email } } — only present for account owners/admins
 * createdByUserId: the user ID stored on the record
 * currentUserId: the logged-in user's ID (reserved for future "You" labeling)
 *
 * Edge cases:
 *  - createdByUserId is null (old records before tracking was added) → "—"
 *  - User has been deleted (id not in teamMembers) → "Deleted user"
 *  - Created by the account owner themselves → owner's name
 */
export function resolveCreatorName(createdByUserId, teamMembers, currentUserId) {
  if (!createdByUserId) return null; // null = don't show (old records)
  if (!teamMembers) return null;     // not account owner/admin — don't show column
  const member = teamMembers[createdByUserId];
  if (!member) return "Deleted user";
  return member.name || member.email || "Unknown";
}
