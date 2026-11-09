/* =========================================================
   STATE — nothing is stored in the browser, so a refresh or
   "Play again" always starts clean for the next student.
   ========================================================= */
const state = {
  screen: 'welcome',
  answers: Array(QUESTIONS.length).fill(null),
  tied: [],
  tieChoice: null,
  winner: null,
  draft: '',
  name: '',
  posted: null,
  boardFrom: 'finish',
};
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const stage = document.getElementById('stage');
const progress = document.getElementById('progress');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let calcTimer = null;

/* Scores are recalculated from the current answers every time,
   so changing an answer can never award a duplicate point. */
function getScores() {
  const s = Object.fromEntries(Object.keys(PERSONAS).map((k) => [k, 0]));
  state.answers.forEach((a, i) => {
    if (a !== null) s[QUESTIONS[i].options[a][1]]++;
  });
  return s;
}
function topPersonas() {
  const s = getScores(),
    max = Math.max(...Object.values(s));
  return Object.keys(s).filter((k) => s[k] === max);
}

function resetGame() {
  clearTimeout(calcTimer);
  state.screen = 'welcome';
  state.answers = Array(QUESTIONS.length).fill(null);
  state.tied = [];
  state.tieChoice = null;
  state.winner = null;
  state.draft = '';
  state.name = '';
  state.posted = null;
  state.boardFrom = 'finish';
}

function go(screen) {
  state.screen = screen;
  render();
  window.scrollTo({ top: 0 });
}
