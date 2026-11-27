---
name: principle-prove-it-works
description: "Apply after completing a task, before declaring done. Verify against the real artifact (run the feature, read the actual value, inspect the diff), not a proxy, self-report, or 'it compiles.'"
disable-model-invocation: true
---

# Prove It Works

Verify every output by checking the real thing directly: run the feature, read the actual value, inspect the diff. Proxies (file mtimes, self-reports, cached output, "it compiles") do not count. When a check fails, suspect the observation method before the system.

Verify the process as well as the outcome. A correct result can rest on a broken process, and a review that checks results passes it: a clause reconstructed from the user's paste instead of the durable record, a constraint honored by chance from a file never read. For each fact you relied on, name the record it came from and confirm that record is the one the project's rules point at.

Red is a colour, not a measurement. A failing check proves the instrument only when the failure content is the disagreement you predicted. An exception, an empty collection against a non-empty literal, and a real mismatch all print red, so quote the assertion's diff (`Extra items in the right set`), never the assertion (`assert {...} == {...}`). A convergence probe keys on behavior only the new artifact can produce, never an identity field the old one also emits. A same-SHA restart lets old code report the new commit SHA.

Script the check when you can. A deterministic script that reruns the comparison beats a one-time look. Keep its output where the human can see it, and commit it only when the trail must be auditable later.
