"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE } from "@/lib/auth/session";

/** Sign out — clears the shared-session cookie and returns to the gate. */
export async function logout() {
  (await cookies()).delete(AUTH_COOKIE);
  redirect("/login");
}
