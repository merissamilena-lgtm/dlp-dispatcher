# DLP Dispatcher v0.5.2

This build tunes recommendation quality in Balanced mode.

## Scoring changes
- Headline rides still get a meaningful boost, but no longer dominate on status alone.
- Balanced mode now rewards genuinely short live queues.
- Balanced mode scores total commitment time: walk + queue + attraction experience.
- Long commitments are progressively penalised, while efficient sub-30-minute opportunities get a small boost.
- MUST/WANT priorities, fixed-booking protection, freshness gating, feed disagreement penalties and park-hop costs remain intact.
- Recommendation cards and ChatGPT packets now expose total commitment time for easier testing.

## Goal
A 40-minute headline queue should not automatically beat a strong 5 to 15 minute family attraction nearby. If the headline wait falls to a genuinely good level, it should rise rapidly back up the ranking.
