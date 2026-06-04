const playfield = document.querySelector("#playfield");
const targetTotal = document.querySelector("#target-total");
const fieldTargetTotal = document.querySelector("#field-target-total");
const fieldCurrentSum = document.querySelector("#field-current-sum");
const fieldScore = document.querySelector("#field-score");
const fieldRound = document.querySelector("#field-round");
const fieldLives = document.querySelector("#field-lives");
const fieldTime = document.querySelector("#field-time");
const timerStat = document.querySelector(".timer-stat");
const fieldTimerBar = document.querySelector("#field-timer-bar");
const fieldTimer = document.querySelector(".field-timer");
const currentSumText = document.querySelector("#current-sum");
const remainingTotal = document.querySelector("#remaining-total");
const sumMeter = document.querySelector("#sum-meter");
const scoreText = document.querySelector("#score");
const roundText = document.querySelector("#round");
const livesText = document.querySelector("#lives");
const multiplierText = document.querySelector("#multiplier-text");
const fieldMessage = document.querySelector("#field-message");
const fieldAnnouncement = document.querySelector("#field-announcement");
const announcementKicker = document.querySelector("#announcement-kicker");
const announcementValue = document.querySelector("#announcement-value");
const difficultyInput = document.querySelector("#difficulty");
const difficultyName = document.querySelector("#difficulty-name");
const musicToggle = document.querySelector("#music-enabled");
const popsToggle = document.querySelector("#pops-enabled");
const pauseButton = document.querySelector("#pause-game");
const shell = document.querySelector(".game-shell");
const splashScreen = document.querySelector("#splash-screen");
const startButton = document.querySelector("#start-game");
const howButton = document.querySelector("#how-to-play");
const howPanel = document.querySelector("#how-panel");
const closeHowButton = document.querySelector("#close-how");
const changeThemeButton = document.querySelector("#change-theme");
const endScreen = document.querySelector("#end-screen");
const endScore = document.querySelector("#end-score");
const endTime = document.querySelector("#end-time");
const endRound = document.querySelector("#end-round");
const playAgainButton = document.querySelector("#play-again");
const endChangeThemeButton = document.querySelector("#end-change-theme");
const popSound = new Audio("assets/luftblasen/Sounds/pop1.caf");
const backgroundMusic = new Audio();

const themeMusic = {
  classic: "assets/luftblasen/Music/music-theme-classic.mp3?v=20260603-2314",
  classical: "assets/luftblasen/Music/music-theme-classical-music.mp3?v=20260603-2314",
  bavarian: "assets/luftblasen/Music/music-theme-bavarian.mp3?v=20260603-2314",
  shamrock: "assets/luftblasen/Music/music-theme-shamrock.mp3?v=20260603-2314",
  boardgame: "assets/luftblasen/Music/music-theme-board-game.mp3?v=20260603-2314"
};

const playableThemes = Object.keys(themeMusic);
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
let audioContext;
let roundTimeLimit = 12000;
let roundTimeRemaining = 12000;
let activePlayTime = 0;
let announcementTimer;
let selectedThemeChoice = "classic";

backgroundMusic.loop = true;
backgroundMusic.volume = 0.45;
popSound.volume = 0.6;

function startGame() {
  applySelectedTheme();
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
  activePlayTime = 0;
  bubbleId = 1;
  spawnTimer = 0;
  target = rollTarget();
  resetRoundTimer();
  hideEndScreen();
  playfield.querySelectorAll(".bubble").forEach((bubble) => bubble.remove());
  for (let index = 0; index < 9; index += 1) {
    spawnBubble();
  }
  startThemeMusic({ restart: true });
  updateHud();
  setMessage("Pick bubbles that add exactly to the target. Only going over costs a life.");
  announceTarget("Target");
}

function rollTarget() {
  const pressure = currentPressure();
  return randomInt(
    12 + pressure.baseDifficulty * 2 + round,
    18 + Math.round(pressure.effectiveDifficulty * 6) + round * 2
  );
}

function rollRoundTimeLimit() {
  const pressure = currentPressure();
  return Math.max(5600, 15800 - pressure.baseDifficulty * 1150 - pressure.roundPressure * 680);
}

function currentPressure() {
  const baseDifficulty = Number(difficultyInput.value);
  const roundPressure = Math.min(5.5, Math.max(0, round - 1) * 0.32);
  return {
    baseDifficulty,
    roundPressure,
    effectiveDifficulty: Math.min(7.5, baseDifficulty + roundPressure)
  };
}

function resetRoundTimer() {
  roundTimeLimit = rollRoundTimeLimit();
  roundTimeRemaining = roundTimeLimit;
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
  const pressure = currentPressure();
  const speed = (4 + pressure.effectiveDifficulty * pressure.effectiveDifficulty * 1.35 + round * 0.18) / 1000;

  bubble.style.left = `${position.x}px`;
  bubble.style.top = `${position.y}px`;
  bubble.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    selectBubble(id);
  });
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
    const reward = addPopTime(bubble);
    popBubble(bubble);
    setMessage(`${bubble.value}x multiplier active. +${formatReward(reward)} seconds.`);
    updateHud();
    return;
  }

  selected.push({ value: bubble.value, isBonus: bubble.isBonus });
  const reward = addPopTime(bubble);
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

  setMessage(`${target - sum} to go. +${formatReward(reward)} seconds.`);
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
  resetRoundTimer();
  while (bubbles.length < 10) {
    spawnBubble();
  }
  if (round % 4 === 0) {
    spawnBubble(true);
  }
  setMessage(`Exact! +${points.toLocaleString()} points. New target ready.`);
  announceBoard("Next Target", target, "success");
  updateHud();
}

function loseLife(reason) {
  lives -= 1;
  selected = [];
  if (lives <= 0) {
    gameOver = true;
    paused = true;
    pauseThemeMusic();
    playGameOverSound();
    setMessage(`Game over. Final score: ${score.toLocaleString()}.`);
    showEndScreen();
  } else {
    resetRoundTimer();
    setMessage(`${reason} ${lives} ${lives === 1 ? "life" : "lives"} left.`);
    const kicker = reason.startsWith("Time up") ? "Time Up" : reason.startsWith("Too high") ? "Too High" : "Try Again";
    announceBoard(kicker, `Try ${target}`, "alert");
  }
  updateHud();
}

function clearSelection() {
  selected = [];
  setMessage("Sum reset. Popped bubbles stay gone.");
  updateHud();
}

function popBubble(bubble, withSound = true) {
  bubble.element.classList.add("popped");
  bubbles = bubbles.filter((item) => item.id !== bubble.id);
  if (withSound) {
    playPopSound();
  }
  window.setTimeout(() => bubble.element.remove(), 90);
}

function addPopTime(bubble) {
  const reward = timeRewardForBubble(bubble);
  const maxTime = roundTimeLimit * 1.35;
  roundTimeRemaining = Math.min(maxTime, roundTimeRemaining + reward);
  return reward;
}

function timeRewardForBubble(bubble) {
  const pressure = currentPressure();
  const normalRewards = [0, 1250, 1050, 850, 700, 550];
  const multiplierRewards = [0, 2800, 2350, 1900, 1550, 1250];
  const base = bubble.isMultiplier ? multiplierRewards[pressure.baseDifficulty] : normalRewards[pressure.baseDifficulty];
  const scaled = Math.max(base * 0.58, base - pressure.roundPressure * 80);
  return bubble.isBonus ? Math.round(scaled * 1.35) : Math.round(scaled);
}

function formatReward(milliseconds) {
  return (milliseconds / 1000).toFixed(milliseconds % 1000 === 0 ? 0 : 1);
}

function playPopSound() {
  if (!popsEnabled()) {
    return;
  }
  playSynthPop();
  try {
    popSound.currentTime = 0;
    popSound.play().catch(() => {});
  } catch {
    // Audio is optional; gameplay should never depend on it.
  }
}

function musicEnabled() {
  return !musicToggle || musicToggle.checked;
}

function popsEnabled() {
  return !popsToggle || popsToggle.checked;
}

function ensureAudioContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }
  if (!audioContext) {
    audioContext = new AudioCtor();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function playSynthPop() {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(520, now);
  oscillator.frequency.exponentialRampToValueAtTime(120, now + 0.08);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.1);
}

function playGameOverSound() {
  if (!popsEnabled()) {
    return;
  }
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.16, now);
  master.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
  master.connect(context.destination);

  [
    { frequency: 392, delay: 0, duration: 0.18 },
    { frequency: 294, delay: 0.14, duration: 0.22 },
    { frequency: 196, delay: 0.32, duration: 0.34 }
  ].forEach(({ frequency, delay, duration }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + delay;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.7), start + duration);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.9, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  });

  const hit = context.createOscillator();
  const hitGain = context.createGain();
  hit.type = "sine";
  hit.frequency.setValueAtTime(72, now + 0.48);
  hitGain.gain.setValueAtTime(0.001, now + 0.48);
  hitGain.gain.exponentialRampToValueAtTime(0.8, now + 0.5);
  hitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
  hit.connect(hitGain).connect(master);
  hit.start(now + 0.48);
  hit.stop(now + 0.75);
}

function startThemeMusic({ restart = false } = {}) {
  if (!musicEnabled()) {
    pauseThemeMusic();
    return;
  }
  const musicPath = themeMusic[shell.dataset.theme] || themeMusic.classic;
  const sourceChanged = !backgroundMusic.src.endsWith(musicPath);
  if (sourceChanged) {
    backgroundMusic.src = musicPath;
  }
  if (restart || sourceChanged) {
    backgroundMusic.currentTime = 0;
  }
  backgroundMusic.play().catch(() => {});
}

function pauseThemeMusic() {
  backgroundMusic.pause();
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
  fieldTime.textContent = Math.ceil(roundTimeRemaining / 1000);
  multiplierText.textContent = `${multiplier}x${multiplierTurns > 0 ? ` · ${multiplierTurns}` : ""}`;
  sumMeter.style.width = `${Math.min(100, (sum / target) * 100)}%`;
  sumMeter.style.background = sum > target ? "var(--danger)" : "linear-gradient(90deg, var(--accent), var(--good))";
  const timeRatio = Math.max(0, roundTimeRemaining / roundTimeLimit);
  const isCritical = timeRatio <= 0.18 || roundTimeRemaining <= 2500;
  const isWarning = !isCritical && (timeRatio <= 0.38 || roundTimeRemaining <= 5000);
  fieldTimerBar.style.transform = `scaleX(${timeRatio})`;
  fieldTimerBar.style.background = isCritical
    ? "linear-gradient(90deg, #ff2f2f, #ff8a7a)"
    : isWarning
      ? "linear-gradient(90deg, var(--gold), #ffcf5a)"
      : "linear-gradient(90deg, var(--good), var(--gold))";
  fieldTimer?.classList.toggle("warning", isWarning);
  fieldTimer?.classList.toggle("critical", isCritical);
  timerStat?.classList.toggle("warning", isWarning);
  timerStat?.classList.toggle("critical", isCritical);
}

function setMessage(text) {
  fieldMessage.textContent = text;
}

function announceTarget(kicker = "Target") {
  announceBoard(kicker, target);
}

function announceBoard(kicker, value, tone = "") {
  if (!fieldAnnouncement) {
    return;
  }
  window.clearTimeout(announcementTimer);
  announcementKicker.textContent = kicker;
  announcementValue.textContent = value;
  fieldAnnouncement.className = `field-announcement ${tone}`.trim();
  window.requestAnimationFrame(() => {
    fieldAnnouncement.classList.add("show");
  });
  announcementTimer = window.setTimeout(() => {
    fieldAnnouncement.classList.remove("show");
    announcementTimer = window.setTimeout(() => {
      fieldAnnouncement.classList.add("hidden");
    }, 180);
  }, 1150);
}

function tick(timestamp) {
  if (!lastFrame) {
    lastFrame = timestamp;
  }
  const delta = timestamp - lastFrame;
  lastFrame = timestamp;

  if (started && !paused && !gameOver) {
    activePlayTime += delta;
    roundTimeRemaining -= delta;
    if (roundTimeRemaining <= 0) {
      roundTimeRemaining = 0;
      loseLife("Time up. Selection cleared.");
      window.requestAnimationFrame(tick);
      return;
    }
    updateBubbles(delta);
    spawnTimer += delta;
    const pressure = currentPressure();
    const spawnEvery = Math.max(620, 3500 - pressure.baseDifficulty * 390 - pressure.roundPressure * 150);
    const maxBubbles = Math.min(22, 10 + pressure.baseDifficulty * 2 + Math.floor(pressure.roundPressure));
    if (spawnTimer >= spawnEvery && bubbles.length < maxBubbles) {
      spawnTimer = 0;
      spawnBubble();
    }
    updateHud();
  }

  window.requestAnimationFrame(tick);
}

function showEndScreen() {
  if (!endScreen) {
    return;
  }
  endScore.textContent = score.toLocaleString();
  endTime.textContent = formatPlayTime(activePlayTime);
  endRound.textContent = round;
  endScreen.classList.remove("hidden");
}

function hideEndScreen() {
  endScreen?.classList.add("hidden");
}

function formatPlayTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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
      popBubble(bubble, false);
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

function applySelectedTheme() {
  if (selectedThemeChoice === "random") {
    shell.dataset.theme = playableThemes[randomInt(0, playableThemes.length - 1)];
    return;
  }
  shell.dataset.theme = selectedThemeChoice;
}

function resetPauseButton() {
  if (!pauseButton) {
    return;
  }
  pauseButton.textContent = "Pause";
  pauseButton.setAttribute("aria-label", "Pause game");
  pauseButton.title = "Pause";
}

document.querySelectorAll(".splash-theme").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".splash-theme").forEach((theme) => theme.classList.remove("active"));
    button.classList.add("active");
    selectedThemeChoice = button.dataset.theme;
    if (selectedThemeChoice !== "random") {
      shell.dataset.theme = selectedThemeChoice;
    }
  });
});

difficultyInput?.addEventListener("input", () => {
  updateDifficultyName();
});

musicToggle?.addEventListener("change", () => {
  if (!musicEnabled()) {
    pauseThemeMusic();
  } else if (started && !paused && !gameOver) {
    startThemeMusic();
  }
});

pauseButton?.addEventListener("click", () => {
  if (gameOver) {
    return;
  }
  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";
  pauseButton.setAttribute("aria-label", paused ? "Resume game" : "Pause game");
  pauseButton.title = paused ? "Resume" : "Pause";
  if (paused) {
    pauseThemeMusic();
  } else {
    startThemeMusic();
  }
  setMessage(paused ? "Paused." : "Back in motion.");
});

function updateDifficultyName() {
  const names = ["", "Easy", "Casual", "Medium", "Quick", "Hard"];
  difficultyName.textContent = names[Number(difficultyInput.value)];
}

startButton?.addEventListener("click", () => {
  splashScreen.classList.add("hidden");
  document.body.classList.remove("show-splash");
  resetPauseButton();
  startGame();
});

howButton?.addEventListener("click", () => {
  howPanel?.classList.remove("hidden");
});

closeHowButton?.addEventListener("click", () => {
  howPanel?.classList.add("hidden");
  howButton?.focus();
});

howPanel?.addEventListener("click", (event) => {
  if (event.target === howPanel) {
    howPanel.classList.add("hidden");
    howButton?.focus();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && howPanel && !howPanel.classList.contains("hidden")) {
    howPanel.classList.add("hidden");
    howButton?.focus();
  }
});

changeThemeButton?.addEventListener("click", () => {
  exitToSplash();
});

playAgainButton?.addEventListener("click", () => {
  resetPauseButton();
  startGame();
});

endChangeThemeButton?.addEventListener("click", () => {
  exitToSplash();
});

function exitToSplash() {
  paused = true;
  started = false;
  pauseThemeMusic();
  resetPauseButton();
  playfield.querySelectorAll(".bubble").forEach((bubble) => bubble.remove());
  bubbles = [];
  selected = [];
  hideEndScreen();
  splashScreen.classList.remove("hidden");
  document.body.classList.add("show-splash");
}

window.selectBubble = selectBubble;

document.body.classList.add("show-splash");
updateDifficultyName();
updateHud();
window.requestAnimationFrame(tick);
