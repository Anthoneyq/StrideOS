# STRIDE OS — current context

Updated 2026-09-14 from README and local repository inspection; live release state not audited here.

- Belongs to: the CoachLab app for coaches, under the CoachLab B2B umbrella (Anthoney 2026-09-24). Company note: `Business/CoachLab/CURRENT.md`.
- Objective: roster intelligence, training paces and coaching decisions for track/cross-country; README describes a beta used by a closed group of coaches.
- Status: existing static application in `index.html`, Supabase backend in `supabase/`; current uncommitted work must be inspected before edits. Do not replace or stage another task's changes.
- Approved boundaries: source/data integrity and coach-facing meaning must survive changes. Mathematical/domain decisions live in the relevant method/source docs; do not derive new prescriptions from stale rollout summaries.
- Open decisions/current work: no product change authorized by the AI-system refactor. Confirm the next requested scope and verify current release facts only when relevant.
- Sources: `README.md` for entry points; `BUGS.md` and task-relevant `docs/`, `Model_Docs/`, `Formulas/`, `Data_Validation/` for evidence. Older dated handoffs are historical; the README's reference to this file as a stub is superseded by this note.
- Verification: reuse the tests covering the requested change; distinguish source/build, local browser and deployed backend evidence. A push can deploy; ask before each push/deployment.
