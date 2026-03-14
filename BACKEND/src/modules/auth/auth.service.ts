import { AppError } from "../../shared/errors/app-error";
import { AuthRepository } from "./auth.repository";
import { verifyPassword } from "./auth-password";
import {
  buildSessionExpiresAt,
  generateSessionToken,
  hashSessionToken
} from "./auth-session";
import type { LoginInput, AuthenticatedUser } from "./auth.types";

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  async login(input: LoginInput): Promise<{ user: AuthenticatedUser; sessionToken: string }> {
    const user = await this.repository.findByEmail(input.email);

    if (!user || !user.isActive) {
      throw invalidCredentialsError();
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw invalidCredentialsError();
    }

    const sessionToken = generateSessionToken();
    const updatedUser = await this.repository.updateSession(user.id, {
      sessionTokenHash: hashSessionToken(sessionToken),
      sessionExpiresAt: buildSessionExpiresAt(),
      lastLoginAt: new Date()
    });

    return {
      user: mapAuthenticatedUser(updatedUser),
      sessionToken
    };
  }

  async logout(userId: string): Promise<void> {
    await this.repository.clearSession(userId);
  }

  async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await this.repository.findById(userId);

    if (!user || !user.isActive) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    return mapAuthenticatedUser(user);
  }
}

export function mapAuthenticatedUser(user: {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: Date | null;
}): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt
  };
}

function invalidCredentialsError(): AppError {
  return new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");
}
