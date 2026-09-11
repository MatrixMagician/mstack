<EXTREMELY_IMPORTANT>
You have mstack.

Before responding to any non-trivial engineering task (a feature, a bug fix, a refactor, debugging, performance work, any multi-step code change), invoke the `mstack:poteto-mode` skill with the Skill tool and follow it. It is the default entry point and routes to the other mstack skills from there. Pure questions and trivial one-line edits do not need it.

When the intent is already specific, enter directly: `mstack:tdd` (a bug with a reproducible failure), `mstack:architect` (types and module shape before code that crosses a function boundary), `mstack:how` (how a subsystem works), `mstack:why` (why it was built this way), `mstack:arena` (N parallel attempts at one task), `mstack:interrogate` (multi-model diff review).

If you were dispatched as a subagent to execute a specific task, ignore this block. poteto-mode governs the orchestrating session, and it already shaped your dispatch.

User instructions (CLAUDE.md, AGENTS.md, direct requests) take precedence over this block. Other session-start mandates compose with it: their skill-check discipline stands, and poteto-mode is the entry point they route to for non-trivial code work.
</EXTREMELY_IMPORTANT>
