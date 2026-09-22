// Minimal Jev client. Works in Workers and Node 22+ (global fetch).
export class JevError extends Error {
  constructor(message, { status, code } = {}) { super(message); this.status = status; this.code = code; }
}

export async function decideLive({ baseUrl = "https://jevtypesafeai.com/api/v1", apiKey, state, questions, model }) {
  if (!apiKey) throw new JevError("JEV_API_KEY is not set", { status: 401, code: "no_key" });
  const t0 = Date.now();
  const res = await fetch(`${baseUrl}/decide`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(model ? { model, state, questions } : { state, questions })
  });
  const latencyMs = Date.now() - t0;
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error body */ }
  if (!res.ok) {
    throw new JevError((data && data.error) || `Jev returned HTTP ${res.status}`, { status: res.status, code: data && data.code });
  }
  return { ...data, latencyMs };
}
