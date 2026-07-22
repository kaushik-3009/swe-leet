import { err } from "@/lib/api-response";

/**
 * Destructive synthetic-data cleanup is intentionally not exposed over HTTP.
 * Use a reviewed staging-only database operation with an explicit run id.
 */
export async function POST() {
  return err("Synthetic data cleanup is CLI/database-admin only", 404);
}
