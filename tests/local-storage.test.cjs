const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../luftblasen.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../luftblasen.html"), "utf8");
const key = "luftblasen.progress.v1";

// Run the actual game script and event handlers against a minimal DOM and shared storage.
class Element {
  constructor() {
    this.textContent = "";
    this.className = "";
    this.children = [];
    this.dataset = {};
    this.listeners = {};
    this.style = { setProperty() {} };
    this.classList = {
      contains: (name) => this.className.split(" ").includes(name),
      toggle: (name, force = !this.classList.contains(name)) => {
        const classes = new Set(this.className.split(" ").filter(Boolean));
        force ? classes.add(name) : classes.delete(name);
        this.className = [...classes].join(" ");
      },
      add: (name) => this.classList.toggle(name, true),
      remove: (name) => this.classList.toggle(name, false)
    };
  }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  fire(name) { this.listeners[name]?.({ target: this }); }
  setAttribute() {}
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); }
  replaceChildren() { this.children = []; }
  querySelectorAll() { return this.children; }
  getBoundingClientRect() { return { width: 390, height: 780 }; }
  remove() {}
}

function openGame(storage = new Map(), options = {}) {
  const elements = new Map();
  const themes = [...html.matchAll(/class="splash-theme[^\"]*" type="button" data-theme="([^\"]+)"/g)]
    .map((match) => Object.assign(new Element(), { dataset: { theme: match[1] } }));
  function element(selector) {
    if (!elements.has(selector)) {
      if (selector.startsWith("#")) {
        assert.ok(html.includes(`id="${selector.slice(1)}"`), `Missing markup for ${selector}`);
      }
      elements.set(selector, new Element());
    }
    return elements.get(selector);
  }
  element("#difficulty").value = "3";
  element("#music-enabled").checked = true;
  element("#pops-enabled").checked = true;
  element(".game-shell").dataset.theme = "classic";
  const context = vm.createContext({
    document: {
      querySelector: element,
      querySelectorAll: () => themes,
      createElement: () => new Element(),
      body: new Element(),
      addEventListener() {}
    },
    window: {
      localStorage: {
        getItem(name) {
          if (options.blockRead) throw new Error("Storage denied");
          return storage.get(name) ?? null;
        },
        setItem(name, value) {
          if (options.blockWrite) throw new Error("Quota or access denied");
          storage.set(name, value);
        }
      },
      matchMedia: () => ({ matches: true }),
      requestAnimationFrame() {}, setTimeout() {}, clearTimeout() {}
    },
    Audio: class { constructor() { this.src = ""; } pause() {} play() { return Promise.resolve(); } }
  });
  vm.runInContext(source, context);
  const run = (code) => vm.runInContext(code, context);
  return {
    element, themes, run,
    saved: () => JSON.parse(storage.get(key)),
    finish(points = 1234) {
      element("#start-game").fire("click");
      run(`score = ${points}; round = 8; activePlayTime = 65432.75; bestStreak = 4; bubblesPopped = 30; lives = 1; loseLife("Time up.");`);
    }
  };
}

test("completed runs persist all stats and survive a page reload", () => {
  const storage = new Map();
  const game = openGame(storage);
  game.finish();
  const [entry] = game.saved().scores;
  assert.equal(entry.score, 1234);
  assert.equal(entry.difficulty, 3);
  assert.equal(entry.round, 8);
  assert.equal(entry.timePlayedMs, 65432);
  assert.equal(entry.bestStreak, 4);
  assert.equal(entry.bubblesPopped, 30);
  assert.equal(entry.theme, "classic");
  assert.equal(entry.scoringVersion, 1);
  assert.ok(Number.isFinite(Date.parse(entry.date)));
  assert.equal(game.element("#end-record").hidden, false);
  assert.match(game.element("#end-best").textContent, /Medium best: 1,234/);
  game.run("saveCompletedRun(); showEndScreen();");
  assert.equal(game.saved().scores.length, 1, "End screen must not duplicate results");
  const reloaded = openGame(storage);
  assert.equal(reloaded.element("#personal-best").textContent, "1,234");
  assert.equal(reloaded.element("#high-scores-list").children.length, 1);
});

test("each difficulty keeps its 10 highest scores; ties do not earn a new-record message", () => {
  const game = openGame();
  for (let score = 100; score <= 1200; score += 100) game.finish(score);
  game.finish(1200);
  assert.equal(game.element("#end-record").hidden, true);
  assert.deepEqual(game.saved().scores.map((entry) => entry.score),
    [1200, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400]);
  game.element("#difficulty").value = "5";
  game.element("#difficulty").fire("input");
  assert.equal(game.element("#personal-best").textContent, "No scores yet");
  game.finish(50);
  assert.equal(game.saved().scores.length, 11);
  assert.match(game.element("#end-best").textContent, /Hard best: 50/);
});

test("theme, difficulty and both sound preferences restore, including Random", () => {
  const storage = new Map();
  const game = openGame(storage);
  game.themes.find((theme) => theme.dataset.theme === "random").fire("click");
  game.element("#difficulty").value = "2";
  game.element("#difficulty").fire("input");
  for (const selector of ["#music-enabled", "#pops-enabled"]) {
    game.element(selector).checked = false;
    game.element(selector).fire("change");
  }
  const reloaded = openGame(storage);
  assert.equal(Number(reloaded.element("#difficulty").value), 2);
  assert.equal(reloaded.element("#difficulty-name").textContent, "Casual");
  assert.equal(reloaded.element("#music-enabled").checked, false);
  assert.equal(reloaded.element("#pops-enabled").checked, false);
  assert.ok(reloaded.themes.find((theme) => theme.dataset.theme === "random").classList.contains("active"));
  reloaded.finish();
  assert.ok(["classic", "bavarian", "shamrock", "classical", "boardgame", "theme1776", "chess"]
    .includes(reloaded.saved().scores[0].theme), "Save the actual theme used by the run");
  assert.equal(reloaded.saved().settings.theme, "random");
});

test("unfinished runs are excluded and run difficulty is fixed at the start", () => {
  const game = openGame();
  game.element("#start-game").fire("click");
  game.run("score = 999; exitToSplash();");
  assert.equal(game.saved().scores.length, 0);
  game.element("#start-game").fire("click");
  game.element("#difficulty").value = "5";
  assert.equal(game.run("currentPressure().baseDifficulty"), 3);
  game.run("score = 777; lives = 1; loseLife('Time up.');");
  assert.equal(game.saved().scores[0].difficulty, 3);
});

test("corrupted data and invalid settings fall back safely", () => {
  for (const value of ["broken JSON", "null", JSON.stringify({ version: 1,
    settings: { difficulty: 99, theme: "missing", music: "false", pops: null },
    scores: [null, {}, { score: -1 }] })]) {
    const game = openGame(new Map([[key, value]]));
    assert.equal(Number(game.element("#difficulty").value), 3);
    assert.equal(game.element("#music-enabled").checked, true);
    assert.equal(game.element(".game-shell").dataset.theme, "classic");
    game.finish();
    assert.equal(game.saved().scores.length, 1);
  }
});

test("denied or full storage does not interrupt play, and shows a session-only notice", () => {
  for (const blockRead of [true, false]) {
    const game = openGame(new Map(), { blockRead, blockWrite: true });
    game.finish();
    assert.equal(game.element("#personal-best").textContent, "1,234");
    assert.equal(game.element("#end-record").hidden, false);
    assert.match(game.element("#storage-note").textContent, /Saving is unavailable/);
    assert.match(game.element("#end-storage-note").textContent, /Saving is unavailable/);
    assert.equal(game.run("gameOver"), true);
  }
});

test("valid scores survive while invalid or obsolete scoring entries are dropped", () => {
  const storage = new Map();
  openGame(storage).finish();
  const saved = JSON.parse(storage.get(key));
  const entry = saved.scores[0];
  saved.scores.push({ ...entry, score: -1 }, { ...entry, date: "invalid" },
    { ...entry, scoringVersion: 0 }, { ...entry, difficulty: 8 },
    { ...entry, theme: "unknown" });
  storage.set(key, JSON.stringify(saved));
  const reloaded = openGame(storage);
  assert.equal(reloaded.saved().scores.length, 1);
  assert.equal(reloaded.element("#personal-best").textContent, "1,234");
});
