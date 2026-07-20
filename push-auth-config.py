#!/usr/bin/env python3
"""BUG-038 fix — surgically align hosted Supabase auth config with repo intent:
site_url, uri_allow_list, and branded email subjects/templates.

Deliberately does NOT touch smtp_* (SUPABASE_SMTP_PASSWORD is not on disk;
a blank would break all auth mail) or rate_limit_* fields (config push CLI
default would drop email_sent 30/hr -> 2/hr).

RUN (Anthoney): python3 "/Users/anthoney/Documents/AnthoneyOS/Products/StrideOS/push-auth-config.py"

Snapshots the pre-change values of ONLY the fields being changed (sanitized —
no SMTP or other secret material) to gitignored tmp/auth-config-pre.json,
applies the PATCH, then against a fresh GET verifies (a) every requested field
took exactly and (b) every OTHER hosted field is unchanged before vs after —
exits nonzero with a diff if either check fails."""
import json, subprocess, sys, tomllib, urllib.request

REPO = "/Users/anthoney/Documents/AnthoneyOS/Products/StrideOS"
REF = "njadrabgodqpzpbgkkbs"
API = f"https://api.supabase.com/v1/projects/{REF}/config/auth"


def token():
    raw = subprocess.run(["security", "find-generic-password", "-s", "Supabase CLI", "-w"],
                         capture_output=True, text=True).stdout.strip()
    if raw.startswith("go-keyring-base64:"):
        import base64
        raw = base64.b64decode(raw.split(":", 1)[1]).decode()
    if not raw:
        sys.exit("⛔ no Supabase CLI token in keychain — run `supabase login` first")
    return raw


TOKEN = token()


def call(method, body=None):
    req = urllib.request.Request(
        API, data=json.dumps(body).encode() if body else None,
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method=method)
    with urllib.request.urlopen(req) as r:
        return json.load(r)


with open(f"{REPO}/supabase/config.toml", "rb") as f:
    cfg = tomllib.load(f)
auth = cfg["auth"]
tpl = auth["email"]["template"]


def tpl_content(name):
    with open(f"{REPO}/supabase/templates/{name}.html") as f:
        return f.read()


body = {
    "site_url": auth["site_url"],
    "uri_allow_list": ",".join(auth["additional_redirect_urls"]),
}
for key in ("confirmation", "email_change", "invite", "magic_link", "recovery"):
    body[f"mailer_subjects_{key}"] = tpl[key]["subject"]
    body[f"mailer_templates_{key}_content"] = tpl_content(key)

# 1. Record pre-change values of ONLY the fields we change (rollback record,
#    sanitized: none of these carry SMTP/secret material). tmp/ is gitignored.
pre = call("GET")
with open(f"{REPO}/tmp/auth-config-pre.json", "w") as f:
    json.dump({k: pre.get(k) for k in body}, f, indent=2)
print(f"Pre-change hosted config: site_url={pre.get('site_url')!r} "
      f"uri_allow_list={pre.get('uri_allow_list')!r} "
      f"(changed-fields snapshot → tmp/auth-config-pre.json, gitignored)")

# 2. Apply.
call("PATCH", body)

# 3. Verify against a fresh GET as the authority (PATCH response could be
#    partial or stale): every requested field took exactly, and every field we
#    did NOT request is byte-identical to its pre-change value.
final = call("GET")
show = lambda s: (s[:80] + "…") if isinstance(s, str) and len(s) > 80 else s
mismatches = {k: final.get(k) for k, v in body.items() if final.get(k) != v}
if mismatches:
    print("⛔ PATCH did not fully apply. Fields still wrong on the hosted project:")
    for k, got in mismatches.items():
        print(f"  {k}: want {show(body[k])!r}, hosted has {show(got)!r}")
    sys.exit(1)

tampered = sorted(k for k in set(pre) | set(final)
                  if k not in body and final.get(k) != pre.get(k))
if tampered:
    # Values withheld on purpose — untouched fields include SMTP material.
    print("⛔ Fields OUTSIDE the requested set changed during the PATCH "
          "(names only, values withheld): " + ", ".join(tampered))
    print("   Inspect in the Supabase dashboard before relying on auth email.")
    sys.exit(1)

untouched = len([k for k in pre if k not in body])
print("✓ Verified on hosted project (fresh GET):")
print(f"  site_url = {final['site_url']}")
print(f"  uri_allow_list = {final['uri_allow_list']}")
print(f"  confirmation subject = {final['mailer_subjects_confirmation']!r}")
print(f"  all {untouched} non-requested fields (incl. smtp_*, rate_limit_*) "
      f"verified unchanged before vs after")
print("✓ Done. New signup confirmation emails now link to the real site.")
print("  (Old emails still hold dead localhost links — users must resend.)")
