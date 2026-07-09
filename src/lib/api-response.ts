import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth-server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Normalizes thrown errors from a route handler into a JSON error envelope. */
export function toErrorResponse(e: unknown) {
  if (e instanceof AuthError) return err(e.message, e.status);
  if (e instanceof ZodError) return err(e.issues.map((i) => i.message).join("; "), 422);
  if (e instanceof Error) return err(e.message, 400);
  return err("Unknown error", 500);
}
