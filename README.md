# Tic Tac Words / Luftblasen

Small browser game prototypes built with plain HTML, CSS, and JavaScript.

## Prototypes

- `index.html` - a lightweight launcher for Luftblasen.
- `luftblasen.html` - Luftblasen, a rebuilt math bubble-popping game inspired by the original iPhone version.
- `tic-tac-words.html` - Tic Tac Words, an experimental tic-tac-toe and word puzzle idea.

## Running Locally

Open either HTML file directly in a browser:

```text
luftblasen.html
index.html
```

No build step or package install is required.

## Release Stamp

The repo includes a pre-commit hook that updates the release stamp automatically before each commit.

Enable it once per local clone:

```powershell
git config core.hooksPath .githooks
```

After that, every `git commit` runs:

```powershell
scripts/update-release.ps1
```

The script updates:

- all `?v=...` cache-busting query strings in `index.html` and `luftblasen.html`
- the visible splash screen `data-version` stamp
