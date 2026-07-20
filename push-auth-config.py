#!/usr/bin/env python3
"""BUG-038 fix — surgically align hosted Supabase auth config with repo intent:
site_url, uri_allow_list, and branded email subjects/templates.

Deliberately does NOT touch smtp_* (SUPABASE_SMTP_PASSWORD is not on disk;
a blank would break all auth mail) or rate_limit_* fields (config push CLI
default would drop email_sent 30/hr -> 2/hr).

RUN (Anthoney): python3 "/Users/anthoney/Documents/AnthoneyOS/Products/StrideOS/push-auth-config.py"

Records the pre-change hosted config to tmp/auth-config-pre.json, applies the
PATCH, then verifies EVERY requested field against a fresh GET — exits
nonzero with a field-by-field diff if anything did not take."""
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

# 1. Record pre-change state (oracle evidence + rollback reference).
pre = call("GET")
with open(f"{REPO}/tmp/auth-config-pre.json", "w") as f:
    json.dump(pre, f, indent=2)
print(f"Pre-change hosted config: site_url={pre.get('site_url')!r} "
      f"uri_allow_list={pre.get('uri_allow_list')!r} (saved to tmp/auth-config-pre.json)")

# 2. Apply.
call("PATCH", body)

# 3. Verify every requested field took — against a fresh GET as the authority,
#    in case the PATCH response is partial or stale.
final = call("GET")
mismatches = {k: final.get(k) for k, v in body.items() if final.get(k) != v}
if mismatches:
    print("⛔ PATCH did not fully apply. Fields still wrong on the hosted project:")
    for k, got in mismatches.items():
        want = body[k]
        show = lambda s: (s[:80] + "…") if isinstance(s, str) and len(s) > 80 else s
        print(f"  {k}: want {show(want)!r}, hosted has {show(got)!r}")
    sys.exit(1)

print("✓ Verified on hosted project (fresh GET, all requested fields exact):")
print(f"  site_url = {final['site_url']}")
print(f"  uri_allow_list = {final['uri_allow_list']}")
print(f"  confirmation subject = {final['mailer_subjects_confirmation']!r}")
print(f"  smtp_host untouched = {final.get('smtp_host')!r}, "
      f"rate_limit_email_sent untouched = {final.get('rate_limit_email_sent')!r}")
print("✓ Done. New signup confirmation emails now link to the real site.")
print("  (Old emails still hold dead localhost links — users must resend.)")
