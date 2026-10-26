# Unpushed commits — backup & restore instructions

## Situation
The dev sandbox has no GitHub credentials (no SSH key, no `gh` CLI, no token).
All work is safely committed locally on `main`, but 5 commits are ahead of
`origin/main` (GitHub, `shaswatandfriends/MyZipVault`).

Last commit on GitHub: `261bc1b` (fix: Add Credentials + ALL green asChild buttons now have white text)

Unpushed commits (oldest → newest):
| # | Commit | What it is |
|---|--------|------------|
| 1 | ecb9f8b | Workspace restoration (untrack skills dir, ignore governance) |
| 2 | 9bbe310 | **P0 fix**: app did not run as pushed (invalid CSS → 500 on every route) + local embedded Postgres setup |
| 3 | 5f6337e | Canonical DECISION-REGISTER.md (release scope freeze + batch schedule) |
| 4 | 71e012a | **Security**: P0 consent + IDOR fixes (share expiry/revocation, reference UUID links, checklist ownership) + AUDIT.md |
| 5 | 24c4dbc | Dual VaultProfessional + VaultRecruiter landing feeds + onboarding state-dropdown fix (D7) |

## Option A — owner provides a GitHub Personal Access Token (best)
1. Owner creates a fine-grained PAT at GitHub → Settings → Developer settings →
   Personal access tokens, scoped to `MyZipVault` repo, **Contents: Read and write**.
2. Paste the token in chat. The agent will run:
   `git push https://<TOKEN>@github.com/shaswatandfriends/MyZipVault.git main`
3. Token can be revoked immediately after the push.

## Option B — owner pushes from their own machine using this backup
1. Download `myzipvault-b1-b2.bundle` from this folder.
2. On a machine with the repo + GitHub auth:
   ```
   cd MyZipVault
   git fetch /path/to/myzipvault-b1-b2.bundle main:batch-b1-b2
   git push origin batch-b1-b2:main      # or merge locally first, then push
   ```
   (Or verify first: `git log --oneline main..batch-b1-b2`)

## Option C — patches (no bundle tooling needed)
The `patches/` folder contains the same 5 commits as standard `.patch` files:
```
git am patches/*.patch    # applies in order on top of 261bc1b
```
Note: patch 0001 is large (~63 MB) because it removes previously-committed
platform files (skills dir) — the bundle is the cleaner path.
