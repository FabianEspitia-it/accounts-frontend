import { NextRequest, NextResponse } from "next/server";
import { accessTokenCookie, refreshTokenCookie } from "@/lib/auth/cookie-options";
import { parseLoginTokens } from "@/lib/auth/parse-login-response";
import { fetchBackendApi } from "@/server/fetch-bff";

const ERROR_MESSAGES_ES: Record<string, string> = {
  "invalid credentials": "Correo/número o contraseña incorrectos",
  "user not found": "Usuario no encontrado",
  "incorrect password": "Contraseña incorrecta",
  "user already exists": "El usuario ya existe",
  "phone number already in use": "Ese número ya está asignado a otro usuario",
};

function translateError(message: string): string {
  const key = message.trim().toLowerCase();
  return ERROR_MESSAGES_ES[key] ?? message;
}

async function extractErrorMessage(res: Response): Promise<string> {
  const fallback = `No se pudo iniciar sesión (${res.status})`;
  const raw = await res.text().catch(() => "");
  if (!raw) return fallback;

  try {
    const data = JSON.parse(raw);
    if (typeof data?.detail === "string") return translateError(data.detail);
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
      return translateError(String(data.detail[0].msg));
    }
    if (typeof data?.message === "string") return translateError(data.message);
    if (typeof data?.error === "string") return translateError(data.error);
  } catch {
    return translateError(raw);
  }

  return fallback;
}

export async function POST(req: NextRequest) {
  let body: { identifier?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // El identificador puede ser el correo o el número; `email` sigue aceptándose
  // por si queda algún cliente viejo apuntando aquí.
  const identifier = (body.identifier ?? body.email)?.trim();
  const password = body.password;
  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Correo o número y contraseña son obligatorios" },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetchBackendApi("/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
  } catch (e) {
    // Sin log, una `BACKEND_API_URL` ausente y un backend caído dan el mismo 502 opaco.
    console.error("[auth/login] fallo al llamar al backend:", e);
    return NextResponse.json(
      { error: "No se pudo conectar con el servidor" },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const message = await extractErrorMessage(upstream);
    return NextResponse.json({ error: message }, { status: upstream.status });
  }

  let tokens: { accessToken: string; refreshToken?: string };
  try {
    tokens = await parseLoginTokens(upstream);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Respuesta de login inválida" },
      { status: 502 }
    );
  }

  if (!tokens.refreshToken) {
    return NextResponse.json(
      {
        error:
          "Falta refresh_token (no viene en el cuerpo ni en Set-Cookie). Ajusta la integración con la API.",
      },
      { status: 502 }
    );
  }

  const res = NextResponse.json({ ok: true });
  const a = accessTokenCookie(tokens.accessToken);
  const r = refreshTokenCookie(tokens.refreshToken);
  res.cookies.set(a.name, a.value, a.opts);
  res.cookies.set(r.name, r.value, r.opts);
  return res;
}
