import { z } from "zod";

import { prisma } from "../db/prisma";
import { ensurePasswordMeetsMinimumRequirements, hashPassword } from "../modules/auth/auth-password";

const inputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200)
});

async function main(): Promise<void> {
  const parsedInput = inputSchema.parse({
    name: getCliOptionValue("name"),
    email: getCliOptionValue("email"),
    password: getCliOptionValue("password")
  });

  ensurePasswordMeetsMinimumRequirements(parsedInput.password);

  const passwordHash = await hashPassword(parsedInput.password);
  const user = await prisma.user.upsert({
    where: { email: parsedInput.email },
    update: {
      name: parsedInput.name,
      passwordHash,
      isActive: true,
      sessionTokenHash: null,
      sessionExpiresAt: null
    },
    create: {
      name: parsedInput.name,
      email: parsedInput.email,
      passwordHash,
      isActive: true
    }
  });

  console.log(`Admin user ready: ${user.email} (${user.id})`);
}

function getCliOptionValue(name: string): string {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);

  if (index === -1 || index === process.argv.length - 1) {
    throw new Error(`Missing required option ${flag}`);
  }

  return process.argv[index + 1];
}

main()
  .catch((error) => {
    console.error("Failed to create or update the admin user.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
