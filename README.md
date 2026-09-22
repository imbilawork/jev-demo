# Jev demonstrator

A small, deployable project that shows what [Jev](https://jevtypesafeai.com), the typed-decision model from TypeSafe AI, is for: **decisions, not text**. You send a piece of state and typed questions, and get calibrated probabilities back in one round trip. Your code branches on the values directly.

Framing follows the 2nth knowledge tree: the [System One models leaf](https://know.2nth.ai/explainers/agents/system-one-models) and the [CTO briefing](https://know.2nth.ai/briefings/typed-decisions).

## What it demonstrates

Six scenarios, each one Jev call with three to six questions, a plain-code branch on the answers, and a naive rules baseline for contrast:

| Scenario | Shows |
|---|---|
| Support triage | Route, urgency and escalation in one call |
| Agent tool-call gate | A calibrated risk score inside the agent loop |
| Content moderation | Per-category probabilities with different thresholds |
| Lead scoring | Fuzzy judgement to sortable, routable values |
| Model routing | Send each prompt to the cheapest model that can handle it |
| Phishing: one question vs five | Decomposition: five narrow signals weighted in code beat one fuzzy question |

Every scenario has a **paraphrase** input with the same meaning but none of the keywords, so the rules baseline breaks while Jev still answers.

The dashboard also has a **cascade calculator**: what a month of decisions costs when Jev handles the clear majority, a frontier model the hard minority, and people the low-confidence residue.

## Layout

```
src/scenarios.js   the six scenarios (state, questions, act(), rules baseline, code snippet)
src/replay.js      recorded SAMPLE responses in the documented shape, used when there are no credits
src/jev.js         minimal Jev client (fetch)
src/worker.js      Cloudflare Worker: serves public/ and proxies /api/decide with the key server-side
src/demo.js        CLI runner
public/index.html  the dashboard
wrangler.jsonc     Worker config, pinned to the 2nth Cloudflare account
```

## Live vs sample mode

The Worker calls Jev for real when the `JEV_API_KEY` secret is set and the account has credits. If Jev answers `402 insufficient_credits`, or no key is set, the Worker returns the recorded sample for the scenario's two built-in inputs and labels it as a sample. Edited inputs need live mode.

The samples in `src/replay.js` are hand-written illustrative values in the documented response format. They are not Jev output.

## Run locally

```bash
npm install
cp .env.example .env        # then paste the key
cp .env .dev.vars           # wrangler reads secrets from .dev.vars in dev
npm run dev                 # dashboard on http://localhost:8787
npm run demo                # CLI, live
npm run demo:replay         # CLI, recorded samples
```

## Deploy

```bash
npx wrangler secret put JEV_API_KEY   # paste when prompted
npm run deploy
```

## Things the evidence says to keep in mind

From the independent evaluations summarised on know.2nth.ai:

- Threshold on the maximum probability, not the `confidence` field.
- Calibrate per question on your own traffic. Yes/no answers ran underconfident, choice and score ran overconfident.
- Put organisational rules in the state or in code. The model was near chance on rules it could not see, while stating high probability.
- Give every choice an explicit `none_of_these` option.
- Pin a model version (for example `jev-1.13.0`) before tuning thresholds.
