# How to Commit This Repo to GitHub

Step-by-step instructions for getting the entire `stride-os-repo/` folder onto GitHub safely.

**Time required:** ~10 minutes if you have GitHub already set up.

---

## Before You Start

**You need:**
1. A GitHub account (free at github.com)
2. Git installed on your computer (https://git-scm.com/downloads)
3. The `stride-os-repo/` folder downloaded from this session

**If you don't have Git installed yet:**
- Mac: open Terminal, type `git --version`. If it prompts you to install Xcode Command Line Tools, accept.
- Windows: download from https://git-scm.com/download/win and run the installer with defaults.
- Linux: `sudo apt install git` or equivalent.

---

## Step 1: Create the GitHub Repository

1. Go to https://github.com/new
2. Repository name: `stride-os` (or whatever you prefer — `coachlab` or `stride-os-app` also work)
3. Description: "Pacing calculator and training reference tool for running coaches"
4. **Visibility:** Choose **Private** for now. You can make it public later. Private keeps your work safe while you iterate.
5. **DO NOT** check "Initialize this repository with a README" — we already have one
6. **DO NOT** add a .gitignore or license through GitHub — we already have those
7. Click **Create repository**

GitHub will show you a page with setup commands. Keep that page open — you'll need the URL.

---

## Step 2: Download the Repo Folder to Your Computer

The repo lives at `/mnt/user-data/outputs/stride-os-repo/` in this session.

**Download options:**
- Use the file browser in this Claude session to download `stride-os-repo` as a folder/zip
- Or have Claude package it for you and send the zip

Place the unzipped folder somewhere convenient like `~/Documents/stride-os-repo/` or `~/Desktop/stride-os-repo/`.

---

## Step 3: Open Terminal and Navigate to the Folder

```bash
cd ~/Documents/stride-os-repo
# or wherever you saved it
```

Verify you're in the right place:

```bash
ls
```

You should see: `README.md`, `LICENSE`, `.gitignore`, and folders `app/`, `docs/`, `data/`, `backend/`.

---

## Step 4: Initialize Git

```bash
git init
git branch -M main
```

This creates a new local Git repository and sets the default branch to `main`.

---

## Step 5: Configure Git (first time only)

If you've never used Git on this computer:

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

Use the same email you used for your GitHub account.

---

## Step 6: Stage and Commit All Files

```bash
git add .
git status
```

`git status` will show you a long list of files that will be committed. Skim it — make sure nothing surprising is there. You should see all the files in `app/`, `docs/`, `data/`, `backend/`, plus the top-level files.

Then commit:

```bash
git commit -m "Initial commit: STRIDE OS beta with stripped Sources page and backend scaffolding"
```

---

## Step 7: Connect to GitHub and Push

Copy the URL GitHub gave you in Step 1. It looks like:
```
https://github.com/YOUR-USERNAME/stride-os.git
```

Connect your local repo to GitHub:

```bash
git remote add origin https://github.com/YOUR-USERNAME/stride-os.git
git push -u origin main
```

GitHub will prompt for credentials. If it asks for a password, use a **Personal Access Token** (PAT) instead of your GitHub password — GitHub no longer accepts passwords for git operations. To create one:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name like "stride-os local"
4. Check the `repo` scope
5. Click Generate
6. Copy the token and use it as your "password" when Git asks

(Alternatively, install GitHub CLI with `brew install gh` (Mac) or download it, then run `gh auth login` and follow the prompts.)

---

## Step 8: Verify on GitHub

Refresh your GitHub repo page. You should see all the files there — README, docs, app, data, backend.

If you see them: **you're done.** Your work is now safely backed up on GitHub.

---

## What You Just Accomplished

- All four strategy documents preserved (MASTER_PLAN, NORTH_STAR, BRIDGE_MAP, BACKEND_ARCHITECTURE)
- The Sources Library is captured as a separate file (SOURCES_LIBRARY.md + backup)
- The app file is in version control — every future change is tracked
- The validation corpus CSV is stored
- The Supabase backend scaffolding is committed
- Plain-language TOS and Privacy Policy are there
- A `.gitignore` prevents accidental secret commits
- A LICENSE is in place

If anything ever goes wrong with the app, you can recover any previous version with:

```bash
git log --oneline
# pick a commit hash from the list
git checkout <hash> -- app/stride-os.html
```

---

## What to Do Going Forward

Every time we make changes to the app or docs in future Claude sessions:

1. Download the updated files
2. Replace the files in your local `stride-os-repo/` folder
3. Run:
   ```bash
   git add .
   git commit -m "Brief description of what changed"
   git push
   ```

That's it. Two commands, three lines.

---

## If You Get Stuck

**"git: command not found"** — Git isn't installed. Install it first (see Before You Start).

**"Permission denied (publickey)"** — Use HTTPS URL instead of SSH (the URL ending in `.git`). Or set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

**"Authentication failed"** — You used your GitHub password. Create a Personal Access Token instead (Step 7).

**"Repository not found"** — Double-check the URL. Make sure your GitHub account name is in the URL.

**Still stuck?** Bring the error to a future Claude session and we'll work through it.

---

## What NOT to Do

- **Never commit** the `.env` file or any file containing API keys, passwords, or secrets. The `.gitignore` already blocks common patterns, but stay alert.
- **Never commit** real coach or athlete data to the repo. That data belongs in Supabase (private database), not GitHub (public-ish code repo).
- **Never `git push --force`** unless you really know what you're doing. It can destroy history.

---

**Last updated:** May 21, 2026
**Companion:** see `README.md` at the root of the repo for project overview.
