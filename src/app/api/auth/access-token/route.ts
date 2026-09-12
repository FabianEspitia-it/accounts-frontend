import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";
import { isAccessTokenValid } from "@/lib/auth/is-access-token-valid";

export const dynamic = "force-dynamic";

/** Devuelve el access token de la cookie httpOnly para peticiones directas al backend. */
export async function GET(request: NextRequest) {
  const access = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!access || !isAccessTokenValid(access)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = access.replace(/^Bearer\s+/i, "");
  return NextResponse.json({ access_token: token });
}
