/**
 * Balthasar prototype rules engine.
 * All poker evaluation and deck cycling live outside React for testing.
 */
export type Suit = 'spades' | 'clubs' | 'hearts' | 'diamonds';
export type Room = 'entry' | 'battle' | 'elite' | 'shop' | 'rest' | 'cache' | 'fortune' | 'forge';
export type Scene = 'board' | 'combat' | 'reward' | 'shop' | 'gameover' | 'victory';
export type EnemyKind = 'scout' | 'warden' | 'leech' | 'boss';
export type RewardId = 'spades' | 'clubs' | 'hearts' | 'diamonds' | 'hand' | 'short' | 'twins' | 'royals';

export interface Card { id: string; suit: Suit; rank: number }
export interface Score { name: string; multiplier: number; activeIds: string[]; level: number }
export interface Powers { attack: number; block: number; heal: number; luck: number }
export interface Perks {
  spades: number; clubs: number; hearts: number; diamonds: number;
  handSize: number; shortHanded: boolean;
}
export interface Enemy {
  name: string; kind: EnemyKind; hp: number; maxHp: number;
  block: number; turn: number; elite: boolean;
}
export interface Intent { type: 'attack' | 'defend' | 'drain'; value: number; label: string }
export interface Reward { id: RewardId; title: string; description: string; cost: number }
export interface GameState {
  scene: Scene;
  floor: number;
  position: number;
  spaces: Room[];
  nextSpaces: Room[];
  rewardSource: 'battle' | 'coffer' | null;
  hp: number;
  maxHp: number;
  gold: number;
  luck: number;
  deck: Card[];
  drawPile: Card[];
  discardPile: Card[];
  hand: Card[];
  selected: string[];
  perks: Perks;
  enemy: Enemy | null;
  turn: number;
  fightsWon: number;
  rewards: Reward[];
  shopBought: RewardId[];
  rolled: number | null;
  steps: number | null;
  log: string[];
  notification: string;
  cardCounter: number;
}
export type GameAction =
  | { type: 'NEW_RUN' }
  | { type: 'TOGGLE_CARD'; id: string }
  | { type: 'ROLL' }
  | { type: 'ADJUST_ROLL'; delta: -1 | 1 }
  | { type: 'LAND' }
  | { type: 'PLAY' }
  | { type: 'PASS' }
  | { type: 'CHOOSE_REWARD'; id: RewardId }
  | { type: 'SKIP_REWARD' }
  | { type: 'SHOP_BUY'; id: RewardId }
  | { type: 'LEAVE_SHOP' };

export const SUITS: Suit[] = ['spades', 'clubs', 'hearts', 'diamonds'];
export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠', clubs: '♣', hearts: '♥', diamonds: '♦',
};
export function rankLabel(rank: number): string {
  return ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[rank] ?? String(rank);
}
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function startingDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    Array.from({ length: 8 }, (_, i) => ({ id: suit + '-' + (i + 2), suit, rank: i + 2 })),
  );
}
export function scoreHand(cards: Card[]): Score | null {
  if (!cards.length || cards.length > 5) return null;
  const groups = new Map<number, Card[]>();
  for (const card of cards) groups.set(card.rank, [...(groups.get(card.rank) ?? []), card]);
  const grouped = [...groups.values()].sort((a, b) => b.length - a.length || b[0].rank - a[0].rank);
  const lengths = grouped.map((group) => group.length);
  const values = [...groups.keys()].sort((a, b) => a - b);
  const straight = cards.length === 5 && values.length === 5 &&
    (values[4] - values[0] === 4 || values.join(',') === '2,3,4,5,14');
  const flush = cards.length === 5 && cards.every((card) => card.suit === cards[0].suit);
  let name = 'High Card';
  let multiplier = 1;
  let level = 0;
  let active: Card[] = [grouped[0][0]];
  if (lengths[0] === 5 && flush) {
    name = 'Flush Five'; multiplier = 7.5; level = 11; active = cards;
  } else if (lengths[0] === 3 && lengths[1] === 2 && flush) {
    name = 'Flush House'; multiplier = 6.5; level = 10; active = cards;
  } else if (lengths[0] === 5) {
    name = 'Five of a Kind'; multiplier = 5.5; level = 9; active = cards;
  } else if (straight && flush) {
    name = 'Straight Flush'; multiplier = 4; level = 8; active = cards;
  } else if (lengths[0] === 4) {
    name = 'Four of a Kind'; multiplier = 3; level = 7; active = grouped[0];
  } else if (lengths[0] === 3 && lengths[1] === 2) {
    name = 'Full House'; multiplier = 2.4; level = 6; active = cards;
  } else if (flush) {
    name = 'Flush'; multiplier = 2.1; level = 5; active = cards;
  } else if (straight) {
    name = 'Straight'; multiplier = 2; level = 4; active = cards;
  } else if (lengths[0] === 3) {
    name = 'Three of a Kind'; multiplier = 1.8; level = 3; active = grouped[0];
  } else if (lengths[0] === 2 && lengths[1] === 2) {
    name = 'Two Pair'; multiplier = 1.45; level = 2; active = [...grouped[0], ...grouped[1]];
  } else if (lengths[0] === 2) {
    name = 'Pair'; multiplier = 1.25; level = 1; active = grouped[0];
  }
  return { name, multiplier, activeIds: active.map((card) => card.id), level };
}
export function scorePowers(cards: Card[], score: Score, perks: Perks): Powers {
  const active = cards.filter((card) => score.activeIds.includes(card.id));
  const sum = (suit: Suit, value: (rank: number) => number) =>
    active.filter((card) => card.suit === suit).reduce((total, card) => total + value(card.rank), 0);
  return {
    attack: Math.floor(sum('spades', (rank) => rank + perks.spades) * score.multiplier),
    block: Math.floor(sum('clubs', (rank) => rank + perks.clubs) * score.multiplier),
    heal: Math.floor(sum('hearts', (rank) => Math.ceil(rank / 2) + perks.hearts) * score.multiplier),
    luck: Math.floor(sum('diamonds', (rank) => Math.ceil(rank / 3) + perks.diamonds) * score.multiplier),
  };
}
export function drawToLimit(
  drawPile: Card[], discardPile: Card[], hand: Card[], limit: number,
  rng: () => number = Math.random,
): { drawPile: Card[]; discardPile: Card[]; hand: Card[] } {
  let draw = [...drawPile];
  let discard = [...discardPile];
  const held = [...hand];
  while (held.length < limit) {
    if (!draw.length) {
      if (!discard.length) break;
      draw = shuffle(discard, rng);
      discard = [];
    }
    held.push(draw.pop()!);
  }
  return { drawPile: draw, discardPile: discard, hand: held };
}

export const REWARDS: Reward[] = [
  { id: 'spades', title: 'Sharpened Spades', description: '+2 power to each scoring Spade.', cost: 20 },
  { id: 'clubs', title: 'Iron Clubs', description: '+2 power to each scoring Club.', cost: 20 },
  { id: 'hearts', title: 'Royal Blood', description: '+1 healing to each scoring Heart.', cost: 18 },
  { id: 'diamonds', title: 'Lucky Diamonds', description: '+1 Luck to each scoring Diamond.', cost: 18 },
  { id: 'hand', title: 'Deeper Pockets', description: '+1 maximum hand size (up to 11).', cost: 28 },
  { id: 'short', title: 'Short-Handed', description: 'Play fewer than five cards in a scoring hand.', cost: 32 },
  { id: 'twins', title: 'Twinned Sevens', description: 'Add a 7♠ and 7♣ to your deck.', cost: 24 },
  { id: 'royals', title: 'Royal Pair', description: 'Add a Q♠ and Q♥ to your deck.', cost: 28 },
];

const ROOMS: Room[] = ['battle', 'battle', 'shop', 'battle', 'elite', 'rest', 'battle', 'fortune', 'cache', 'forge', 'battle'];
export function generateFloor(): Room[] { return ['entry', ...shuffle(ROOMS)]; }
function blankPerks(): Perks {
  return { spades: 0, clubs: 0, hearts: 0, diamonds: 0, handSize: 8, shortHanded: false };
}
export function newGame(): GameState {
  return {
    scene: 'board', floor: 1, position: 0, spaces: generateFloor(),
    nextSpaces: generateFloor(), rewardSource: null,
    hp: 68, maxHp: 68, gold: 12, luck: 2,
    deck: startingDeck(), drawPile: [], discardPile: [], hand: [], selected: [],
    perks: blankPerks(), enemy: null, turn: 0, fightsWon: 0,
    rewards: [], shopBought: [], rolled: null, steps: null, log: [],
    notification: 'The tower awaits. Roll to ascend.', cardCounter: 0,
  };
}
export function createEnemy(kind: EnemyKind, floor: number, elite = false): Enemy {
  const definition = {
    scout: { name: 'The Knave', hp: 26 },
    warden: { name: 'Stone Warden', hp: 34 },
    leech: { name: 'Blood Collector', hp: 29 },
    boss: { name: 'The Tower Keeper', hp: 100 },
  }[kind];
  const hp = definition.hp + (floor - 1) * 7 + (elite ? 12 : 0);
  return { name: definition.name, kind, hp, maxHp: hp, block: 0, turn: 0, elite };
}
export function enemyIntent(enemy: Enemy, floor: number): Intent {
  const pattern: Record<EnemyKind, Intent[]> = {
    scout: [
      { type: 'attack', value: 6, label: 'Quick strike' },
      { type: 'attack', value: 9, label: 'Heavy strike' },
      { type: 'defend', value: 8, label: 'Brace' },
    ],
    warden: [
      { type: 'defend', value: 10, label: 'Fortify' },
      { type: 'attack', value: 12, label: 'Crush' },
      { type: 'attack', value: 7, label: 'Jab' },
    ],
    leech: [
      { type: 'drain', value: 8, label: 'Siphon (+4 HP)' },
      { type: 'attack', value: 10, label: 'Lunge' },
    ],
    boss: [
      { type: 'attack', value: 13, label: 'Judgement' },
      { type: 'defend', value: 13, label: 'Edict of Stone' },
      { type: 'attack', value: 18, label: 'Towerfall' },
    ],
  };
  const intent = pattern[enemy.kind][enemy.turn % pattern[enemy.kind].length];
  return { ...intent, value: intent.value + Math.max(0, floor - 1) * (intent.type === 'defend' ? 2 : 1) };
}
function availableRewards(state: GameState, relicsOnly = false): Reward[] {
  return REWARDS.filter((reward) =>
    (!relicsOnly || (reward.id !== 'twins' && reward.id !== 'royals')) &&
    (reward.id !== 'short' || !state.perks.shortHanded) &&
    (reward.id !== 'hand' || state.perks.handSize < 11),
  );
}
function rewardsForWin(state: GameState): Reward[] {
  if (state.fightsWon === 0) return [REWARDS[5], REWARDS[0], REWARDS[6]];
  return shuffle(availableRewards(state)).slice(0, 3);
}
function rewardsForCoffer(state: GameState): Reward[] {
  return shuffle(availableRewards(state, true)).slice(0, 3);
}
function grantReward(state: GameState, id: RewardId): GameState {
  const perks = { ...state.perks };
  let deck = state.deck;
  let cardCounter = state.cardCounter;
  if (id === 'spades' || id === 'clubs') perks[id] += 2;
  if (id === 'hearts' || id === 'diamonds') perks[id] += 1;
  if (id === 'hand') perks.handSize = Math.min(11, perks.handSize + 1);
  if (id === 'short') perks.shortHanded = true;
  if (id === 'twins' || id === 'royals') {
    const rank = id === 'twins' ? 7 : 12;
    const suits: Suit[] = id === 'twins' ? ['spades', 'clubs'] : ['spades', 'hearts'];
    deck = [...deck, ...suits.map((suit) => ({ id: 'bonus-' + (++cardCounter), suit, rank }))];
  }
  return { ...state, perks, deck, cardCounter };
}
function beginBattle(state: GameState, kind: EnemyKind, elite = false): GameState {
  const cards = drawToLimit(shuffle(state.deck), [], [], state.perks.handSize);
  const enemy = createEnemy(kind, state.floor, elite);
  return {
    ...state, scene: 'combat', hand: cards.hand, drawPile: cards.drawPile,
    discardPile: cards.discardPile, enemy, selected: [], turn: 1,
    log: [enemy.name + ' blocks your ascent.'],
    notification: 'Choose five cards, then play your hand.',
  };
}
function resolveRoom(state: GameState, room: Room): GameState {
  switch (room) {
    case 'battle': return beginBattle(state, (['scout', 'warden', 'leech'] as EnemyKind[])[Math.floor(Math.random() * 3)]);
    case 'elite': return beginBattle(state, 'warden', true);
    case 'shop': return { ...state, scene: 'shop', shopBought: [], notification: 'A merchant offers unusual bargains.' };
    case 'rest': return { ...state, hp: Math.min(state.maxHp, state.hp + 14), notification: 'You rest and recover 14 HP.' };
    case 'cache': return { ...state, scene: 'reward', rewardSource: 'coffer',
      rewards: rewardsForCoffer(state), notification: 'The Coffer holds a choice of relics. Select one.' };
    case 'fortune': return { ...state, luck: state.luck + 2, notification: 'A fortunate omen grants 2 Luck.' };
    case 'forge': return { ...state, perks: { ...state.perks, clubs: state.perks.clubs + 1 }, notification: 'The forge reinforces your Clubs (+1 block).' };
    default: return { ...state, notification: 'You find a quiet stairwell.' };
  }
}
function applyEnemyTurn(state: GameState, newEnemy: Enemy, playerBlock: number, messages: string[]): GameState {
  const intent = enemyIntent(newEnemy, state.floor);
  const enemy = { ...newEnemy, turn: newEnemy.turn + 1 };
  let hp = state.hp;
  if (intent.type === 'defend') {
    enemy.block += intent.value;
    messages.push(enemy.name + ' gains ' + intent.value + ' block.');
  } else {
    const damage = Math.max(0, intent.value - playerBlock);
    hp -= damage;
    if (intent.type === 'drain') enemy.hp = Math.min(enemy.maxHp, enemy.hp + 4);
    messages.push(enemy.name + ' deals ' + damage + ' damage' + (intent.type === 'drain' ? ' and heals 4.' : '.'));
  }
  if (hp <= 0) {
    return { ...state, hp: 0, enemy, scene: 'gameover', selected: [], log: [...messages, ...state.log].slice(0, 5) };
  }
  const drawn = drawToLimit(state.drawPile, state.discardPile, state.hand, state.perks.handSize);
  return {
    ...state, hp, enemy, selected: [], turn: state.turn + 1,
    ...drawn, log: [...messages, ...state.log].slice(0, 5),
    notification: 'Choose a hand. One play this turn.',
  };
}
function resolvePlay(state: GameState): GameState {
  const cards = state.hand.filter((card) => state.selected.includes(card.id));
  const score = scoreHand(cards);
  if (!score || (!state.perks.shortHanded && cards.length !== 5)) return state;
  const powers = scorePowers(cards, score, state.perks);
  const enemy = { ...state.enemy! };
  const absorbed = Math.min(enemy.block, powers.attack);
  enemy.block -= absorbed;
  enemy.hp -= powers.attack - absorbed;
  const messages = [
    score.name + ' ×' + score.multiplier + ': ' + powers.attack + ' damage, ' +
    powers.block + ' block, ' + powers.heal + ' healing, ' + powers.luck + ' Luck.',
  ];
  const remaining = state.hand.filter((card) => !state.selected.includes(card.id));
  const afterPlay: GameState = {
    ...state, enemy, hand: remaining,
    discardPile: [...state.discardPile, ...cards],
    hp: Math.min(state.maxHp, state.hp + powers.heal),
    luck: state.luck + powers.luck, selected: [], log: [...messages, ...state.log].slice(0, 5),
  };
  if (enemy.hp <= 0) {
    if (enemy.kind === 'boss') {
      return { ...afterPlay, scene: 'victory', notification: 'The Tower Keeper has fallen. You conquered Balthasar!' };
    }
    const won = { ...afterPlay, gold: afterPlay.gold + (enemy.elite ? 22 : 12), fightsWon: state.fightsWon + 1 };
    return {
      ...won, scene: 'reward', rewardSource: 'battle', rewards: rewardsForWin(state),
      notification: 'Victory! Claim one reward or continue upward.',
    };
  }
  return applyEnemyTurn(afterPlay, enemy, powers.block, []);
}
export function canPlay(state: GameState): boolean {
  return state.scene === 'combat' &&
    (state.selected.length === 5 || (state.perks.shortHanded && state.selected.length > 0));
}
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_RUN': return newGame();
    case 'TOGGLE_CARD': {
      if (state.scene !== 'combat') return state;
      const selected = state.selected.includes(action.id)
        ? state.selected.filter((id) => id !== action.id)
        : state.selected.length < 5 ? [...state.selected, action.id] : state.selected;
      return { ...state, selected };
    }
    case 'ROLL':
      if (state.scene !== 'board' || state.rolled !== null) return state;
      { const n = Math.floor(Math.random() * 6) + 1;
        return { ...state, rolled: n, steps: n, notification: 'Rolled ' + n + '. Spend Luck to adjust your landing.' }; }
    case 'ADJUST_ROLL':
      if (state.scene !== 'board' || state.rolled === null || state.luck < 1 ||
          state.steps === null || state.steps + action.delta < 1 || state.steps + action.delta > 6) return state;
      return { ...state, steps: state.steps + action.delta, luck: state.luck - 1 };
    case 'LAND': {
      if (state.scene !== 'board' || state.steps === null) return state;
      const sum = state.position + state.steps;
      const wrapped = sum >= 12;
      if (wrapped && state.floor === 3) {
        return beginBattle({ ...state, rolled: null, steps: null }, 'boss');
      }
      const floor = state.floor + (wrapped ? 1 : 0);
      const position = sum % 12;
      const spaces = wrapped ? state.nextSpaces : state.spaces;
      const nextSpaces = wrapped ? generateFloor() : state.nextSpaces;
      return resolveRoom({
        ...state, floor, position, spaces, nextSpaces, rolled: null, steps: null,
        notification: 'You moved ' + state.steps + ' spaces.',
      }, spaces[position]);
    }
    case 'PLAY':
      return canPlay(state) ? resolvePlay(state) : state;
    case 'PASS':
      if (state.scene !== 'combat' || !state.enemy) return state;
      return applyEnemyTurn(state, state.enemy, 0, ['You pass without scoring a hand.']);
    case 'CHOOSE_REWARD': {
      if (state.scene !== 'reward' || !state.rewards.some((r) => r.id === action.id)) return state;
      return { ...grantReward(state, action.id), scene: 'board', rewards: [], rewardSource: null,
        notification: REWARDS.find((r) => r.id === action.id)!.title + ' acquired.' };
    }
    case 'SKIP_REWARD':
      return state.scene === 'reward' ? { ...state, scene: 'board', rewards: [], rewardSource: null,
        notification: 'Reward skipped.' } : state;
    case 'SHOP_BUY': {
      const reward = REWARDS.find((r) => r.id === action.id);
      if (state.scene !== 'shop' || !reward || state.shopBought.includes(reward.id) ||
        state.gold < reward.cost || (reward.id === 'short' && state.perks.shortHanded) ||
        (reward.id === 'hand' && state.perks.handSize >= 11)) return state;
      return { ...grantReward(state, action.id), gold: state.gold - reward.cost,
        shopBought: [...state.shopBought, action.id], notification: reward.title + ' purchased.' };
    }
    case 'LEAVE_SHOP':
      return state.scene === 'shop' ? { ...state, scene: 'board', notification: 'Back to the staircase.' } : state;
    default: return state;
  }
}
