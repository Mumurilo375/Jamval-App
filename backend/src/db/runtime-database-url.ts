export function buildRuntimeDatabaseUrl(databaseUrl: string, isVercel: boolean): string {
  if (!isVercel) {
    return databaseUrl;
  }

  const url = new URL(databaseUrl);

  // Each warm serverless instance owns a pool; keep it small even under concurrency.
  url.searchParams.set("connection_limit", "1");

  if (url.hostname.endsWith(".pooler.supabase.com")) {
    // Session mode holds a database connection for the lifetime of the instance.
    if (url.port === "5432" || url.port === "") {
      url.port = "6543";
    }

    if (url.port === "6543") {
      // Supavisor transaction mode requires Prisma's prepared-statement compatibility.
      url.searchParams.set("pgbouncer", "true");
    }
  }

  return url.toString();
}
