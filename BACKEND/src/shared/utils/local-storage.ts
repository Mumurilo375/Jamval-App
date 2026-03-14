import { createReadStream, existsSync, promises as fs } from "node:fs";
import path from "node:path";

import { AppError } from "../errors/app-error";

const STORAGE_ROOT = resolveStorageRoot();

export function getStorageRoot(): string {
  return STORAGE_ROOT;
}

export async function writeStorageFile(storageKey: string, content: Buffer): Promise<string> {
  const absolutePath = resolveStoragePath(storageKey);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content);
  return absolutePath;
}

export async function readStorageFile(storageKey: string): Promise<Buffer> {
  const absolutePath = resolveStoragePath(storageKey);

  try {
    return await fs.readFile(absolutePath);
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new AppError(404, "STORAGE_FILE_NOT_FOUND", "Stored file was not found", {
        storageKey
      });
    }

    throw error;
  }
}

export async function removeStorageFile(storageKey: string | null | undefined): Promise<void> {
  if (!storageKey) {
    return;
  }

  const absolutePath = resolveStoragePath(storageKey);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return;
    }

    throw error;
  }
}

export async function fileExists(storageKey: string): Promise<boolean> {
  const absolutePath = resolveStoragePath(storageKey);

  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

export function createStorageReadStream(storageKey: string) {
  const absolutePath = resolveStoragePath(storageKey);
  return createReadStream(absolutePath);
}

export function resolveStoragePath(storageKey: string): string {
  const normalizedStorageKey = path.normalize(storageKey);
  const absolutePath = path.resolve(STORAGE_ROOT, normalizedStorageKey);
  const relativePath = path.relative(STORAGE_ROOT, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new AppError(400, "INVALID_STORAGE_KEY", "Storage key resolves outside the storage root", {
      storageKey
    });
  }

  return absolutePath;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function resolveStorageRoot(): string {
  const configuredStorageRoot = process.env.STORAGE_ROOT?.trim();

  if (configuredStorageRoot) {
    return path.resolve(configuredStorageRoot);
  }

  // Preserve access to files created before the repo was split into BACKEND/FRONTEND.
  const workspaceStorageRoot = path.resolve(__dirname, "../../../../storage");
  const backendStorageRoot = path.resolve(__dirname, "../../../storage");

  if (existsSync(workspaceStorageRoot)) {
    return workspaceStorageRoot;
  }

  if (existsSync(backendStorageRoot)) {
    return backendStorageRoot;
  }

  return workspaceStorageRoot;
}
