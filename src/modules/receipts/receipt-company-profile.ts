import { env } from "../../config/env";

export type ReceiptCompanyProfile = {
  name: string;
  document: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  contactName: string | null;
};

export function getReceiptCompanyProfile(): ReceiptCompanyProfile {
  return {
    name: env.COMPANY_NAME || "Jamval Eletronicos",
    document: emptyToNull(env.COMPANY_DOCUMENT) ?? "44.405.062/0001-03",
    phone: emptyToNull(env.COMPANY_PHONE) ?? "44 99837-2556",
    address: emptyToNull(env.COMPANY_ADDRESS) ?? "Campo Mourao - PR",
    email: emptyToNull(env.COMPANY_EMAIL) ?? "joecioam@gmail.com",
    contactName: emptyToNull(env.COMPANY_CONTACT_NAME) ?? "Joecio Almeida Macedo"
  };
}

function emptyToNull(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.trim().length > 0 ? value.trim() : null;
}
