# DLP Dispatcher v0.5.3

This build hardens fixed-booking protection and expands TEST-mode diagnostics without changing the v0.5.2 recommendation philosophy.

## Booking safety
- Hard anchors require at least 5 minutes of residual slack after walk, queue, attraction time and onward travel are counted.
- Hard-anchor candidates with under 5 minutes remaining are rejected.
- Candidates with 5 to 9 minutes remaining are allowed but visibly marked TIGHT FIT.
- Soft plans keep the existing zero-slack feasibility rule.

## TEST packet diagnostics
- Lists active MUST, WANT and SKIP priorities.
- Explains whether priority attractions are eligible or why they were excluded.
- Reports score, onward walk, anchor consumption and anchor slack for recommendations.
- Includes the next three eligible candidates after the top three.
- Reports whether the next anchor is HARD or SOFT, its applied buffer and the hard-anchor residual-slack rule.

## Intent
Protect fixed reservations first, while making test packets detailed enough to diagnose why the engine chose or rejected an attraction without dumping the entire live board.
