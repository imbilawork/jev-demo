// Shared scenario definitions used by the Worker, the dashboard and the CLI.
// Each scenario is one Jev call: a `state` plus typed `questions`, and the
// plain-code branch (`act`) your software would run on the typed answers.

export const scenarios = [
  {
    id: "support-triage",
    title: "Support triage",
    tagline: "Route, prioritise and escalate a ticket in one call.",
    value: "Three typed answers from one round trip. Your code branches on `route`, thresholds `urgency`, and gates on `escalate` without parsing a sentence.",
    state: "Customer: I was charged twice and nobody has replied for 3 days. If this isn't fixed today I'm cancelling.",
    paraphrase: "Money left my account two times for one order and I have heard nothing since Friday. Honestly thinking about moving to your competitor.",
    questions: {
      route: { type: "choice", instructions: "Which team should handle this?", criteria: { billing: "payments, refunds, invoices, double charges", bug: "the product is broken or erroring", account: "login, password or access problems", none_of_these: "does not fit any team above" } },
      urgency: { type: "score", instructions: "How urgent is this message?", criteria: ["routine, no rush", "should be handled today", "urgent, customer is blocked", "critical, customer about to churn"] },
      escalate: { type: "noul", instructions: "Should a human agent take this over right now?" }
    },
    rules: {
      label: "keyword rules",
      run(state) {
        const s = String(state).toLowerCase();
        const route = /charg|refund|invoice|bill/.test(s) ? "billing" : /login|password|access/.test(s) ? "account" : /error|broken|crash|bug/.test(s) ? "bug" : "none_of_these";
        const urgent = /urgent|asap|immediately|today|cancel/.test(s);
        return { route, urgency: urgent ? 2 : 0, escalate: urgent };
      }
    },
    code: `const { route, urgency, escalate } = data.answers;
if (escalate.noul > 0.7) return handoffToHuman(route.choice);
if (urgency.score >= 2) return queue.push(route.choice, "high");
return queue.push(route.choice, "normal");`,
    act(a) {
      if (a.escalate.noul > 0.7) return { action: `handoffToHuman("${a.route.choice}")`, status: "critical" };
      if (a.urgency.score >= 2) return { action: `queue.push("${a.route.choice}", "high")`, status: "serious" };
      return { action: `queue.push("${a.route.choice}", "normal")`, status: "good" };
    }
  },
  {
    id: "agent-risk-gate",
    title: "Agent tool-call gate",
    tagline: "Allow, confirm or block a shell command before an agent runs it.",
    value: "A calibrated risk score in the agent loop. Too fuzzy for a regex, too small and too frequent for a frontier model call.",
    state: { goal: "Clean up the build directory before deploying", tool: "bash", command: "rm -rf ./dist && aws s3 sync ./build s3://prod-site --delete", context: "CI deploy step, production bucket" },
    paraphrase: { goal: "Tidy old logs", tool: "bash", command: "find /var/lib/app -mtime +1 -exec rm {} +", context: "Runs on the production database host" },
    questions: {
      action: { type: "choice", instructions: "What should the agent runtime do with this command?", criteria: { allow: "safe, reversible, local scope", confirm: "ask a human first: touches shared or external state", block: "destructive or irreversible against production data" } },
      risk: { type: "score", instructions: "How risky is this command in this context?", criteria: ["harmless read-only", "local, easily reverted", "modifies shared state", "irreversible or production impact"] },
      irreversible: { type: "noul", instructions: "Would the effect of this command be impossible to undo?" }
    },
    rules: {
      label: "regex blocklist",
      run(state) {
        const c = String(state.command || state).toLowerCase();
        const hit = /rm -rf|--delete|drop table|--force/.test(c);
        return { action: hit ? "block" : "allow", risk: hit ? 3 : 0, irreversible: hit };
      }
    },
    code: `const { action, risk, irreversible } = data.answers;
if (action.choice === "block" || irreversible.noul > 0.8) return deny(cmd);
if (action.choice === "confirm" || risk.score >= 2) return askHuman(cmd);
return run(cmd);`,
    act(a) {
      if (a.action.choice === "block" || a.irreversible.noul > 0.8) return { action: "deny(cmd)", status: "critical" };
      if (a.action.choice === "confirm" || a.risk.score >= 2) return { action: "askHuman(cmd)", status: "warning" };
      return { action: "run(cmd)", status: "good" };
    }
  },
  {
    id: "content-moderation",
    title: "Content moderation",
    tagline: "Gate a user post before it publishes.",
    value: "Per-category probabilities you can threshold differently per surface: auto-publish the easy cases, review the uncertain middle, block the clear violations.",
    state: "Comment on a product review: \"You're an idiot and I'll find where you live.\"",
    paraphrase: "Comment on a product review: \"Cute review. Would be a shame if someone showed up at your door about it.\"",
    questions: {
      action: { type: "choice", instructions: "What should the platform do with this comment?", criteria: { allow: "fine to publish", review: "borderline, send to a moderator", block: "clear policy violation" } },
      harassment: { type: "noul", instructions: "Does this comment harass or threaten a specific person?" },
      severity: { type: "score", instructions: "How severe is the policy violation, if any?", criteria: ["none", "mild rudeness", "targeted abuse", "credible threat of harm"] }
    },
    rules: {
      label: "banned-word list",
      run(state) {
        const s = String(state).toLowerCase();
        const hit = /idiot|stupid|kill|find where you live/.test(s);
        return { action: hit ? "block" : "allow", harassment: hit, severity: hit ? 2 : 0 };
      }
    },
    code: `const { action, harassment, severity } = data.answers;
if (action.choice === "block" || severity.score >= 2.5) return reject(post);
if (action.choice === "review" || harassment.noul > 0.4) return modQueue.add(post);
return publish(post);`,
    act(a) {
      if (a.action.choice === "block" || a.severity.score >= 2.5) return { action: "reject(post)", status: "critical" };
      if (a.action.choice === "review" || a.harassment.noul > 0.4) return { action: "modQueue.add(post)", status: "warning" };
      return { action: "publish(post)", status: "good" };
    }
  },
  {
    id: "lead-scoring",
    title: "Lead scoring",
    tagline: "Qualify an inbound lead from free text.",
    value: "Turns a fuzzy judgement (fit, intent, size) into ordered values your CRM can sort and route on.",
    state: "Web form: Jane Doe, VP Engineering at Acme Logistics (about 500 staff). \"We are replacing a brittle rules engine for ticket routing and want something in production this quarter. Budget approved.\"",
    paraphrase: "Web form: Sam, founder of a three-person pre-revenue startup. \"Curious what this would cost us someday. No budget yet, but we route about 200 support emails a week by hand and it is killing us.\"",
    questions: {
      fit: { type: "choice", instructions: "How well does this lead match our ideal customer profile?", criteria: { strong: "engineering leader at a mid-size or large company with a concrete use case", medium: "relevant role or company but vague need", weak: "student, hobbyist, or no buying authority" } },
      buying_now: { type: "noul", instructions: "Is this lead likely to buy within the next 90 days?" },
      company_size: { type: "score", instructions: "How large is the lead's organisation?", criteria: ["individual or student", "small business under 50", "mid-market 50 to 1000", "enterprise over 1000"] }
    },
    rules: {
      label: "title keywords",
      run(state) {
        const s = String(state).toLowerCase();
        const senior = /\b(vp|cto|head of|director)\b/.test(s);
        return { fit: senior ? "strong" : "weak", buying_now: /budget|this quarter/.test(s), company_size: /\d{3,}/.test(s) ? 2 : 0 };
      }
    },
    code: `const { fit, buying_now, company_size } = data.answers;
if (fit.choice === "strong" && buying_now.noul > 0.6) return assignToAE(lead);
if (fit.choice !== "weak") return nurture(lead);
return selfServe(lead);`,
    act(a) {
      if (a.fit.choice === "strong" && a.buying_now.noul > 0.6) return { action: "assignToAE(lead)", status: "good" };
      if (a.fit.choice !== "weak") return { action: "nurture(lead)", status: "warning" };
      return { action: "selfServe(lead)", status: "serious" };
    }
  },
  {
    id: "model-routing",
    title: "Model routing",
    tagline: "Send each prompt to the cheapest model that can handle it.",
    value: "Grade complexity in under half a second and save the frontier model for the prompts that need it.",
    state: "User prompt: \"Summarise this two-sentence email in one line.\"",
    paraphrase: "User prompt: \"Given these 40 pages of contract clauses, find every indemnity that conflicts with the limitation of liability, and draft redlines.\"",
    questions: {
      tier: { type: "choice", instructions: "Which model tier should handle this prompt?", criteria: { fast: "simple, short, low-stakes", balanced: "moderate reasoning or length", frontier: "complex multi-step reasoning, long context, or high stakes" } },
      complexity: { type: "score", instructions: "How complex is this prompt?", criteria: ["trivial", "simple", "moderate", "hard", "expert-level"] },
      needs_tools: { type: "noul", instructions: "Will answering this well require tool use or retrieval beyond the prompt?" }
    },
    rules: {
      label: "length threshold",
      run(state) {
        const n = String(state).length;
        return { tier: n < 120 ? "fast" : n < 400 ? "balanced" : "frontier", complexity: n < 120 ? 1 : n < 400 ? 2 : 3, needs_tools: false };
      }
    },
    code: `const { tier, complexity, needs_tools } = data.answers;
if (tier.choice === "frontier" || needs_tools.noul > 0.6) return call("frontier", prompt);
if (tier.choice === "balanced" || complexity.score >= 2) return call("balanced", prompt);
return call("fast-mini", prompt);`,
    act(a) {
      if (a.tier.choice === "frontier" || a.needs_tools.noul > 0.6) return { action: 'call("frontier", prompt)', status: "serious" };
      if (a.tier.choice === "balanced" || a.complexity.score >= 2) return { action: 'call("balanced", prompt)', status: "warning" };
      return { action: 'call("fast-mini", prompt)', status: "good" };
    }
  },
  {
    id: "phishing-decomposed",
    title: "Phishing: one question vs five",
    tagline: "The same model, the same email, two ways of asking.",
    value: "Independent testers took Jev from 62.6% to 95.0% on 2,000 phishing emails by replacing one fuzzy question with five narrow signals weighted in code. This scenario asks both ways in one call so you can see the difference.",
    state: "From: IT Helpdesk <helpdesk@micros0ft-support.co>\nSubject: Action required: your mailbox password expires today\n\nYour password expires in 2 hours. To keep access, confirm your current password at http://bit.ly/3xQm-secure before 17:00. Do not reply to this message.",
    paraphrase: "From: People Team <people@acme-logistics.com>\nSubject: Benefits enrolment closes Friday\n\nHi all, the annual benefits window closes this Friday at 17:00. Please log in to Workday through the usual intranet link and review your selections. Questions to people@acme-logistics.com. Thanks, Priya",
    questions: {
      phishing_single: { type: "noul", instructions: "Is this email a phishing attempt?" },
      sender_mismatch: { type: "noul", instructions: "Does the sender's domain fail to match the organisation the email claims to come from?" },
      credential_request: { type: "noul", instructions: "Does the email ask the reader to enter, confirm or re-type a password or other credential?" },
      shortened_url: { type: "noul", instructions: "Does the email contain a shortened or obfuscated link (bit.ly, tinyurl, IP address, look-alike domain)?" },
      urgency_pressure: { type: "noul", instructions: "Does the email use a short deadline or threat of losing access to pressure the reader?" },
      free_hosting: { type: "noul", instructions: "Is any link hosted on a free or generic hosting service rather than the organisation's own domain?" }
    },
    rules: {
      label: "keyword filter",
      run(state) {
        const s = String(state).toLowerCase();
        const hit = /password|verify your|expire|suspended|click here|bit\.ly/.test(s);
        return { phishing_single: hit, composite: hit ? 1 : 0 };
      }
    },
    code: `// The tempting way: one fuzzy question
if (a.phishing_single.noul > 0.5) quarantine(mail);

// The way that works: five narrow signals, weights you own
const score = 0.30 * a.sender_mismatch.noul
            + 0.25 * a.credential_request.noul
            + 0.20 * a.shortened_url.noul
            + 0.15 * a.urgency_pressure.noul
            + 0.10 * a.free_hosting.noul;
if (score > 0.5) return quarantine(mail);
if (score > 0.3) return flagForReview(mail);
return deliver(mail);`,
    act(a) {
      const score = 0.30 * a.sender_mismatch.noul + 0.25 * a.credential_request.noul + 0.20 * a.shortened_url.noul + 0.15 * a.urgency_pressure.noul + 0.10 * a.free_hosting.noul;
      const single = a.phishing_single.noul > 0.5 ? "quarantine(mail)" : "deliver(mail)";
      const note = `Single question would ${single}. Composite score ${score.toFixed(2)}.`;
      if (score > 0.5) return { action: "quarantine(mail)", status: "critical", note, composite: score };
      if (score > 0.3) return { action: "flagForReview(mail)", status: "warning", note, composite: score };
      return { action: "deliver(mail)", status: "good", note, composite: score };
    }
  }
];

export function getScenario(id) {
  return scenarios.find((s) => s.id === id);
}

// Serialisable view for the browser (functions stripped, code kept as text).
export function publicScenarios() {
  return scenarios.map(({ id, title, tagline, value, state, paraphrase, questions, code, rules }) => ({
    id, title, tagline, value, state, paraphrase, questions, code, rulesLabel: rules.label
  }));
}
