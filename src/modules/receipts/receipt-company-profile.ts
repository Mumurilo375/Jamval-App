import { env } from "../../config/env";

export type ReceiptCompanyProfile = {
  name: string;
  document: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  contactName: string | null;
};

export type ReceiptCompanyProfileInput = {
  companyName?: string | null;
  document?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  contactName?: string | null;
};

export function getDefaultReceiptCompanyProfile(): ReceiptCompanyProfile {
  return resolveReceiptCompanyProfile();
}

export function resolveReceiptCompanyProfile(input?: ReceiptCompanyProfileInput | null): ReceiptCompanyProfile {
  const fallbackName = emptyToNull(env.COMPANY_NAME) ?? "Jamval Eletronicos";
  const fallbackDocument = emptyToNull(env.COMPANY_DOCUMENT) ?? "44.405.062/0001-03";
  const fallbackPhone = emptyToNull(env.COMPANY_PHONE) ?? "44 99837-2556";
  const fallbackAddress = emptyToNull(env.COMPANY_ADDRESS) ?? "Campo Mourao - PR";
  const fallbackEmail = emptyToNull(env.COMPANY_EMAIL) ?? "joecioam@gmail.com";
  const fallbackContactName = emptyToNull(env.COMPANY_CONTACT_NAME) ?? "Joecio Almeida Macedo";

  return {
    name: emptyToNull(input?.companyName) ?? fallbackName,
    document: emptyToNull(input?.document) ?? fallbackDocument,
    phone: emptyToNull(input?.phone) ?? fallbackPhone,
    address: emptyToNull(input?.address) ?? fallbackAddress,
    email: emptyToNull(input?.email) ?? fallbackEmail,
    contactName: emptyToNull(input?.contactName) ?? fallbackContactName
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.trim().length > 0 ? value.trim() : null;
}
