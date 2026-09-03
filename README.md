# Luftblasen

Luftblasen is a fast math puzzle game built with plain HTML, CSS, and JavaScript. Pop bubbles to add up to the target number without going over, keep the timer alive, and chase a higher score through themed rounds.

The current version is a browser remake of the original iPhone game.

## Play

Open the published game:

[https://davidbreyer.github.io/luftblasen/](https://davidbreyer.github.io/luftblasen/)

Or open `index.html` / `luftblasen.html` directly in a browser from this repo. No build step or package install is required.

## Rules

Each round gives you a target number. Pop numbered bubbles until your current sum equals the target exactly.

![Regular bubble](assets/luftblasen/images/bubble.png)

- If your sum matches the target, you score points and move to the next round.
- If your sum goes over the target, you lose a life and the current selection is cleared.
- If the timer runs out, it counts like a failed round: you lose a life and the current selection is cleared.
- The game ends when you run out of lives.

The end screen shows your final score, time played, and round reached, with options to play again or return to theme selection.

## Scoring

Exact matches score from the target, the number of bubbles used, any bonus bubbles, the active multiplier, and how much time is left on the timer.

- More time left means a larger time bonus.
- Unnumbered power-up bubbles can be worth 2x, 3x, or 4x. They stack up to 6x and multiply the next exact match, including the time bonus.
- Bonus bubbles add an extra fixed score bonus on top of their larger number value.

## Timer

The timer starts fresh each round. Popping bubbles adds a little time back, so quick decisions keep the run alive.

- Regular bubbles add a small amount of time.
- Bonus bubbles add more time than regular bubbles.
- Multiplier bubbles add the most time.
- Higher difficulty levels give smaller time rewards and shorter round timers.

## Special Bubbles

Bonus bubbles are worth larger numbers and give a larger timer reward when popped.

![Bonus bubble](assets/luftblasen/images/bubblebonus.png)

Unnumbered bubbles are multiplier power-ups and do not add to the current sum. Each theme's three bubble artworks represent 2x, 3x, and 4x power-ups, letting the artwork show without a number over it. They stack into a one-shot score multiplier for the next exact sum, capped at 6x.

![Multiplier bubble](assets/luftblasen/images/bubblemultiplier.png)

## Themes

The game includes multiple themes with their own visuals and music:

- Classic
- Bavarian Beer Hall
- Shamrock
- Classical
- Board Game
- 1776
- Chess

Music and pop sounds can be toggled separately from the title screen, so the game can be played with pops only, music only, both, or neither.

## Difficulty

The title screen difficulty slider changes the pace of the game:

- Higher difficulty makes bubbles move faster.
- Higher difficulty allows more bubbles on the board.
- Higher difficulty shortens the timer and reduces time rewards.
- Later rounds gradually become more demanding.

## Project Files

- `index.html` - published entry point and launcher.
- `luftblasen.html` - game markup.
- `luftblasen.css` - themes, layout, responsive game UI, and bubble styling.
- `luftblasen.js` - game state, scoring, timer, audio, and bubble logic.
- `assets/luftblasen/` - original and rebuilt image, music, and sound assets.

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
