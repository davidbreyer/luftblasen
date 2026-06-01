const puzzles = [
  {
    answer: "CRANE",
    board: ["C", "L", "R", "S", "A", "T", "N", "E", "D"]
  },
  {
    answer: "PLANT",
    board: ["P", "O", "L", "A", "R", "N", "T", "S", "E"]
  },
  {
    answer: "SHORE",
    board: ["S", "M", "H", "O", "A", "R", "E", "T", "L"]
  },
  {
    answer: "GHOST",
    board: ["G", "R", "H", "O", "S", "E", "T", "A", "L"]
  }
];

const ideaCopy = {
  logic: "The board starts hidden. Each five-letter test reveals matching squares, then answer squares can become X.",
  threat: "O placement is deterministic. It prefers a winning O move, then blocks your strongest X line, then takes the center or a corner.",
  decoys: "Blue feedback means the letter is on the board but not in the hidden answer. Blue squares stay visible as bait you can avoid."
};

const boardElement = document.querySelector("#board");
const guessRow = document.querySelector("#guess-row");
const historyElement = document.querySelector("#history");
const keyboardElement = document.querySelector("#keyboard");
const messageElement = document.querySelector("#message");
const guessCountElement = document.querySelector("#guess-count");
const claimCountElement = document.querySelector("#claim-count");
const blockCountElement = document.querySelector("#block-count");
const submitButton = document.querySelector("#submit-guess");
const backspaceButton = document.querySelector("#backspace");
const newPuzzleButton = document.querySelector("#new-puzzle");
const ideaNote = document.querySelector("#idea-note");

const maxGuesses = 6;
const winLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

let puzzleIndex = 0;
let puzzle = puzzles[puzzleIndex];
let guess = "";
let guessNumber = 0;
let xMarks = new Set();
let oMarks = new Set();
let unlocked = new Map();
let revealedSquares = new Set();
let gameOver = false;
let awaitingClaim = false;
let keyStates = new Map();

function initializeGame(nextPuzzle = false) {
  if (nextPuzzle) {
    puzzleIndex = (puzzleIndex + 1) % puzzles.length;
  }

  puzzle = puzzles[puzzleIndex];
  guess = "";
  guessNumber = 0;
  xMarks = new Set();
  oMarks = new Set();
  unlocked = new Map();
  revealedSquares = new Set();
  gameOver = false;
  awaitingClaim = false;
  keyStates = new Map();

  renderBoard();
  renderGuess();
  historyElement.innerHTML = "";
  renderKeyboard();
  updateStats();
  setMessage("The board is hidden. Enter any five letters to reveal matching squares.");
}

function renderBoard() {
  boardElement.innerHTML = "";

  puzzle.board.forEach((letter, index) => {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.type = "button";
    cell.dataset.index = index;
    const isRevealed = revealedSquares.has(index) || xMarks.has(index) || oMarks.has(index) || unlocked.has(index);
    cell.setAttribute("aria-label", isRevealed ? `Board square ${index + 1}, letter ${letter}` : `Hidden board square ${index + 1}`);

    const mark = xMarks.has(index) ? "X" : oMarks.has(index) ? "O" : "";
    cell.innerHTML = `
      <span class="cell-letter">${isRevealed ? letter : "?"}</span>
      ${mark ? `<span class="board-mark">${mark}</span>` : ""}
      <small>${index + 1}</small>
    `;

    if (!isRevealed) {
      cell.classList.add("concealed");
    }

    if (isRevealed && !puzzle.answer.includes(letter) && !xMarks.has(index) && !oMarks.has(index)) {
      cell.classList.add("decoy-revealed");
    }

    if (xMarks.has(index)) {
      cell.classList.add("claimed", "x-mark");
      cell.disabled = true;
    } else if (oMarks.has(index)) {
      cell.classList.add("blocked", "o-mark");
      cell.disabled = true;
    } else if (unlocked.has(index)) {
      cell.classList.add("unlocked");
      if (unlocked.get(index) === "correct") {
        cell.classList.add("green-unlock");
      }
      cell.disabled = false;
    } else {
      cell.disabled = true;
    }

    cell.addEventListener("click", () => claimSquare(index));
    boardElement.appendChild(cell);
  });
}

function renderGuess() {
  guessRow.innerHTML = "";

  for (let index = 0; index < 5; index += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = guess[index] || "";
    guessRow.appendChild(slot);
  }
}

function renderKeyboard() {
  const letters = "QWERTYUIOPASDFGHJKLZXCVBNM".split("");
  keyboardElement.innerHTML = "";

  letters.forEach((letter) => {
    const key = document.createElement("button");
    key.className = "key";
    key.type = "button";
    key.textContent = letter;
    if (keyStates.has(letter)) {
      key.classList.add(keyStates.get(letter));
    }
    key.addEventListener("click", () => addLetter(letter));
    keyboardElement.appendChild(key);
  });
}

function addLetter(letter) {
  if (gameOver || awaitingClaim || guess.length >= 5) {
    return;
  }

  guess += letter;
  renderGuess();
}

function removeLetter() {
  if (gameOver || awaitingClaim) {
    return;
  }

  guess = guess.slice(0, -1);
  renderGuess();
}

function submitGuess() {
  if (gameOver || awaitingClaim) {
    return;
  }

  if (guess.length !== 5) {
    setMessage("Your guess needs exactly five letters.");
    return;
  }

  guessNumber += 1;
  const submittedWord = guess;
  const feedback = scoreGuess(submittedWord);
  addHistoryRow(submittedWord, feedback);
  updateKeyboard(submittedWord, feedback);
  revealMatchingSquares(submittedWord, feedback);
  unlocked = findUnlockedSquares(submittedWord, feedback);
  guess = "";
  renderGuess();
  renderKeyboard();
  updateStats();

  if (unlocked.size === 0) {
    placeOMark("No answer letters unlocked. O takes a square.");
    return;
  }

  awaitingClaim = true;
  renderBoard();
  setMessage(`${unlocked.size} square${unlocked.size === 1 ? "" : "s"} unlocked. Pick one for X.`);
}

function scoreGuess(word) {
  return word.split("").map((letter) => {
    if (puzzle.answer.includes(letter)) {
      return "correct";
    }

    if (puzzle.board.includes(letter)) {
      return "decoy";
    }

    return "absent";
  });
}

function findUnlockedSquares(word, feedback) {
  const nextUnlocked = new Map();

  feedback.forEach((state, index) => {
    if (state !== "correct") {
      return;
    }

    const letter = word[index];
    puzzle.board.forEach((boardLetter, boardIndex) => {
      if (boardLetter !== letter || xMarks.has(boardIndex) || oMarks.has(boardIndex)) {
        return;
      }

      const previous = nextUnlocked.get(boardIndex);
      if (previous !== "correct") {
        nextUnlocked.set(boardIndex, state);
      }
    });
  });

  return nextUnlocked;
}

function claimSquare(index) {
  if (gameOver || !awaitingClaim || !unlocked.has(index)) {
    return;
  }

  xMarks.add(index);
  revealedSquares.add(index);
  unlocked = new Map();
  awaitingClaim = false;
  renderBoard();
  updateStats();

  const winningLine = findWinningLine(xMarks);
  if (winningLine) {
    finishWin(winningLine);
    return;
  }

  if (!hasAvailableXLine()) {
    finishLoss("O has blocked every possible X line.");
    return;
  }

  if (guessNumber >= maxGuesses) {
    finishLoss(`Out of guesses. The hidden answer was ${puzzle.answer}.`);
    return;
  }

  setMessage("X claimed. Keep guessing to complete a line before O shuts one down.");
}

function revealMatchingSquares(word, feedback) {
  word.split("").forEach((letter, index) => {
    if (feedback[index] === "absent") {
      return;
    }

    puzzle.board.forEach((boardLetter, boardIndex) => {
      if (boardLetter === letter) {
        revealedSquares.add(boardIndex);
      }
    });
  });
}

function placeOMark(reason) {
  const open = openSquares();
  if (open.length === 0) {
    finishLoss(`No open squares remain. The hidden answer was ${puzzle.answer}.`);
    return;
  }

  const index = chooseOIndex(open);
  oMarks.add(index);
  revealedSquares.add(index);
  unlocked = new Map();
  renderBoard();
  updateStats();

  const oLine = findWinningLine(oMarks);
  if (oLine) {
    finishLoss(`O completed a line. The hidden answer was ${puzzle.answer}.`);
    highlightLine(oLine);
    return;
  }

  if (!hasAvailableXLine()) {
    finishLoss(`O blocked every possible X line. The hidden answer was ${puzzle.answer}.`);
    return;
  }

  if (guessNumber >= maxGuesses) {
    finishLoss(`Out of guesses. The hidden answer was ${puzzle.answer}.`);
    return;
  }

  setMessage(`${reason} Try another five letters.`);
}

function chooseOIndex(open) {
  const oWin = findLineMove(oMarks, xMarks, open);
  if (oWin !== null) {
    return oWin;
  }

  const xBlock = findLineMove(xMarks, oMarks, open);
  if (xBlock !== null) {
    return xBlock;
  }

  return open
    .map((index) => ({ index, score: scoreOPlacement(index) }))
    .sort((a, b) => b.score - a.score || preferredSquareOrder(a.index) - preferredSquareOrder(b.index))[0].index;
}

function findLineMove(primaryMarks, opposingMarks, open) {
  for (const line of winLines) {
    const primaryCount = line.filter((index) => primaryMarks.has(index)).length;
    const opposingCount = line.filter((index) => opposingMarks.has(index)).length;
    const empty = line.find((index) => open.includes(index));

    if (primaryCount === 2 && opposingCount === 0 && empty !== undefined) {
      return empty;
    }
  }

  return null;
}

function scoreOPlacement(index) {
  return winLines.reduce((score, line) => {
    if (!line.includes(index)) {
      return score;
    }

    if (line.some((lineIndex) => oMarks.has(lineIndex))) {
      score += 1;
    }

    if (line.some((lineIndex) => xMarks.has(lineIndex))) {
      score += 3;
    } else {
      score += 2;
    }

    return score;
  }, 0);
}

function preferredSquareOrder(index) {
  const order = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  return order.indexOf(index);
}

function openSquares() {
  return puzzle.board
    .map((_, index) => index)
    .filter((index) => !xMarks.has(index) && !oMarks.has(index));
}

function hasAvailableXLine() {
  return winLines.some((line) => line.every((index) => !oMarks.has(index)));
}

function addHistoryRow(word, feedback) {
  const row = document.createElement("div");
  row.className = "history-row";

  word.split("").forEach((letter, index) => {
    const slot = document.createElement("div");
    slot.className = `slot ${feedback[index]}`;
    slot.textContent = letter;
    row.appendChild(slot);
  });

  historyElement.appendChild(row);
}

function updateKeyboard(word, feedback) {
  const rank = { absent: 0, decoy: 1, correct: 2 };
  word.split("").forEach((letter, index) => {
    const current = keyStates.get(letter);
    const next = feedback[index];
    if (!current || rank[next] > rank[current]) {
      keyStates.set(letter, next);
    }
  });
}

function findWinningLine(marks) {
  return winLines.find((line) => line.every((index) => marks.has(index)));
}

function finishWin(line) {
  gameOver = true;
  highlightLine(line);
  setMessage(`You made an X line in ${guessNumber} guess${guessNumber === 1 ? "" : "es"}. The hidden answer was ${puzzle.answer}.`);
}

function finishLoss(text) {
  gameOver = true;
  setMessage(text);
}

function highlightLine(line) {
  line.forEach((index) => {
    const cell = boardElement.querySelector(`[data-index="${index}"]`);
    cell.classList.add("winning");
  });
}

function updateStats() {
  guessCountElement.textContent = `${guessNumber} / ${maxGuesses}`;
  claimCountElement.textContent = `${xMarks.size} / 3`;
  blockCountElement.textContent = `${oMarks.size}`;
}

function setMessage(text) {
  messageElement.textContent = text;
}

document.addEventListener("keydown", (event) => {
  if (/^[a-z]$/i.test(event.key)) {
    addLetter(event.key.toUpperCase());
  } else if (event.key === "Backspace") {
    removeLetter();
  } else if (event.key === "Enter") {
    submitGuess();
  }
});

submitButton.addEventListener("click", submitGuess);
backspaceButton.addEventListener("click", removeLetter);
newPuzzleButton.addEventListener("click", () => initializeGame(true));

document.querySelectorAll(".idea").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".idea").forEach((idea) => idea.classList.remove("active"));
    button.classList.add("active");
    ideaNote.textContent = ideaCopy[button.dataset.idea];
  });
});

ideaNote.textContent = ideaCopy.logic;
initializeGame();
