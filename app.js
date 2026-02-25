const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS = ["H", "D", "C", "S"];
const SUIT_SYMBOL = { H: "♥︎", D: "♦︎", C: "♣︎", S: "♠︎" };

const state = {
  started: false,
  deck: [],
  positions: [],
  battleIndex: 0,
  stage: "setup",
  players: {
    nonDealer: { name: "", points: 0, lineup: [], subs: [] },
    dealer: { name: "", points: 0, lineup: [], subs: [] },
  },
  currentBattle: null,
  penalty: null,
  winnerKey: null,
  log: [],
};

const dom = {
  setupCard: document.getElementById("setup-card"),
  setupForm: document.getElementById("setup-form"),
  setupError: document.getElementById("setup-error"),
  nonDealerName: document.getElementById("nonDealerName"),
  dealerName: document.getElementById("dealerName"),
  formation: document.getElementById("formation"),

  gameBoard: document.getElementById("game-board"),
  ndName: document.getElementById("nd-name"),
  dName: document.getElementById("d-name"),
  ndScore: document.getElementById("nd-score"),
  dScore: document.getElementById("d-score"),
  ndSubs: document.getElementById("nd-subs"),
  dSubs: document.getElementById("d-subs"),
  formationPanel: document.getElementById("formation-panel"),
  formationP1Title: document.getElementById("formation-p1-title"),
  formationP2Title: document.getElementById("formation-p2-title"),
  formationP1: document.getElementById("formation-p1"),
  formationP2: document.getElementById("formation-p2"),

  battlePanel: document.getElementById("battle-panel"),
  phaseLabel: document.getElementById("phase-label"),
  battleTitle: document.getElementById("battle-title"),
  battleContext: document.getElementById("battle-context"),
  attackerName: document.getElementById("attacker-name"),
  defenderName: document.getElementById("defender-name"),
  attackerCard: document.getElementById("attacker-card"),
  defenderCard: document.getElementById("defender-card"),
  subPanel: document.getElementById("sub-panel"),
  subHelp: document.getElementById("sub-help"),
  subOptions: document.getElementById("sub-options"),
  actionLeft: document.getElementById("action-left"),
  actionCenter: document.getElementById("action-center"),
  actionRight: document.getElementById("action-right"),

  penaltyPanel: document.getElementById("penalty-panel"),
  penaltyContext: document.getElementById("penalty-context"),
  penaltyScoreline: document.getElementById("penalty-scoreline"),
  penaltyLast: document.getElementById("penalty-last"),
  penaltyAction: document.getElementById("penalty-action"),

  resultPanel: document.getElementById("result-panel"),
  resultTitle: document.getElementById("result-title"),
  resultText: document.getElementById("result-text"),
  playAgain: document.getElementById("play-again"),

  logList: document.getElementById("match-log"),
};

function createCard(rank, suit) {
  return { rank, suit, value: RANKS.indexOf(rank) + 2 };
}

function cardLabel(card) {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
}

function cardWithValue(card) {
  return `${cardLabel(card)} (${card.value})`;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push(createCard(rank, suit));
    }
  }
  return shuffle(cards);
}

function drawMany(deck, count) {
  if (deck.length < count) {
    throw new Error("Not enough cards left in the deck.");
  }
  return deck.splice(deck.length - count, count);
}

function parseFormation(raw) {
  const cleaned = raw.trim().replace(/[–—]/g, "-");
  const parts = cleaned.split("-").map((part) => Number(part));
  if (parts.length < 3 || parts.some((part) => !Number.isInteger(part))) {
    throw new Error("Formation must look like 4-4-2 or 4-2-3-1.");
  }
  if (parts.some((part) => part <= 0)) {
    throw new Error("Each line in the formation must be greater than 0.");
  }
  const defenders = parts[0];
  const forwards = parts[parts.length - 1];
  const midfielders = parts.slice(1, -1).reduce((sum, value) => sum + value, 0);
  const totalOutfield = defenders + midfielders + forwards;
  if (totalOutfield !== 10) {
    throw new Error("Formation must total 10 outfield players.");
  }
  return [defenders, midfielders, forwards];
}

function buildPositions([defenders, midfielders, forwards]) {
  const positions = ["GK"];
  for (let i = 1; i <= defenders; i += 1) {
    positions.push(`DEF ${i}`);
  }
  for (let i = 1; i <= midfielders; i += 1) {
    positions.push(`MID ${i}`);
  }
  for (let i = 1; i <= forwards; i += 1) {
    positions.push(`FWD ${i}`);
  }
  return positions;
}

function attackerKeyForBattle(battleNumber) {
  if (battleNumber <= 2) {
    return "nonDealer";
  }
  return battleNumber % 2 === 1 ? "dealer" : "nonDealer";
}

function logEvent(text) {
  state.log.unshift(text);
  state.log = state.log.slice(0, 140);
}

function penaltyOutcome(card) {
  if (card.value <= 5) {
    return "MISS";
  }
  if (card.value <= 7) {
    return "WOODWORK";
  }
  return "GOAL";
}

function setupBattle() {
  const battleNumber = state.battleIndex + 1;
  const attackerKey = attackerKeyForBattle(battleNumber);
  const defenderKey = attackerKey === "nonDealer" ? "dealer" : "nonDealer";
  const attacker = state.players[attackerKey];
  const defender = state.players[defenderKey];
  const finalBattle = battleNumber === state.positions.length;

  state.currentBattle = {
    battleNumber,
    position: state.positions[state.battleIndex],
    attackerKey,
    defenderKey,
    attackerCard: attacker.lineup[state.battleIndex],
    defenderCard: defender.lineup[state.battleIndex],
    attackerRevealed: false,
    defenderRevealed: false,
    resultText: "",
    maxSubs: finalBattle ? attacker.subs.length : Math.min(1, attacker.subs.length),
    subsUsed: 0,
    finalBattle,
  };
  state.stage = "battle-start";
  logEvent(`Battle ${battleNumber}: ${state.currentBattle.position}. ${attacker.name} attacks.`);
}

function startGame() {
  const ndName = dom.nonDealerName.value.trim();
  const dName = dom.dealerName.value.trim();
  const formationRaw = dom.formation.value.trim();

  if (!ndName || !dName) {
    dom.setupError.textContent = "Enter names for both players.";
    return;
  }

  let formation;
  try {
    formation = parseFormation(formationRaw);
  } catch (error) {
    dom.setupError.textContent = error.message;
    return;
  }

  dom.setupError.textContent = "";
  state.deck = buildDeck();
  state.positions = buildPositions(formation);
  state.battleIndex = 0;
  state.winnerKey = null;
  state.penalty = null;
  state.log = [];

  state.players.nonDealer = { name: ndName, points: 0, lineup: [], subs: [] };
  state.players.dealer = { name: dName, points: 0, lineup: [], subs: [] };

  const lineupSize = state.positions.length;
  state.players.dealer.lineup = drawMany(state.deck, lineupSize);
  state.players.nonDealer.lineup = drawMany(state.deck, lineupSize);
  state.players.dealer.subs = drawMany(state.deck, 3);
  state.players.nonDealer.subs = drawMany(state.deck, 3);

  state.started = true;
  setupBattle();
  logEvent("Cards dealt face down. 3 substitutes each.");
  logEvent("Home Team (non-dealer) has home-ground advantage: reveals first in battles 1 and 2.");
  render();
}

function setCardFace(el, text, hidden = false) {
  el.textContent = text;
  el.classList.toggle("hidden-card", hidden);
}

function updateScores() {
  dom.ndName.textContent = `${state.players.nonDealer.name} (Home Team)`;
  dom.dName.textContent = `${state.players.dealer.name} (Away Team)`;
  dom.ndScore.textContent = String(state.players.nonDealer.points);
  dom.dScore.textContent = String(state.players.dealer.points);
  dom.ndSubs.textContent = `Subs: ${state.players.nonDealer.subs.length}`;
  dom.dSubs.textContent = `Subs: ${state.players.dealer.subs.length}`;
}

function indexesForLine(prefix) {
  const indexes = [];
  for (let i = 0; i < state.positions.length; i += 1) {
    if (state.positions[i].startsWith(prefix)) {
      indexes.push(i);
    }
  }
  return indexes;
}

function isRevealedForPlayer(playerKey, index) {
  if (!state.currentBattle) {
    return index < state.battleIndex;
  }
  if (index < state.battleIndex) {
    return true;
  }
  if (index > state.battleIndex) {
    return false;
  }

  if (state.stage.startsWith("battle")) {
    if (playerKey === state.currentBattle.attackerKey) {
      return state.currentBattle.attackerRevealed;
    }
    if (playerKey === state.currentBattle.defenderKey) {
      return state.currentBattle.defenderRevealed;
    }
    return false;
  }

  if (state.stage === "penalty" || state.stage === "finished") {
    return true;
  }
  return false;
}

function renderFormationLine(container, playerKey, prefix) {
  const indexes = indexesForLine(prefix);
  const line = document.createElement("div");
  line.className = "formation-line";

  indexes.forEach((index) => {
    const card = state.players[playerKey].lineup[index];
    const revealed = isRevealedForPlayer(playerKey, index);
    const cardEl = document.createElement("div");
    cardEl.className = `formation-card ${revealed ? "" : "face-down"}`.trim();
    cardEl.innerHTML = `
      <span class="pos">${state.positions[index]}</span>
      <span class="face">${revealed ? cardLabel(card) : "Face Down"}</span>
    `;
    line.appendChild(cardEl);
  });

  container.appendChild(line);
}

function renderFormationBoard() {
  dom.formationP1Title.textContent = `${state.players.nonDealer.name} (Home Team)`;
  dom.formationP2Title.textContent = `${state.players.dealer.name} (Away Team)`;
  dom.formationP1.innerHTML = "";
  dom.formationP2.innerHTML = "";

  ["GK", "DEF", "MID", "FWD"].forEach((linePrefix) => {
    renderFormationLine(dom.formationP1, "nonDealer", linePrefix);
    renderFormationLine(dom.formationP2, "dealer", linePrefix);
  });
}

function renderButtons(container, buttons) {
  container.innerHTML = "";
  for (const button of buttons) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = `btn ${button.variant || ""}`.trim();
    node.textContent = button.label;
    node.disabled = Boolean(button.disabled);
    node.addEventListener("click", button.onClick);
    container.appendChild(node);
  }
}

function actionLaneForPlayer(playerKey) {
  return playerKey === "nonDealer" ? "left" : "right";
}

function renderBattleActions({ left = [], center = [], right = [] }) {
  renderButtons(dom.actionLeft, left);
  renderButtons(dom.actionCenter, center);
  renderButtons(dom.actionRight, right);
}

function renderBattlePanel() {
  const battle = state.currentBattle;
  const attacker = state.players[battle.attackerKey];
  const defender = state.players[battle.defenderKey];

  dom.phaseLabel.textContent = `Battle ${battle.battleNumber} / ${state.positions.length}`;
  dom.battleTitle.textContent = battle.position;
  dom.battleContext.textContent = `${attacker.name} reveals first (attacker).`;
  dom.attackerName.textContent = attacker.name;
  dom.defenderName.textContent = defender.name;

  if (battle.attackerRevealed) {
    setCardFace(dom.attackerCard, cardWithValue(battle.attackerCard), false);
  } else {
    setCardFace(dom.attackerCard, "Face Down", true);
  }

  if (battle.defenderRevealed) {
    setCardFace(dom.defenderCard, cardWithValue(battle.defenderCard), false);
  } else {
    setCardFace(dom.defenderCard, "Face Down", true);
  }

  dom.subPanel.classList.add("hidden");
  dom.subHelp.textContent = "";
  dom.subOptions.innerHTML = "";
  renderBattleActions({ left: [], center: [], right: [] });

  if (state.stage === "battle-start") {
    const lane = actionLaneForPlayer(battle.attackerKey);
    renderBattleActions({
      left: lane === "left" ? [{ label: "Reveal Attacker Card", onClick: revealAttacker }] : [],
      center: [],
      right: lane === "right" ? [{ label: "Reveal Attacker Card", onClick: revealAttacker }] : [],
    });
    return;
  }

  if (state.stage === "battle-subs") {
    const subsLeftThisBattle = battle.maxSubs - battle.subsUsed;
    const lane = actionLaneForPlayer(battle.attackerKey);
    const sideActions = [];

    if (battle.maxSubs > 0 && subsLeftThisBattle > 0 && attacker.subs.length > 0) {
      dom.subPanel.classList.remove("hidden");
      if (battle.finalBattle) {
        dom.subHelp.textContent =
          `${attacker.name} can use up to ${subsLeftThisBattle} more face-down sub(s) before defender reveals.`;
      } else {
        dom.subHelp.textContent = `${attacker.name} may use 1 face-down sub now, or skip.`;
      }

      sideActions.push({
        label: "Use Random Face-Down Sub",
        variant: "secondary",
        onClick: useSub,
      });
    }

    sideActions.push({
      label: "Continue to Defender Reveal",
      variant: "ghost",
      onClick: advanceToDefender,
    });

    renderBattleActions({
      left: lane === "left" ? sideActions : [],
      center: [],
      right: lane === "right" ? sideActions : [],
    });
    return;
  }

  if (state.stage === "battle-defender") {
    const lane = actionLaneForPlayer(battle.defenderKey);
    renderBattleActions({
      left: lane === "left" ? [{ label: "Reveal Defender Card", onClick: revealDefender }] : [],
      center: [],
      right: lane === "right" ? [{ label: "Reveal Defender Card", onClick: revealDefender }] : [],
    });
    return;
  }

  if (state.stage === "battle-result") {
    const isLast = state.battleIndex >= state.positions.length - 1;
    renderBattleActions({
      left: [],
      center: [
        {
          label: isLast ? "Finish Regulation" : "Next Battle",
          onClick: isLast ? finishRegulation : nextBattle,
        },
      ],
      right: [],
    });
  }
}

function renderPenaltyPanel() {
  const penalty = state.penalty;
  const nd = state.players.nonDealer;
  const d = state.players.dealer;
  dom.penaltyScoreline.textContent = `${nd.name} ${penalty.goals.nonDealer} - ${penalty.goals.dealer} ${d.name}`;

  if (penalty.phase === "standard") {
    dom.penaltyContext.textContent = `Kick ${penalty.kick + 1} of 5: ${
      penalty.side === "nonDealer" ? nd.name : d.name
    } to reveal.`;
  } else if (penalty.phase === "sudden") {
    dom.penaltyContext.textContent = `Sudden Death Round ${penalty.round}: ${
      penalty.side === "nonDealer" ? nd.name : d.name
    } to reveal.`;
  } else {
    dom.penaltyContext.textContent = "";
  }

  renderButtons(dom.penaltyAction, [
    {
      label: "Reveal Next Penalty Card",
      onClick: revealNextPenalty,
      disabled: state.stage !== "penalty",
    },
  ]);
}

function renderResultPanel() {
  const nd = state.players.nonDealer;
  const d = state.players.dealer;
  if (state.winnerKey === "nonDealer") {
    dom.resultText.textContent = `${nd.name} wins. Final score ${nd.points}-${d.points}.`;
  } else if (state.winnerKey === "dealer") {
    dom.resultText.textContent = `${d.name} wins. Final score ${d.points}-${nd.points}.`;
  } else {
    dom.resultText.textContent = `Match drawn. Final score ${nd.points}-${d.points}.`;
  }
}

function renderLog() {
  dom.logList.innerHTML = "";
  state.log.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry;
    dom.logList.appendChild(li);
  });
}

function render() {
  updateScores();
  renderLog();

  dom.setupCard.classList.toggle("hidden", state.started);
  dom.gameBoard.classList.toggle("hidden", !state.started);
  dom.formationPanel.classList.toggle("hidden", !state.started);

  dom.battlePanel.classList.toggle("hidden", !state.started || !state.stage.startsWith("battle"));
  dom.penaltyPanel.classList.toggle("hidden", state.stage !== "penalty");
  dom.resultPanel.classList.toggle("hidden", state.stage !== "finished");

  if (state.started) {
    renderFormationBoard();
  }

  if (state.stage.startsWith("battle")) {
    renderBattlePanel();
  }
  if (state.stage === "penalty") {
    renderPenaltyPanel();
  }
  if (state.stage === "finished") {
    renderResultPanel();
  }
}

function revealAttacker() {
  const battle = state.currentBattle;
  if (!battle || state.stage !== "battle-start") {
    return;
  }
  battle.attackerRevealed = true;
  state.stage = "battle-subs";
  const attacker = state.players[battle.attackerKey];
  logEvent(`${attacker.name} reveals ${cardWithValue(battle.attackerCard)}.`);
  render();
}

function useSub() {
  const battle = state.currentBattle;
  if (!battle || state.stage !== "battle-subs") {
    return;
  }
  const attacker = state.players[battle.attackerKey];
  const subsLeftThisBattle = battle.maxSubs - battle.subsUsed;
  if (subsLeftThisBattle <= 0 || attacker.subs.length === 0) {
    return;
  }
  const randomIndex = Math.floor(Math.random() * attacker.subs.length);
  const subCard = attacker.subs.splice(randomIndex, 1)[0];
  attacker.lineup[state.battleIndex] = subCard;
  battle.attackerCard = subCard;
  battle.subsUsed += 1;
  logEvent(`${attacker.name} uses a random face-down sub for ${battle.position}.`);
  render();
}

function advanceToDefender() {
  if (state.stage !== "battle-subs") {
    return;
  }
  const battle = state.currentBattle;
  const attacker = state.players[battle.attackerKey];
  logEvent(`${attacker.name} locks in ${cardWithValue(battle.attackerCard)} for ${battle.position}.`);
  state.stage = "battle-defender";
  render();
}

function revealDefender() {
  const battle = state.currentBattle;
  if (!battle || state.stage !== "battle-defender") {
    return;
  }
  battle.defenderRevealed = true;
  const attacker = state.players[battle.attackerKey];
  const defender = state.players[battle.defenderKey];
  logEvent(`${defender.name} reveals ${cardWithValue(battle.defenderCard)}.`);

  if (battle.attackerCard.value > battle.defenderCard.value) {
    attacker.points += 1;
    battle.resultText = `${attacker.name} wins ${battle.position} (+1).`;
    logEvent(battle.resultText);
  } else if (battle.defenderCard.value > battle.attackerCard.value) {
    defender.points += 1;
    battle.resultText = `${defender.name} wins ${battle.position} (+1).`;
    logEvent(battle.resultText);
  } else {
    battle.resultText = `${battle.position} is a draw.`;
    logEvent(battle.resultText);
  }

  state.stage = "battle-result";
  render();
}

function nextBattle() {
  if (state.stage !== "battle-result") {
    return;
  }
  state.battleIndex += 1;
  setupBattle();
  render();
}

function finishWithWinner(winnerKey, message) {
  state.winnerKey = winnerKey;
  state.stage = "finished";
  if (message) {
    logEvent(message);
  }
  render();
}

function setupSuddenDeathRound() {
  if (state.deck.length < 2) {
    state.stage = "finished";
    state.winnerKey = null;
    logEvent("No cards left for sudden death. Match drawn.");
    render();
    return false;
  }
  state.penalty.roundCards = {
    nonDealer: drawMany(state.deck, 1)[0],
    dealer: drawMany(state.deck, 1)[0],
  };
  state.penalty.roundGoals = { nonDealer: false, dealer: false };
  state.penalty.side = "nonDealer";
  return true;
}

function startPenaltyShootout() {
  state.penalty = {
    phase: "standard",
    kick: 0,
    side: "nonDealer",
    goals: { nonDealer: 0, dealer: 0 },
    cards: {
      nonDealer: drawMany(state.deck, 5),
      dealer: drawMany(state.deck, 5),
    },
    round: 0,
    roundCards: null,
    roundGoals: null,
  };
  state.stage = "penalty";
  dom.penaltyLast.textContent = "No penalty revealed yet.";
  logEvent("Full-time tie. Penalty shootout starts.");
  render();
}

function finishRegulation() {
  if (state.stage !== "battle-result") {
    return;
  }
  const nd = state.players.nonDealer.points;
  const d = state.players.dealer.points;
  if (nd > d) {
    finishWithWinner("nonDealer", `${state.players.nonDealer.name} wins in regulation.`);
  } else if (d > nd) {
    finishWithWinner("dealer", `${state.players.dealer.name} wins in regulation.`);
  } else {
    startPenaltyShootout();
  }
}

function revealNextPenalty() {
  if (state.stage !== "penalty") {
    return;
  }
  const penalty = state.penalty;
  const sideKey = penalty.side;
  const player = state.players[sideKey];

  if (penalty.phase === "standard") {
    const card = penalty.cards[sideKey][penalty.kick];
    const outcome = penaltyOutcome(card);
    if (outcome === "GOAL") {
      penalty.goals[sideKey] += 1;
    }
    dom.penaltyLast.textContent = `${player.name} reveals ${cardLabel(card)}: ${outcome}`;
    logEvent(`Penalty ${penalty.kick + 1}: ${player.name} -> ${cardLabel(card)} (${outcome}).`);

    if (sideKey === "nonDealer") {
      penalty.side = "dealer";
    } else {
      penalty.side = "nonDealer";
      penalty.kick += 1;
      if (penalty.kick >= 5) {
        if (penalty.goals.nonDealer > penalty.goals.dealer) {
          finishWithWinner("nonDealer", `${state.players.nonDealer.name} wins on penalties.`);
          return;
        }
        if (penalty.goals.dealer > penalty.goals.nonDealer) {
          finishWithWinner("dealer", `${state.players.dealer.name} wins on penalties.`);
          return;
        }
        penalty.phase = "sudden";
        penalty.round = 1;
        logEvent("Penalties tied after five each. Sudden death begins.");
        if (!setupSuddenDeathRound()) {
          return;
        }
      }
    }
    render();
    return;
  }

  if (penalty.phase === "sudden") {
    const card = penalty.roundCards[sideKey];
    const outcome = penaltyOutcome(card);
    if (outcome === "GOAL") {
      penalty.goals[sideKey] += 1;
      penalty.roundGoals[sideKey] = true;
    }
    dom.penaltyLast.textContent = `${player.name} reveals ${cardLabel(card)}: ${outcome}`;
    logEvent(`Sudden ${penalty.round}: ${player.name} -> ${cardLabel(card)} (${outcome}).`);

    if (sideKey === "nonDealer") {
      penalty.side = "dealer";
      render();
      return;
    }

    const ndGoal = penalty.roundGoals.nonDealer;
    const dGoal = penalty.roundGoals.dealer;
    if (ndGoal && !dGoal) {
      finishWithWinner("nonDealer", `${state.players.nonDealer.name} wins on sudden death penalties.`);
      return;
    }
    if (dGoal && !ndGoal) {
      finishWithWinner("dealer", `${state.players.dealer.name} wins on sudden death penalties.`);
      return;
    }

    logEvent(`Sudden death round ${penalty.round} has no winner.`);
    penalty.round += 1;
    if (!setupSuddenDeathRound()) {
      return;
    }
    render();
  }
}

function resetAll() {
  state.started = false;
  state.deck = [];
  state.positions = [];
  state.battleIndex = 0;
  state.stage = "setup";
  state.currentBattle = null;
  state.penalty = null;
  state.winnerKey = null;
  state.log = [];
  state.players.nonDealer = { name: "", points: 0, lineup: [], subs: [] };
  state.players.dealer = { name: "", points: 0, lineup: [], subs: [] };
  dom.setupError.textContent = "";
  dom.penaltyLast.textContent = "No penalty revealed yet.";
  render();
}

dom.setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  startGame();
});

dom.playAgain.addEventListener("click", resetAll);

render();
