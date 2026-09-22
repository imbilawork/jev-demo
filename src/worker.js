// Cloudflare Worker: serves the dashboard from ./public and proxies decisions
// to Jev so the API key never reaches the browser.
import { scenarios, getScenario, publicScenarios } from "./scenarios.js";
import { replay } from "./replay.js";
import { decideLive, JevError } from "./jev.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/status") return json(await status(env));
    if (url.pathname === "/api/scenarios") return json({ scenarios: publicScenarios() });
    if (url.pathname === "/api/decide" && request.method === "POST") return decide(request, env);
    if (url.pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    return env.ASSETS.fetch(request);
  }
};

async function status(env) {
  const hasKey = Boolean(env.JEV_API_KEY);
  return { hasKey, mode: hasKey ? "live" : "replay", scenarios: scenarios.length };
}

async function decide(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "body must be JSON" }, 400); }
  const { scenarioId, state, questions, mode } = body || {};
  const scenario = scenarioId ? getScenario(scenarioId) : null;
  if (!questions || typeof questions !== "object") return json({ error: "questions required" }, 400);
  if (state === undefined || state === null || state === "") return json({ error: "state required" }, 400);

  const wantReplay = mode === "replay" || !env.JEV_API_KEY;
  if (!wantReplay) {
    try {
      const result = await decideLive({ baseUrl: env.JEV_BASE_URL, apiKey: env.JEV_API_KEY, state, questions });
      return json(finish(scenario, state, result, "live"));
    } catch (err) {
      if (err instanceof JevError && err.code === "insufficient_credits") {
        const r = replayFor(scenario, state);
        if (r) return json({ ...finish(scenario, state, r, "replay"), notice: "Live call refused: the Jev account has no credits. Showing the recorded sample instead." });
        return json({ error: err.message, code: err.code, status: err.status }, 402);
      }
      return json({ error: err.message, code: err.code || "upstream", status: err.status || 502 }, err.status || 502);
    }
  }
  const r = replayFor(scenario, state);
  if (!r) return json({ error: "No recorded sample for this input. Add credits to run it live.", code: "no_replay" }, 409);
  return json(finish(scenario, state, r, "replay"));
}

function replayFor(scenario, state) {
  if (!scenario) return null;
  const key = JSON.stringify(state);
  const rec = replay[scenario.id];
  if (!rec) return null;
  if (key === JSON.stringify(scenario.state)) return rec.default;
  if (key === JSON.stringify(scenario.paraphrase)) return rec.paraphrase;
  return null;
}

function finish(scenario, state, result, mode) {
  const out = { mode, model: result.model, answers: result.answers, usage: result.usage, latencyMs: result.latencyMs ?? null };
  if (scenario) {
    out.action = scenario.act(result.answers);
    out.rules = { label: scenario.rules.label, result: scenario.rules.run(state) };
  }
  return out;
}
