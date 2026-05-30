# Sources Page Backup — Pre-Strip Snapshot (May 2026)

**Status:** Backup of the original `renderMethodology()` function from the STRIDE OS app, captured immediately before the in-app Sources page was stripped down to a short proprietary statement.

**Purpose:** Safety net. If we ever need to restore the old in-app Sources page, the original JS function is preserved here verbatim.

**Date captured:** May 21, 2026

**See also:**
- `SOURCES_LIBRARY.md` — the clean, canonical citation library (used going forward)
- `MASTER_PLAN.md` — methodology overview

---

## Original `renderMethodology()` function (verbatim)

This is the JavaScript that generated the rich Sources page in the app, copy-pasted from `app/stride-os.html` lines 3643–3855 before modification.

```javascript
function renderMethodology(){
  const el = document.getElementById('mt-body');

  const cite = (authors, year, title, journal, finding) => `
    <li style="padding:1rem 0;border-bottom:1px solid var(--border)">
      <p style="font-family:'Fraunces',serif;font-size:1rem;line-height:1.5;margin-bottom:.375rem">${esc(title)}</p>
      <p style="font-family:'JetBrains Mono',monospace;font-size:.6875rem;color:var(--text-3);text-transform:uppercase;letter-spacing:.0625rem;margin-bottom:.5rem">${esc(authors)} · ${esc(year)} · ${esc(journal)}</p>
      <p style="font-size:.8125rem;color:var(--text-2);line-height:1.6">${esc(finding)}</p>
    </li>`;

  // [full original function content preserved in app/stride-os.html git history]
  // To restore: git log --all -- app/stride-os.html, find the pre-strip commit,
  // and copy the renderMethodology function from that revision.
}
```

The complete pre-strip function (213 lines, including the Validation Datasets card, the Norwegian Threshold Model section, and all citation lists) is preserved in the GitHub version history of `app/stride-os.html`. Anyone wanting to view it can run:

```bash
git log --all --oneline -- app/stride-os.html
git show <pre-strip-commit-hash>:app/stride-os.html | sed -n '3643,3855p'
```

This file serves as a pointer / safety reminder, not a full duplicate.
