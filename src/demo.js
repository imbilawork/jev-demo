// CLI demonstrator: runs every scenario (default input + paraphrase) against Jev
// and prints the typed answers, the action your code would take, and what a
// keyword baseline would have done. Set JEV_MODE=replay to use recorded samples.
import { scenarios } from "./scenarios.js";
import { replay } from "./replay.js";
import { decideLive, JevError } from "./jev.js";

const apiKey = process.env.JEV_API_KEY;
let mode = process.env.JEV_MODE === "replay" || !apiKey ? "replay" : "live";
const log = [];

function fmtAnswer(a) {
  if (a.type === "choice") return `${a.choice} (p=${a.probabilities[a.choice].toFixed(2)})`;
  if (a.type === "score") return `${a.score.toFixed(1)}`;
  return `${a.noul.toFixed(2)}`;
}

async function run(sc, variant) {
  const state = variant === "default" ? sc.state : sc.paraphrase;
  let res;
  if (mode === "live") {
    try {
      res = await decideLive({ apiKey, state, questions: sc.questions });
    } catch (e) {
      if (e instanceof JevError && e.code === "insufficient_credits") {
        console.error(`\n! Jev refused the call: ${e.message}\n  Falling back to recorded samples for the rest of the run.\n`);
        mode = "replay";
      } else {
        throw e;
      }
    }
  }
  if (!res) res = replay[sc.id][variant];
  const action = sc.act(res.answers);
  const rules = sc.rules.run(state);
  log.push({ scenario: sc.title, variant, action: action.action, rules: JSON.stringify(rules), latency: res.latencyMs, tokens: res.usage.input_tokens, cost: res.usage.cost_usd, mode: res.latencyMs == null ? "sample" : "live" });

  console.log(`\n=== ${sc.title} [${variant}] ${res.latencyMs == null ? "(recorded sample)" : `(live, ${res.latencyMs} ms)`}`);
  console.log(`state: ${typeof state === "string" ? state.replace(/\n/g, " ") : JSON.stringify(state)}`);
  for (const [k, a] of Object.entries(res.answers)) console.log(`  ${k.padEnd(20)} ${a.type.padEnd(6)} ${fmtAnswer(a)}`);
  console.log(`  -> your code runs: ${action.action}${action.note ? `   (${action.note})` : ""}`);
  console.log(`  -> ${sc.rules.label} said: ${JSON.stringify(rules)}`);
}

console.log(`Jev demonstrator, mode: ${mode}${mode === "replay" ? " (recorded samples, not live Jev output)" : ""}`);
for (const sc of scenarios) {
  await run(sc, "default");
  await run(sc, "paraphrase");
}

const live = log.filter((r) => r.mode === "live");
const tokens = log.reduce((n, r) => n + r.tokens, 0);
const cost = log.reduce((n, r) => n + r.cost, 0);
console.log("\n=== Summary");
console.log(`decisions: ${log.length}   questions answered: ${log.reduce((n, r, i) => n + Object.keys(scenarios[Math.floor(i / 2)].questions).length, 0)}`);
console.log(`input tokens: ${tokens}   cost: $${cost.toFixed(5)}${live.length ? "" : " (sample estimate at $0.42/M)"}`);
if (live.length) {
  const lat = live.map((r) => r.latency).sort((a, b) => a - b);
  console.log(`live calls: ${live.length}   median latency: ${lat[Math.floor(lat.length / 2)]} ms`);
}
console.table(log.map(({ scenario, variant, action, latency, tokens, cost }) => ({ scenario, variant, action, latency: latency ?? "sample", tokens, cost })));
