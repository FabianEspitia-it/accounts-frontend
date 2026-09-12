import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";
import { isAccessTokenValid } from "@/lib/auth/is-access-token-valid";
import { fetchBackendApi } from "@/server/fetch-bff";

export const dynamic = "force-dynamic";

async function forward(
  request: NextRequest,
  pathSegments: string[],
  method: string
): Promise<NextResponse> {
  const access = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!access || !isAccessTokenValid(access)) {
    return NextResponse.json({ detail: "No autenticado" }, { status: 401 });
  }

  const path = pathSegments.join("/");
  const qs = request.nextUrl.search;
  const targetPath = `/${path}${qs}`;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${access}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const hasBody = !["GET", "HEAD"].includes(method);
  const body =
    hasBody && request.body ? await request.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetchBackendApi(targetPath, {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }

  const outHeaders = new Headers();
  const uct = upstream.headers.get("content-type");
  if (uct) outHeaders.set("content-type", uct);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
}

type RouteCtx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(request, path, "GET");
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(request, path, "POST");
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(request, path, "PUT");
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(request, path, "PATCH");
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return forward(request, path, "DELETE");
}
