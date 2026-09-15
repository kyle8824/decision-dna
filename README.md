# Decision DNA Web — Deployable Prototype

A static, zero-backend website demonstrating the Decision DNA causal-provenance concept.

## What it does

The live browser experiment:

1. gives a deterministic agent current observations, goals and persistent memories
2. computes the original supplier decision
3. removes each enabled memory one at a time
4. replays the decision
5. measures the effect on the winner-vs-runner-up decision margin
6. marks a memory PIVOTAL when removing it flips the action
7. generates a causal fingerprint and copyable Decision DNA JSON record

Everything runs locally in the browser. There is no database and no API key.

## Deploy

This is a static site. Vercel can deploy it directly from the repository root with no build command.

## Local test

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Files

- `index.html` — page structure and research/product presentation
- `styles.css` — responsive visual design
- `app.js` — complete deterministic Decision DNA experiment
- `PROTOCOL.md` — draft protocol description

## Next version

Decision DNA 0.2 should add a real LLM adapter. Because LLMs are stochastic, each intervention should be run multiple times so the site measures changes in `P(action | original context)` versus `P(action | intervention)`.
