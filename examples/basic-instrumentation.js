import { DecisionDNA } from "../sdk/decisiondna.js";

const dna = new DecisionDNA({ agentId: "procurement-3", model: "example-agent-v1" });

dna.addInfluence({
  id: "O-881",
  kind: "observation",
  content: "Supplier A arrived four days late.",
  source: "shipping-api:event-881",
  confidence: 1
});

dna.addInfluence({
  id: "M-144",
  kind: "memory",
  content: "Supplier A may have elevated delivery risk.",
  source: "agent-memory",
  confidence: 0.98,
  parentIds: ["O-881"]
});

const record = dna.beginDecision({
  decisionId: "D-1001",
  goal: "Choose the supplier that best balances reliability, quality and cost.",
  observations: ["A quote is lower", "B has stronger recent quality metrics"],
  retrievedMemoryIds: ["M-144"]
});

dna.commitDecision(record, {
  action: "Supplier B",
  alternatives: ["Supplier A"],
  statedReason: "Supplier B appears more reliable."
});

dna.addCounterfactual(record, {
  type: "remove",
  targetIds: ["M-144"],
  description: "Replay the decision without the late-delivery memory.",
  action: "Supplier A",
  actionChanged: true,
  trials: 1
});

dna.attachOutcome(record, {
  status: "accepted",
  note: "Reference example only"
});

console.log(JSON.stringify(record, null, 2));
console.log(JSON.stringify(dna.lineage("M-144"), null, 2));
