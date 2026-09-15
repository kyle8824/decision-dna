# Decision DNA Guardian — Product Architecture

## Product thesis

Autonomous agents can fail even when their code is functioning correctly. Their behavior can drift because of accumulated memories, stale beliefs, poisoned sources, over-weighted experiences, or bad plans. Traditional logs show what happened. Decision DNA is designed to help determine what captured context materially influenced a decision, then test repairs before changing the live agent.

## Product promise

**Debug why your AI agent changed behavior.**

The first product is not a general-purpose AI platform. It is an agent-debugging and behavioral-observability layer.

## Core loop

1. **Instrument** — the host agent emits Decision DNA records for consequential decisions.
2. **Observe** — decisions, retrieved memories, tool results, plans, sources and outcomes are linked into a behavioral timeline.
3. **Detect** — Guardian identifies drift, anomalous source dependence, repeated bad outcomes, or sudden changes in decision distribution.
4. **Trace** — suspicious behavior is traced backward through memory/source lineage.
5. **Replay** — candidate influences are removed, masked, replaced or down-weighted in a sandboxed replay.
6. **Measure** — compare action distributions, margins, tool choices or outcomes across repeated trials.
7. **Repair** — Guardian proposes a minimal intervention.
8. **Approve** — high-impact repairs require policy or human approval.
9. **Verify** — replay and post-change monitoring determine whether the repair improved behavior.

## System layers

### 1. Work agents

Existing coding, research, procurement, support, farm, scheduling or other agents. Decision DNA should not require developers to replace their agent framework.

### 2. Instrumentation SDK

The SDK captures:
- agent and run identity
- goals and observations
- retrieved memory IDs
- tool calls and tool results
- candidate influences and provenance
- final action and alternatives
- optional stated reason
- outcome

The instrumentation layer must remain small, inspectable and framework-neutral.

### 3. Event store / behavioral graph

Append-only storage for Decision DNA records and influence nodes. The graph links:

`source -> observation -> memory -> reflection -> belief -> plan -> decision -> action -> outcome`

Not every host agent will expose every node type. The protocol therefore allows partial graphs.

### 4. Replay engine

Reconstructs the original captured decision context and applies controlled interventions such as:
- remove memory
- mask source
- replace observation
- down-weight belief
- alter retrieved-memory set
- remove tool result
- test combinations

For deterministic agents, one replay may be sufficient. For stochastic LLM agents, interventions require repeated trials and distributional comparison.

### 5. Guardian

Guardian is separate from the work agent. It reads the collective Decision DNA history and answers operator questions such as:
- Why did this agent start behaving differently?
- Which memory most influences this decision pattern?
- Which external source has the most behavioral influence?
- When did the drift begin?
- Is the agent overreacting to one rare event?
- Which repair is least destructive?

Guardian should distinguish:
- **stated reason** — what the work agent says influenced it
- **observed association** — correlations in the historical record
- **measured intervention sensitivity** — behavior changes observed in controlled replay

### 6. Repair planner

Repairs are proposed, not silently executed by default. Candidate actions include:
- reduce confidence of stale memory
- quarantine a source
- recompute a derived belief
- modify retrieval policy
- expire a memory
- add balancing evidence
- roll back agent configuration

Each repair should be tested in replay before production application.

## Safety model

The work agent must not be the sole authority over its own audit history. A compromised or drifted agent could otherwise rewrite the evidence used to judge it.

Recommended properties:
- append-only event ingestion
- source and event fingerprints
- separation between work-agent write permissions and Guardian analysis permissions
- explicit approval gates for destructive repairs
- never delete original evidence when a repair can instead supersede or quarantine it
- record every repair as another Decision DNA event

## v1 scope

The first useful version should support **one instrumented agent** and do five things well:

1. collect decision records
2. show a chronological behavioral timeline
3. detect a meaningful decision-pattern change
4. replay a suspicious decision with selected memories removed
5. produce a Guardian diagnosis and repair proposal

No multi-tenant enterprise features, billing system, complex RBAC, vector database or framework marketplace until this loop works on a real agent.

## First dogfood target

Use a persistent agent with actual memory. Grok Bot Farm is a strong test environment because learning is visible and the system already needs to answer whether Bob or Alice genuinely changed behavior because of past experience.

Example test:

- Day 8: Bob learns that wet wood burns poorly.
- Day 73: Bob chooses to build covered wood storage.
- Decision DNA captures the retrieved Day-8 memory.
- Replay Day-73 decision without that memory across repeated trials.
- Guardian reports whether the behavior materially changes.

That is a much stronger demonstration than a synthetic supplier example because it tests persistent learning over time.

## Near-term implementation order

### Milestone A — protocol + SDK
- Decision DNA JSON schema
- zero-dependency reference SDK
- example instrumentation
- local validation tests

### Milestone B — event viewer
- ingest local JSON records
- timeline
- lineage graph
- filters by agent/source/memory

### Milestone C — Guardian debugger
- anomaly/drift rules
- natural-language incident summary
- suspicious influence ranking
- replay plan generation

### Milestone D — replay service
- adapter interface for deterministic and LLM agents
- repeated trials
- probability deltas and confidence intervals
- intervention comparison

### Milestone E — repair workflow
- propose repair
- replay repair
- human approval
- apply and monitor

## Positioning

Avoid leading with "causal provenance infrastructure." The developer-facing message should be:

> **Debug why your AI agent changed behavior.**

Decision DNA is the underlying protocol. Guardian is the operator-facing product.
