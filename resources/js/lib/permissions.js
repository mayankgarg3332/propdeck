export const SETTINGS_TAB_SECTIONS = {
  company: "settings_company",
  payment: "settings_payment",
  email: "settings_email",
  defaults: "settings_defaults",
};

export const SETTINGS_SECTION_KEYS = Object.values(SETTINGS_TAB_SECTIONS);

export const COMPANY_LIMITED_WRITE_FIELDS = [
  "signatory",
  "designation",
  "phone",
  "email",
  "about",
];

export function canAccessAnySettings(permissions, isAccountOwner) {
  if (isAccountOwner) return true;
  return SETTINGS_SECTION_KEYS.some((section) => permissions[section]?.read);
}

export function pickCompanyPayloadForSave(company, isAccountOwner) {
  if (isAccountOwner) return company;
  const out = {};
  for (const field of COMPANY_LIMITED_WRITE_FIELDS) {
    if (company[field] !== undefined) {
      out[field] = company[field];
    }
  }
  return out;
}
