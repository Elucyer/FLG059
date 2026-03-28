import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.redirect(new URL("/admin/login", process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"));
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
