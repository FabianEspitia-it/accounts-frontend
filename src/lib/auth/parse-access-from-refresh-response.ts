/** Backend refresh may return a JSON string or a bare string body (per OpenAPI). */
export async function parseAccessFromRefreshResponse(
  res: Response
): Promise<string> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const data: unknown = await res.json();
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      const t = o.access_token ?? o.accessToken ?? o.token;
      if (typeof t === "string") return t;
    }
    throw new Error("Refresh response did not include an access token");
  }
  const text = (await res.text()).trim();
  if (!text) throw new Error("Empty refresh response");
  return text;
}
