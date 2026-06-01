const playfield = document.querySelector("#playfield");
const targetTotal = document.querySelector("#target-total");
const fieldTargetTotal = document.querySelector("#field-target-total");
const fieldCurrentSum = document.querySelector("#field-current-sum");
const fieldScore = document.querySelector("#field-score");
const fieldRound = document.querySelector("#field-round");
const fieldLives = document.querySelector("#field-lives");
const currentSumText = document.querySelector("#current-sum");
const remainingTotal = document.querySelector("#remaining-total");
const sumMeter = document.querySelector("#sum-meter");
const scoreText = document.querySelector("#score");
const roundText = document.querySelector("#round");
const livesText = document.querySelector("#lives");
const multiplierText = document.querySelector("#multiplier-text");
const fieldMessage = document.querySelector("#field-message");
const difficultyInput = document.querySelector("#difficulty");
const difficultyName = document.querySelector("#difficulty-name");
const pauseButton = document.querySelector("#pause-game");
const newGameButton = document.querySelector("#new-game");
const clearButton = document.querySelector("#clear-selection");
const shell = document.querySelector(".game-shell");
const splashScreen = document.querySelector("#splash-screen");
const startButton = document.querySelector("#start-game");
const changeThemeButton = document.querySelector("#change-theme");
const popSound = new Audio("assets/luftblasen/Sounds/pop1.caf");

const bubbleColors = ["#9ee2ff", "#b9efc4", "#d8c3ff", "#ffe08a", "#a9d8ff"];

let bubbles = [];
let selected = [];
let score = 0;
let round = 1;
let lives = 5;
let target = 18;
let multiplier = 1;
let multiplierTurns = 0;
let paused = false;
let gameOver = false;
let bubbleId = 1;
let spawnTimer = 0;
let lastFrame = 0;
let started = false;

function startGame() {
  bubbles = [];
  selected = [];
  score = 0;
  round = 1;
  lives = 5;
  multiplier = 1;
  multiplierTurns = 0;
  paused = false;
  gameOver = false;
  started = true;
  bubbleId = 1;
  spawnTimer = 0;
  target = rollTarget();
  playfield.querySelectorAll(".bubble").forEach((bubble) => bubble.remove());
  for (let index = 0; index < 9; index += 1) {
    spawnBubble();
  }
  updateHud();
  setMessage("Pick bubbles that add exactly to the target. Only going over costs a life.");
}

function rollTarget() {
  const difficulty = Number(difficultyInput.value);
  return randomInt(12 + difficulty * 2 + round, 18 + difficulty * 6 + round * 2);
}

function spawnBubble(forceMultiplier = false) {
  if (gameOver) {
    return;
  }

  const rect = playfield.getBoundingClientRect();
  const size = randomInt(56, 88);
  const roll = Math.random();
  const isMultiplier = forceMultiplier || roll < 0.1;
  const isBonus = !isMultiplier && roll >= 0.1 && roll < 0.24;
  const baseValue = randomInt(1, Math.min(9 + Math.floor(round / 3), 15));
  const value = isMultiplier ? (Math.random() < 0.72 ? 2 : 3) : isBonus ? baseValue * 3 : baseValue;
  const bubble = document.createElement("button");
  const id = bubbleId;
  bubbleId += 1;
  bubble.className = `bubble${isMultiplier ? " multiplier" : ""}${isBonus ? " bonus" : ""}`;
  bubble.type = "button";
  bubble.dataset.id = id;
  bubble.dataset.value = value;
  bubble.dataset.kind = isMultiplier ? "multiplier" : isBonus ? "bonus" : "number";
  bubble.textContent = isMultiplier ? `${value}x` : value;
  bubble.style.setProperty("--size", `${size}px`);
  bubble.style.setProperty("--bubble-color", bubbleColors[randomInt(0, bubbleColors.length - 1)]);

  const x = randomInt(8, Math.max(10, rect.width - size - 8));
  const y = randomInt(Math.floor(rect.height * 0.24), Math.max(Math.floor(rect.height * 0.28), rect.height - size - 96));
  const position = findOpenPosition(size, rect, x, y);
  const drift = (Math.random() - 0.5) * 12;
  const difficulty = Number(difficultyInput.value);
  const speed = (4 + difficulty * difficulty * 2.15 + round * (0.25 + difficulty * 0.12)) / 1000;

  bubble.style.left = `${position.x}px`;
  bubble.style.top = `${position.y}px`;
  bubble.addEventListener("click", () => selectBubble(id));
  playfield.appendChild(bubble);

  bubbles.push({ id, element: bubble, value, isMultiplier, isBonus, x: position.x, y: position.y, drift, speed, size, selected: false });
}

function selectBubble(id) {
  if (paused || gameOver) {
    return;
  }

  const bubble = bubbles.find((item) => item.id === id);
  if (!bubble || bubble.selected) {
    return;
  }

  bubble.selected = true;

  if (bubble.isMultiplier) {
    multiplier = bubble.value;
    multiplierTurns = 3;
    popBubble(bubble);
    setMessage(`${bubble.value}x multiplier active for the next three exact sums.`);
    updateHud();
    return;
  }

  selected.push({ value: bubble.value, isBonus: bubble.isBonus });
  popBubble(bubble);
  const sum = selectedSum();

  if (sum > target) {
    loseLife("Too high. Selection cleared.");
    return;
  }

  if (sum === target) {
    scoreExactSum();
    return;
  }

  setMessage(`${target - sum} to go.`);
  updateHud();
}

function scoreExactSum() {
  const bonusCount = selected.filter((bubble) => bubble.isBonus).length;
  const points = target * 10 * multiplier + selected.length * 15 + bonusCount * 50;
  score += points;
  round += 1;
  selected = [];
  if (multiplierTurns > 0) {
    multiplierTurns -= 1;
    if (multiplierTurns === 0) {
      multiplier = 1;
    }
  }
  target = rollTarget();
  while (bubbles.length < 10) {
    spawnBubble();
  }
  if (round % 4 === 0) {
    spawnBubble(true);
  }
  setMessage(`Exact! +${points.toLocaleString()} points. New target ready.`);
  updateHud();
}

function loseLife(reason) {
  lives -= 1;
  selected = [];
  if (lives <= 0) {
    gameOver = true;
    paused = true;
    setMessage(`Game over. Final score: ${score.toLocaleString()}.`);
  } else {
    setMessage(`${reason} ${lives} ${lives === 1 ? "life" : "lives"} left.`);
  }
  updateHud();
}

function clearSelection() {
  selected = [];
  setMessage("Sum reset. Popped bubbles stay gone.");
  updateHud();
}

function popBubble(bubble) {
  bubble.element.classList.add("popped");
  bubbles = bubbles.filter((item) => item.id !== bubble.id);
  playPopSound();
  window.setTimeout(() => bubble.element.remove(), 170);
}

function playPopSound() {
  try {
    popSound.currentTime = 0;
    popSound.play().catch(() => {});
  } catch {
    // Audio is optional; gameplay should never depend on it.
  }
}

function selectedSum() {
  return selected.reduce((sum, bubble) => sum + bubble.value, 0);
}

function updateHud() {
  const sum = selectedSum();
  targetTotal.textContent = target;
  fieldTargetTotal.textContent = target;
  currentSumText.textContent = sum;
  fieldCurrentSum.textContent = sum;
  remainingTotal.textContent = sum <= target ? `${target - sum} to go` : `${sum - target} over`;
  scoreText.textContent = score.toLocaleString();
  fieldScore.textContent = score.toLocaleString();
  roundText.textContent = round;
  fieldRound.textContent = round;
  livesText.textContent = "♥".repeat(Math.max(0, lives));
  fieldLives.textContent = "♥".repeat(Math.max(0, lives));
  multiplierText.textContent = `${multiplier}x${multiplierTurns > 0 ? ` · ${multiplierTurns}` : ""}`;
  sumMeter.style.width = `${Math.min(100, (sum / target) * 100)}%`;
  sumMeter.style.background = sum > target ? "var(--danger)" : "linear-gradient(90deg, var(--accent), var(--good))";
}

function setMessage(text) {
  fieldMessage.textContent = text;
}

function tick(timestamp) {
  if (!lastFrame) {
    lastFrame = timestamp;
  }
  const delta = timestamp - lastFrame;
  lastFrame = timestamp;

  if (started && !paused && !gameOver) {
    updateBubbles(delta);
    spawnTimer += delta;
    const difficulty = Number(difficultyInput.value);
    const spawnEvery = Math.max(520, 3400 - difficulty * 430 - round * 24);
    const maxBubbles = 10 + difficulty * 2;
    if (spawnTimer >= spawnEvery && bubbles.length < maxBubbles) {
      spawnTimer = 0;
      spawnBubble();
    }
  }

  window.requestAnimationFrame(tick);
}

function updateBubbles(delta) {
  const rect = playfield.getBoundingClientRect();
  bubbles.forEach((bubble) => {
    if (bubble.selected) {
      return;
    }
    bubble.y -= bubble.speed * delta;
    bubble.x += Math.sin((bubble.y + bubble.id * 17) / 60) * bubble.drift * (delta / 1000);
    bubble.x = Math.max(4, Math.min(rect.width - bubble.size - 4, bubble.x));
    bubble.element.style.left = `${bubble.x}px`;
    bubble.element.style.top = `${bubble.y}px`;

    if (bubble.y < -bubble.size) {
      popBubble(bubble);
      spawnBubble();
    }
  });
}

function findOpenPosition(size, rect, preferredX, preferredY) {
  const minY = Math.floor(rect.height * 0.22);
  const maxY = Math.max(minY, rect.height - size - 90);
  const maxX = Math.max(8, rect.width - size - 8);
  const candidates = [{ x: preferredX, y: preferredY }];

  for (let index = 0; index < 45; index += 1) {
    candidates.push({
      x: randomInt(8, maxX),
      y: randomInt(minY, maxY)
    });
  }

  return candidates.find((candidate) => !overlapsExisting(candidate.x, candidate.y, size)) || candidates[0];
}

function overlapsExisting(x, y, size) {
  const padding = 10;
  return bubbles.some((bubble) => {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const otherX = bubble.x + bubble.size / 2;
    const otherY = bubble.y + bubble.size / 2;
    const distance = Math.hypot(centerX - otherX, centerY - otherY);
    return distance < (size + bubble.size) / 2 + padding;
  });
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

document.querySelectorAll(".splash-theme").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".splash-theme").forEach((theme) => theme.classList.remove("active"));
    button.classList.add("active");
    shell.dataset.theme = button.dataset.theme;
  });
});

difficultyInput.addEventListener("input", () => {
  updateDifficultyName();
});

pauseButton.addEventListener("click", () => {
  if (gameOver) {
    return;
  }
  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";
  setMessage(paused ? "Paused." : "Back in motion.");
});

newGameButton.addEventListener("click", () => {
  pauseButton.textContent = "Pause";
  startGame();
});

clearButton.addEventListener("click", clearSelection);

function updateDifficultyName() {
  const names = ["", "Easy", "Casual", "Medium", "Quick", "Hard"];
  difficultyName.textContent = names[Number(difficultyInput.value)];
}

startButton.addEventListener("click", () => {
  splashScreen.classList.add("hidden");
  document.body.classList.remove("show-splash");
  pauseButton.textContent = "Pause";
  startGame();
});

changeThemeButton.addEventListener("click", () => {
  paused = true;
  started = false;
  pauseButton.textContent = "Pause";
  playfield.querySelectorAll(".bubble").forEach((bubble) => bubble.remove());
  bubbles = [];
  selected = [];
  splashScreen.classList.remove("hidden");
  document.body.classList.add("show-splash");
});

window.selectBubble = selectBubble;

document.body.classList.add("show-splash");
updateDifficultyName();
updateHud();
window.requestAnimationFrame(tick);
