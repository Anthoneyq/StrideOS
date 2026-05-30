# Deploy Steps — STRIDE OS Auth + Branding Fix

The sandbox couldn't run git/rm in your Stride OS folder due to macOS file permissions. Run the steps below in Terminal yourself, then verify in the browser.

---

## 1. Delete the stuck git lock file

Open Terminal and run:

```bash
cd "/Users/anthoney/Stride OS"
rm -f .git/index.lock
```

If `rm` refuses, use Finder: `Cmd+Shift+G` → paste `/Users/anthoney/Stride OS/.git/` → drag `index.lock` to Trash.

---

## 2. Remove duplicate HTML files

There are five HTML files in the repo but only `index.html` is needed for Vercel.

```bash
cd "/Users/anthoney/Stride OS"
git rm stride-os-1.html
rm -f stride-os-2.html stride-os-3.html stride-os-4.html
```

(`stride-os-2/3/4.html` are not git-tracked, so plain `rm` is enough.)

---

## 3. Set the Resend SMTP password as an env var

Get your Resend API key from https://resend.com/api-keys (or wherever you stored it after creating it). Then:

```bash
export SUPABASE_SMTP_PASSWORD='re_your_resend_api_key_here'
```

Add the same line to your `~/.zshrc` (or `~/.bash_profile`) so it persists.

---

## 4. Push the new config to Supabase

```bash
cd "/Users/anthoney/Stride OS"
supabase db push                  # picks up the new migration nothing-new state
supabase config push              # pushes config.toml + templates to remote
```

If `supabase config push` doesn't pick up the SMTP block (older CLI versions don't), set it manually in the Supabase dashboard:

1. https://supabase.com/dashboard/project/uvjrflkzgulxwrlrqowp/settings/auth
2. Scroll to **SMTP Settings** → enable **Custom SMTP**
3. Host: `smtp.resend.com`
4. Port: `465`
5. Username: `resend`
6. Password: your Resend API key (`re_...`)
7. Sender email: `admin@thecoachlab.app`
8. Sender name: `STRIDE OS`
9. Save.

Then under **Email Templates**, paste the contents of:
- `supabase/templates/confirmation.html` into "Confirm signup"
- `supabase/templates/magic_link.html` into "Magic Link"
- `supabase/templates/invite.html` into "Invite user"
- `supabase/templates/recovery.html` into "Reset Password"
- `supabase/templates/email_change.html` into "Change Email Address"

Set each subject line to what's in `config.toml`.

---

## 5. Commit and push to GitHub (triggers Vercel redeploy)

```bash
cd "/Users/anthoney/Stride OS"
git add index.html supabase/config.toml supabase/templates/ DEPLOY_STEPS.md
git status                        # review what's staged
git commit -m "Auto-sync on login + Resend SMTP + STRIDE OS branded emails

- ensureCoachProfileSilent() runs on auto-login so athletes sync to
  Supabase from the very first session, not only after the coach clicks
  'Sync Local Data'
- Custom SMTP via Resend in supabase/config.toml so transactional mail
  comes from admin@thecoachlab.app, not 'Supabase Auth'
- Five STRIDE OS-branded email templates (confirmation, magic link,
  invite, recovery, email change) — removes 'powered by Supabase' footer
- Consolidate to single index.html for Vercel deployment"
git push origin main
```

Vercel will redeploy automatically when the push lands on `main`.

---

## 6. Verify end-to-end

1. **Open an incognito window** (so no localStorage interference).
2. Go to https://stride-os-gray.vercel.app
3. Enter your email → click "Send Magic Link".
4. **Check inbox:** sender should now say "STRIDE OS" (from admin@thecoachlab.app), not "Supabase Auth". Subject: "Your STRIDE OS sign-in link". Body should be dark with the orange STRIDE OS brand.
5. Click the link → you should land back in the app, signed in.
6. Add a test athlete in the roster.
7. Sign out → sign back in from a **different browser** (e.g., Safari if you used Chrome).
8. The athlete you added should still be there. If yes, Phase 2 data persistence is real.

---

## What this fix actually solves

| Before | After |
|---|---|
| Email sender: "Supabase Auth" via Supabase default SMTP | Sender: "STRIDE OS" via Resend, from admin@thecoachlab.app |
| Email body: stock Supabase copy + "powered by Supabase ⚡" footer | STRIDE OS-branded dark templates |
| Athletes added in first session silently failed to reach the cloud | Coach profile auto-provisions on login; every save syncs |
| Five duplicate HTML files in the repo | One `index.html` (canonical for Vercel) |

---

## What's NOT done yet (so you know)

- **Workouts.** `DB.workouts` is scaffolded but no UI writes to it yet. When the workouts feature lands, we'll need a `workouts` table + migration + sync wiring. Deferred until the feature exists.
- **DNS / domain verification in Resend.** If `thecoachlab.app` isn't verified in Resend (DKIM/SPF), delivery to Gmail/Yahoo may go to spam. Check https://resend.com/domains.
- **Lawyer review** of TOS and Privacy Policy (still marked beta).
