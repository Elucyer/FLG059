import { cookies } from "next/headers";

const SESSION_COOKIE = "termigrome_session";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  return session?.value === "authenticated";
}

export function checkPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export { SESSION_COOKIE };
