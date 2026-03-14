import { AppError } from "../errors/app-error";

const SUPPORTED_MIME_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"]
]);

type NormalizedSignatureImage = {
  mimeType: "image/png" | "image/jpeg";
  extension: "png" | "jpg";
  buffer: Buffer;
};

export function normalizeSignatureImage(input: {
  mimeType: string;
  signatureImageBase64: string;
}): NormalizedSignatureImage {
  const trimmedMimeType = input.mimeType.trim().toLowerCase();
  const normalizedMimeType = normalizeSupportedMimeType(trimmedMimeType);
  const trimmedImageValue = input.signatureImageBase64.trim();

  let providedMimeFromDataUrl: string | null = null;
  let base64Payload = trimmedImageValue;

  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/i.exec(trimmedImageValue);

  if (dataUrlMatch) {
    providedMimeFromDataUrl = dataUrlMatch[1].trim().toLowerCase();
    base64Payload = dataUrlMatch[2].trim();
  }

  if (providedMimeFromDataUrl && providedMimeFromDataUrl !== normalizedMimeType) {
    throw new AppError(
      400,
      "INVALID_SIGNATURE_IMAGE",
      "Signature image mimeType does not match the provided data URL",
      {
        mimeType: normalizedMimeType,
        dataUrlMimeType: providedMimeFromDataUrl
      }
    );
  }

  const compactBase64 = base64Payload.replace(/\s+/g, "");

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compactBase64)) {
    throw new AppError(400, "INVALID_SIGNATURE_IMAGE", "Signature image must be valid base64 data");
  }

  const buffer = Buffer.from(compactBase64, "base64");

  if (buffer.length === 0) {
    throw new AppError(400, "INVALID_SIGNATURE_IMAGE", "Signature image is empty");
  }

  const detectedMimeType = detectImageMimeType(buffer);

  if (!detectedMimeType) {
    throw new AppError(
      400,
      "INVALID_SIGNATURE_IMAGE",
      "Signature image content must be a PNG or JPEG file"
    );
  }

  if (detectedMimeType !== normalizedMimeType) {
    throw new AppError(
      400,
      "INVALID_SIGNATURE_IMAGE",
      "Signature image content does not match the declared mimeType",
      {
        mimeType: normalizedMimeType,
        detectedMimeType
      }
    );
  }

  return {
    mimeType: detectedMimeType,
    extension: SUPPORTED_MIME_TYPES.get(detectedMimeType)! as "png" | "jpg",
    buffer
  };
}

function normalizeSupportedMimeType(mimeType: string): "image/png" | "image/jpeg" {
  if (mimeType === "image/jpg") {
    return "image/jpeg";
  }

  if (mimeType === "image/png" || mimeType === "image/jpeg") {
    return mimeType;
  }

  throw new AppError(400, "INVALID_SIGNATURE_IMAGE", "Supported signature image mime types are image/png and image/jpeg", {
    mimeType
  });
}

function detectImageMimeType(buffer: Buffer): "image/png" | "image/jpeg" | null {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  return null;
}
