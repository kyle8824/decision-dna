# Decision DNA Protocol — Draft 0.1

Decision DNA is an experimental causal-provenance layer for autonomous agents.

## Principle

A system SHOULD distinguish:

- `stated_reason`: what a model reports as the reason for its action
- `measured_influence`: what changes when a candidate influence is experimentally removed or perturbed

Decision DNA focuses on measured influence.

## Minimal experiment

1. Capture the baseline context.
2. Obtain the baseline decision.
3. Select candidate influences such as memories.
4. Apply one controlled intervention.
5. Replay the decision.
6. Record whether the action changes and how the decision margin changes.
7. Repeat for the remaining influences.
8. Link influences to their source provenance.
9. Fingerprint the resulting record.

## Future causal genealogy

source -> observation -> memory -> reflection -> belief -> plan -> decision -> action -> result -> new memory

## Stochastic models

For LLM-backed agents, run each condition N times and compare action distributions. A single replay is insufficient to cleanly distinguish causal impact from sampling noise.
