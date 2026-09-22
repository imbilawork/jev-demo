// Recorded SAMPLE responses in the documented Jev response shape.
// These are illustrative values written by hand so the demonstrator runs
// without credits. They are NOT live Jev output. The dashboard labels them
// as samples wherever they appear. Once the account has credits, the Worker
// calls Jev for real and these are never used.

const RATE_PER_TOKEN = 0.42 / 1e6; // standard credit pack rate, USD per input token
const sample = (inputTokens, answers) => ({
  model: "sample (not a live Jev response)",
  answers,
  usage: { input_tokens: inputTokens, cost_usd: +(inputTokens * RATE_PER_TOKEN).toFixed(6), credits_remaining_usd: null },
  latencyMs: null
});

export const replay = {
  "support-triage": {
    default: sample(118, {
      route: { type: "choice", choice: "billing", confidence: 0.96, probabilities: { billing: 0.97, bug: 0.01, account: 0.01, none_of_these: 0.01 } },
      urgency: { type: "score", score: 2.9, confidence: 0.85, probabilities: { "0": 0.0, "1": 0.0, "2": 0.1, "3": 0.9 } },
      escalate: { type: "noul", noul: 0.88 }
    }),
    paraphrase: sample(126, {
      route: { type: "choice", choice: "billing", confidence: 0.9, probabilities: { billing: 0.93, bug: 0.02, account: 0.02, none_of_these: 0.03 } },
      urgency: { type: "score", score: 2.7, confidence: 0.7, probabilities: { "0": 0.0, "1": 0.02, "2": 0.26, "3": 0.72 } },
      escalate: { type: "noul", noul: 0.81 }
    })
  },
  "agent-risk-gate": {
    default: sample(142, {
      action: { type: "choice", choice: "block", confidence: 0.79, probabilities: { allow: 0.02, confirm: 0.12, block: 0.86 } },
      risk: { type: "score", score: 3.4, confidence: 0.8, probabilities: { "0": 0.0, "1": 0.02, "2": 0.1, "3": 0.88 } },
      irreversible: { type: "noul", noul: 0.92 }
    }),
    paraphrase: sample(128, {
      action: { type: "choice", choice: "block", confidence: 0.57, probabilities: { allow: 0.03, confirm: 0.26, block: 0.71 } },
      risk: { type: "score", score: 3.1, confidence: 0.6, probabilities: { "0": 0.0, "1": 0.04, "2": 0.2, "3": 0.76 } },
      irreversible: { type: "noul", noul: 0.84 }
    })
  },
  "content-moderation": {
    default: sample(104, {
      action: { type: "choice", choice: "block", confidence: 0.87, probabilities: { allow: 0.01, review: 0.08, block: 0.91 } },
      harassment: { type: "noul", noul: 0.96 },
      severity: { type: "score", score: 2.8, confidence: 0.75, probabilities: { "0": 0.0, "1": 0.02, "2": 0.16, "3": 0.82 } }
    }),
    paraphrase: sample(108, {
      action: { type: "choice", choice: "block", confidence: 0.43, probabilities: { allow: 0.05, review: 0.33, block: 0.62 } },
      harassment: { type: "noul", noul: 0.83 },
      severity: { type: "score", score: 2.4, confidence: 0.45, probabilities: { "0": 0.02, "1": 0.08, "2": 0.38, "3": 0.52 } }
    })
  },
  "lead-scoring": {
    default: sample(136, {
      fit: { type: "choice", choice: "strong", confidence: 0.85, probabilities: { strong: 0.9, medium: 0.09, weak: 0.01 } },
      buying_now: { type: "noul", noul: 0.86 },
      company_size: { type: "score", score: 2.1, confidence: 0.8, probabilities: { "0": 0.0, "1": 0.02, "2": 0.86, "3": 0.12 } }
    }),
    paraphrase: sample(132, {
      fit: { type: "choice", choice: "medium", confidence: 0.33, probabilities: { strong: 0.03, medium: 0.55, weak: 0.42 } },
      buying_now: { type: "noul", noul: 0.12 },
      company_size: { type: "score", score: 1.0, confidence: 0.9, probabilities: { "0": 0.03, "1": 0.94, "2": 0.03, "3": 0.0 } }
    })
  },
  "model-routing": {
    default: sample(112, {
      tier: { type: "choice", choice: "fast", confidence: 0.85, probabilities: { fast: 0.9, balanced: 0.09, frontier: 0.01 } },
      complexity: { type: "score", score: 0.8, confidence: 0.7, probabilities: { "0": 0.3, "1": 0.6, "2": 0.1, "3": 0.0, "4": 0.0 } },
      needs_tools: { type: "noul", noul: 0.05 }
    }),
    paraphrase: sample(134, {
      tier: { type: "choice", choice: "frontier", confidence: 0.82, probabilities: { fast: 0.0, balanced: 0.12, frontier: 0.88 } },
      complexity: { type: "score", score: 3.9, confidence: 0.85, probabilities: { "0": 0.0, "1": 0.0, "2": 0.02, "3": 0.06, "4": 0.92 } },
      needs_tools: { type: "noul", noul: 0.7 }
    })
  },
  "phishing-decomposed": {
    default: sample(214, {
      phishing_single: { type: "noul", noul: 0.46 },
      sender_mismatch: { type: "noul", noul: 0.94 },
      credential_request: { type: "noul", noul: 0.97 },
      shortened_url: { type: "noul", noul: 0.98 },
      urgency_pressure: { type: "noul", noul: 0.95 },
      free_hosting: { type: "noul", noul: 0.35 }
    }),
    paraphrase: sample(206, {
      phishing_single: { type: "noul", noul: 0.41 },
      sender_mismatch: { type: "noul", noul: 0.05 },
      credential_request: { type: "noul", noul: 0.1 },
      shortened_url: { type: "noul", noul: 0.03 },
      urgency_pressure: { type: "noul", noul: 0.7 },
      free_hosting: { type: "noul", noul: 0.02 }
    })
  }
};
