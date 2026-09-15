export class DecisionDNA {
  constructor({ agentId, model = null, clock = () => new Date().toISOString() } = {}) {
    if (!agentId) throw new Error("DecisionDNA requires agentId");
    this.agentId = agentId;
    this.model = model;
    this.clock = clock;
    this.influences = new Map();
    this.records = [];
  }

  addInfluence({ id, kind, content = null, source = null, confidence = null, parentIds = [], createdAt = null, ...extra }) {
    if (!id) throw new Error("Influence requires id");
    if (!kind) throw new Error("Influence requires kind");
    const node = {
      id,
      kind,
      source,
      content,
      confidence,
      parent_ids: parentIds,
      created_at: createdAt,
      ...extra
    };
    this.influences.set(id, node);
    return node;
  }

  beginDecision({ decisionId, runId = null, goal = null, observations = [], retrievedMemoryIds = [], toolCallIds = [], metadata = {} } = {}) {
    if (!decisionId) throw new Error("Decision requires decisionId");
    const used = [...new Set(retrievedMemoryIds)].map(id => this.influences.get(id) || { id, kind: "other" });

    return {
      version: "0.2",
      decision_id: decisionId,
      agent_id: this.agentId,
      run_id: runId,
      timestamp: this.clock(),
      decision: null,
      context: {
        goal,
        observations,
        retrieved_memory_ids: [...retrievedMemoryIds],
        tool_call_ids: [...toolCallIds],
        model: this.model,
        ...metadata
      },
      influences: used,
      counterfactuals: [],
      outcome: null,
      fingerprint: null
    };
  }

  commitDecision(record, { action, alternatives = [], statedReason = null, confidence = null, ...extra }) {
    if (!record) throw new Error("Missing decision record");
    record.decision = {
      action,
      alternatives,
      stated_reason: statedReason,
      confidence,
      ...extra
    };
    record.fingerprint = this.fingerprint(record);
    this.records.push(record);
    return record;
  }

  addCounterfactual(record, { type = "remove", targetIds = [], description = null, action = null, actionChanged = null, probabilityDelta = null, marginDelta = null, trials = null, ...extra }) {
    if (!record) throw new Error("Missing decision record");
    const cf = {
      intervention: { type, target_ids: [...targetIds], description },
      result: {
        action,
        action_changed: actionChanged,
        probability_delta: probabilityDelta,
        margin_delta: marginDelta,
        trials,
        ...extra
      }
    };
    record.counterfactuals.push(cf);
    record.fingerprint = this.fingerprint(record);
    return cf;
  }

  attachOutcome(record, outcome) {
    record.outcome = outcome;
    record.fingerprint = this.fingerprint(record);
    return record;
  }

  lineage(influenceId) {
    const visited = new Set();
    const walk = id => {
      if (visited.has(id)) return { id, cycle: true };
      visited.add(id);
      const node = this.influences.get(id);
      if (!node) return { id, missing: true };
      return {
        ...node,
        parents: (node.parent_ids || []).map(walk)
      };
    };
    return walk(influenceId);
  }

  export() {
    return JSON.parse(JSON.stringify(this.records));
  }

  fingerprint(value) {
    const json = stableStringify({ ...value, fingerprint: null });
    let h1 = 0xdeadbeef ^ json.length;
    let h2 = 0x41c6ce57 ^ json.length;
    for (let i = 0; i < json.length; i++) {
      const ch = json.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ((h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0")).toUpperCase();
  }
}

function stableStringify(value) {
  const seen = new WeakSet();
  const normalize = input => {
    if (input === null || typeof input !== "object") return input;
    if (seen.has(input)) throw new TypeError("Cannot fingerprint cyclic object");
    seen.add(input);
    if (Array.isArray(input)) return input.map(normalize);
    const output = {};
    for (const key of Object.keys(input).sort()) output[key] = normalize(input[key]);
    return output;
  };
  return JSON.stringify(normalize(value));
}
