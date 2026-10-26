import React, { useReducer } from 'react';
import { createRoot } from 'react-dom/client';
import {
  canPlay, enemyIntent, gameReducer, newGame, rankLabel, REWARDS,
  scoreHand, scorePowers, SUIT_SYMBOL,
  type Card, type GameAction, type GameState, type Reward, type Room, type Suit,
} from './game';
import './styles.css';

const ROOM_INFO: Record<Room, { icon: string; name: string; description: string }> = {
  entry: { icon: '⌂', name: 'Landing', description: 'A quiet turn in the staircase' },
  battle: { icon: '⚔', name: 'Battle', description: 'A foe patrols this landing' },
  elite: { icon: '♜', name: 'Elite', description: 'A formidable defender' },
  shop: { icon: '¤', name: 'Merchant', description: 'Spend gold on a relic or cards' },
  rest: { icon: '✚', name: 'Sanctuary', description: 'Recover 14 HP' },
  cache: { icon: '◆', name: 'Coffer', description: 'Collect 16 gold' },
  fortune: { icon: '✦', name: 'Fortune', description: 'Gain 2 Luck' },
  forge: { icon: '⚒', name: 'Forge', description: 'Gain +1 Club block power' },
};
const GRID: (number | null)[] = [
  9, 8, 7, 6,
  10, null, null, 5,
  11, null, null, 4,
  0, 1, 2, 3,
];
const SUIT_INFO: { suit: Suit; name: string; effect: string }[] = [
  { suit: 'spades', name: 'Spades', effect: 'Damage' },
  { suit: 'clubs', name: 'Clubs', effect: 'Block' },
  { suit: 'hearts', name: 'Hearts', effect: 'Healing' },
  { suit: 'diamonds', name: 'Diamonds', effect: 'Luck' },
];

function Meter({ value, max, danger = false }: { value: number; max: number; danger?: boolean }) {
  const percent = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return <div className={'meter' + (danger ? ' meter-danger' : '')} aria-label={value + ' of ' + max} role="progressbar"
    aria-valuenow={Math.max(0, value)} aria-valuemin={0} aria-valuemax={max}>
    <span style={{ width: percent + '%' }} />
  </div>;
}
function Stat({ icon, label, value, danger = false }: { icon: string; label: string; value: string | number; danger?: boolean }) {
  return <div className="stat">
    <span className={'stat-icon' + (danger ? ' danger' : '')} aria-hidden="true">{icon}</span>
    <div><small>{label}</small><strong>{value}</strong></div>
  </div>;
}
function Header({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  return <header className="site-header">
    <div className="brand">
      <span className="brand-seal">B</span>
      <div>
        <div className="brand-name">BALTHASAR</div>
        <div className="brand-subtitle">ASCEND BY CHANCE</div>
      </div>
    </div>
    <div className="hud" aria-label="Run statistics">
      <Stat icon="♥" label="HEALTH" value={state.hp + ' / ' + state.maxHp} danger />
      <Stat icon="◆" label="GOLD" value={state.gold} />
      <Stat icon="✦" label="LUCK" value={state.luck} />
      <Stat icon="♜" label="FLOOR" value={state.floor + ' / 3'} />
    </div>
    <button className="reset-button" onClick={() => {
      if (window.confirm('Abandon this run and begin again?')) dispatch({ type: 'NEW_RUN' });
    }} title="Start a new run">↻ <span>NEW RUN</span></button>
  </header>;
}
function Title({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="screen-title">
    <span className="eyebrow">{eyebrow}</span>
    <h1>{title}</h1>
    <p>{subtitle}</p>
  </div>;
}
function Board({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const landing = state.steps === null ? null : (state.position + state.steps) % 12;
  const towerBoss = state.steps !== null && state.floor === 3 && state.position + state.steps >= 12;
  const crossing = state.steps !== null && state.position + state.steps >= 12;
  return <section className="board-screen screen">
    <Title eyebrow={'THE ASCENT · FLOOR ' + state.floor} title="The Spiral Stair"
      subtitle="One circuit, one floor higher. Roll the die, choose where to land, and survive the tower." />
    <div className="layout board-layout">
      <div className="panel board-panel">
        <div className="panel-topline"><span>THE TWELVE LANDINGS</span><span>↗ CLOCKWISE</span></div>
        <div className="tower-board" aria-label="Square tower map">
          <div className="tower-core">
            <span className="tower-core-symbol">♜</span>
            <span>FLOOR</span>
            <strong>{state.floor}</strong>
            <small>OF THREE</small>
          </div>
          {GRID.map((index, i) => index === null
            ? <div className="board-void" key={'v' + i} />
            : <div key={index} className={
                'tower-tile tile-' + state.spaces[index] +
                (index === state.position ? ' tile-current' : '') +
                (landing === index ? ' tile-landing' : '')
              }>
                <span className="tile-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="tile-icon" aria-hidden="true">{index === state.position ? '♟' : ROOM_INFO[state.spaces[index]].icon}</span>
                <span className="tile-name">{index === state.position ? 'YOU' : ROOM_INFO[state.spaces[index]].name}</span>
              </div>,
          )}
        </div>
        <div className="legend">
          <span><i className="dot current" />Your location</span>
          <span><i className="dot destination" />Next landing</span>
          <span>Wrap around to climb</span>
        </div>
      </div>
      <div className="board-sidebar">
        <div className="panel dice-panel">
          <div className="panel-topline"><span>FATE'S THROW</span><span>1D6</span></div>
          {state.rolled === null
            ? <>
                <div className="die-display idle"><span>⚄</span><small>AWAITING YOUR ROLL</small></div>
                <button className="primary-button full" onClick={() => dispatch({ type: 'ROLL' })}>⚄ ROLL TO MOVE</button>
              </>
            : <>
                <div className="die-display"><strong>{state.steps}</strong><small>ROLLED {state.rolled}</small></div>
                <div className="roll-tuning">
                  <button aria-label="Move one space less for one Luck" disabled={state.luck < 1 || state.steps! <= 1}
                    onClick={() => dispatch({ type: 'ADJUST_ROLL', delta: -1 })}>−1 <span>✦</span></button>
                  <span>SPEND LUCK</span>
                  <button aria-label="Move one space more for one Luck" disabled={state.luck < 1 || state.steps! >= 6}
                    onClick={() => dispatch({ type: 'ADJUST_ROLL', delta: 1 })}>+1 <span>✦</span></button>
                </div>
                <p className="landing-preview">{towerBoss
                  ? 'Next: The Tower Keeper'
                  : crossing ? 'Next: Unknown chamber · floor ' + (state.floor + 1) :
                    'Next: ' + ROOM_INFO[state.spaces[landing!]].name}</p>
                <button className="primary-button full" onClick={() => dispatch({ type: 'LAND' })}>LAND HERE ↗</button>
              </>
          }
        </div>
        <div className="panel notice-panel">
          <div className="panel-topline"><span>THE TOWER'S WHISPER</span></div>
          <p>{state.notification}</p>
          <div className="floor-track"><span>ASCENT PROGRESS</span><strong>{state.floor} / 3</strong></div>
          <Meter value={state.floor - 1 + state.position / 12} max={3} />
        </div>
        <div className="panel guide-panel">
          <div className="panel-topline"><span>THE FOUR SUITS</span></div>
          {SUIT_INFO.map((item) => <div className="suit-guide" key={item.suit}>
            <span className={'suit-symbol ' + item.suit}>{SUIT_SYMBOL[item.suit]}</span>
            <span>{item.name}</span><strong>{item.effect}</strong>
          </div>)}
        </div>
      </div>
    </div>
  </section>;
}
function PlayingCard({ card, selected, scored, clickable, onClick }: {
  card: Card; selected?: boolean; scored?: boolean; clickable?: boolean; onClick?: () => void;
}) {
  return <button
    type="button" onClick={onClick} disabled={!clickable} aria-pressed={!!selected}
    aria-label={rankLabel(card.rank) + ' of ' + card.suit + (selected ? ', selected' : '')}
    className={'playing-card suit-' + card.suit +
      (selected ? ' card-selected' : '') + (scored ? ' card-scored' : '') +
      (!clickable ? ' card-locked' : '')}>
    <span className="card-corner">{rankLabel(card.rank)}<b>{SUIT_SYMBOL[card.suit]}</b></span>
    <span className="card-pip">{SUIT_SYMBOL[card.suit]}</span>
    <span className="card-corner card-corner-bottom">{rankLabel(card.rank)}<b>{SUIT_SYMBOL[card.suit]}</b></span>
    {scored && <span className="card-power-dot" aria-label="Scoring card" />}
  </button>;
}
function Combat({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const enemy = state.enemy!;
  const intent = enemyIntent(enemy, state.floor);
  const selected = state.hand.filter((card) => state.selected.includes(card.id));
  const previewReady = canPlay(state);
  const score = previewReady ? scoreHand(selected) : null;
  const powers = score ? scorePowers(selected, score, state.perks) : null;
  return <section className="screen combat-screen">
    <Title eyebrow={'FLOOR ' + state.floor + ' · ENCOUNTER ' + state.turn} title={enemy.name}
      subtitle="Read the enemy's intent. Choose a scoring combination and commit one poker hand this turn." />
    <div className="layout combat-layout">
      <div className="panel encounter-panel">
        <div className="panel-topline"><span>{enemy.elite || enemy.kind === 'boss' ? 'DANGEROUS FOE' : 'ENEMY ENCOUNTER'}</span><span>TURN {state.turn}</span></div>
        <div className={'enemy-emblem enemy-' + enemy.kind} aria-hidden="true">
          <span>{enemy.kind === 'scout' ? '♞' : enemy.kind === 'warden' ? '♜' : enemy.kind === 'leech' ? '☽' : '♛'}</span>
        </div>
        <div className="enemy-name">{enemy.name}</div>
        <div className="enemy-life"><span>ENEMY HEALTH</span><strong>{Math.max(0, enemy.hp)} / {enemy.maxHp}</strong></div>
        <Meter value={enemy.hp} max={enemy.maxHp} danger />
        {enemy.block > 0 && <div className="enemy-block">♣ {enemy.block} shield remaining</div>}
        <div className={'enemy-intent intent-' + intent.type}>
          <span className="intent-icon">{intent.type === 'defend' ? '♣' : intent.type === 'drain' ? '♥' : '⚔'}</span>
          <div><small>NEXT ENEMY ACTION</small><strong>{intent.label}</strong></div>
          <b>{intent.value}</b>
        </div>
        <div className="player-life"><span>YOUR HEALTH</span><strong>{state.hp} / {state.maxHp}</strong></div>
        <Meter value={state.hp} max={state.maxHp} />
        <div className="combat-log" aria-live="polite">
          <small>RECENT ACTIONS</small>
          {state.log.slice(0, 3).map((line, i) => <p key={i}>{line}</p>)}
        </div>
      </div>
      <div className="combat-main">
        <div className="panel hand-panel">
          <div className="panel-topline"><span>YOUR HAND <b>{state.hand.length} / {state.perks.handSize}</b></span><span>ONE PLAY PER TURN</span></div>
          <div className="hand-rules">{state.perks.shortHanded
            ? 'Short-Handed relic active. Play 1–5 cards. Only cards in the scoring combination activate.'
            : 'Select exactly five cards. Scoring cards use their suits; kickers are discarded with no effect.'}</div>
          <div className="cards-area">
            {state.hand.map((card) =>
              <PlayingCard key={card.id} card={card} selected={state.selected.includes(card.id)}
                scored={!!(score && score.activeIds.includes(card.id))}
                clickable onClick={() => dispatch({ type: 'TOGGLE_CARD', id: card.id })} />)}
          </div>
          <div className="pile-stats">
            <span>DRAW PILE <b>{state.drawPile.length}</b></span>
            <span>DISCARD <b>{state.discardPile.length}</b></span>
            <span>SELECTED <b>{state.selected.length} / 5</b></span>
          </div>
        </div>
        <div className="panel scoring-panel">
          <div className="panel-topline"><span>SCORING PREVIEW</span><span>{previewReady ? 'READY TO PLAY' : 'BUILD YOUR HAND'}</span></div>
          <div className="score-heading">
            <div><h2>{score?.name ?? 'Awaiting cards'}</h2><p>{score ? score.activeIds.length + ' cards activate their suits' : (state.perks.shortHanded ? 'Choose one to five cards' : 'Choose ' + (5 - selected.length) + ' more cards')}</p></div>
            <div className="score-multiplier">×{score?.multiplier ?? '—'}</div>
          </div>
          <div className="power-grid">
            <div className="power attack"><span>♠ DAMAGE</span><strong>{powers?.attack ?? 0}</strong></div>
            <div className="power defense"><span>♣ BLOCK</span><strong>{powers?.block ?? 0}</strong></div>
            <div className="power healing"><span>♥ HEAL</span><strong>{powers?.heal ?? 0}</strong></div>
            <div className="power luck"><span>♦ LUCK</span><strong>{powers?.luck ?? 0}</strong></div>
          </div>
          <div className="combat-actions">
            <button className="primary-button" disabled={!previewReady} onClick={() => dispatch({ type: 'PLAY' })}>PLAY HAND ⚔</button>
            <button className="ghost-button" onClick={() => dispatch({ type: 'PASS' })}>PASS TURN</button>
          </div>
          <p className="fine-print">After your play, the enemy acts and you draw back to your hand limit. Unplayed cards stay in hand.</p>
        </div>
      </div>
    </div>
  </section>;
}
function RewardCard({ reward, onClick, disabled, cost, purchased = false }: {
  reward: Reward; onClick: () => void; disabled?: boolean; cost?: number; purchased?: boolean;
}) {
  const glyph = ({
    spades: '♠', clubs: '♣', hearts: '♥', diamonds: '♦',
    hand: '▤', short: '✂', twins: '⑦', royals: 'Q',
  } as Record<string, string>)[reward.id];
  return <button className={'reward-card reward-' + reward.id} disabled={disabled} onClick={onClick}>
    <span className="reward-glyph">{glyph}</span>
    <strong>{reward.title}</strong>
    <p>{reward.description}</p>
    <span className="reward-cta">{purchased ? 'ACQUIRED ✓' : cost === undefined ? 'CHOOSE REWARD ↗' : '◆ ' + cost + ' GOLD'}</span>
  </button>;
}
function RewardScreen({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  return <section className="screen small-screen">
    <Title eyebrow="VICTORY · A CHOICE OF POWER" title="Claim Your Spoils"
      subtitle={'The enemy falls. You earned ' + (state.enemy?.elite ? 22 : 12) + ' gold. Select one reward to shape your next fights.'} />
    <div className="reward-grid">
      {state.rewards.map((reward) =>
        <RewardCard key={reward.id} reward={reward} onClick={() => dispatch({ type: 'CHOOSE_REWARD', id: reward.id })} />)}
    </div>
    <button className="ghost-button skip-button" onClick={() => dispatch({ type: 'SKIP_REWARD' })}>SKIP REWARD →</button>
  </section>;
}
function Shop({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  return <section className="screen small-screen">
    <Title eyebrow="AN UNLIKELY MERCHANT" title="The Gilded Table"
      subtitle="Some bargains reshape your entire run. Purchase as many as you can afford, or continue climbing." />
    <div className="merchant-banner"><span>◆ YOUR PURSE</span><strong>{state.gold} GOLD</strong></div>
    <div className="reward-grid shop-grid">
      {REWARDS.map((reward) => {
        const purchased = state.shopBought.includes(reward.id);
        const cannotStack = (reward.id === 'short' && state.perks.shortHanded) ||
          (reward.id === 'hand' && state.perks.handSize >= 11);
        return <RewardCard key={reward.id} reward={reward} cost={reward.cost} purchased={purchased || cannotStack}
          disabled={purchased || cannotStack || state.gold < reward.cost}
          onClick={() => dispatch({ type: 'SHOP_BUY', id: reward.id })} />;
      })}
    </div>
    <button className="primary-button skip-button" onClick={() => dispatch({ type: 'LEAVE_SHOP' })}>RETURN TO THE TOWER ↗</button>
  </section>;
}
function EndScreen({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const won = state.scene === 'victory';
  return <section className="screen ending-screen">
    <div className="ending-emblem">{won ? '♛' : '♜'}</div>
    <span className="eyebrow">{won ? 'THE TOWER IS YOURS' : 'THE TOWER REMAINS'}</span>
    <h1>{won ? 'Crowned by Chance' : 'The Last Hand'}</h1>
    <p>{won
      ? 'You defeated the Tower Keeper. Fate finally folded.'
      : 'Your ascent ends here. The cards will remember.'}</p>
    <div className="ending-stats">
      <Stat icon="♜" label="FLOOR" value={state.floor} />
      <Stat icon="⚔" label="VICTORIES" value={state.fightsWon + (won ? 1 : 0)} />
      <Stat icon="◆" label="GOLD" value={state.gold} />
      <Stat icon="▤" label="DECK" value={state.deck.length} />
    </div>
    <button className="primary-button" onClick={() => dispatch({ type: 'NEW_RUN' })}>BEGIN ANOTHER ASCENT ↗</button>
  </section>;
}
function Footer({ state }: { state: GameState }) {
  return <footer className="site-footer">
    <span>BALTHASAR <b>·</b> PROTOTYPE 0.1</span>
    <span>{state.perks.shortHanded ? '✂ SHORT-HANDED ACTIVE' : '5-CARD SCORING'} <b>·</b> {state.deck.length} CARDS IN DECK</span>
  </footer>;
}
function App() {
  const [state, dispatch] = useReducer(gameReducer, newGame());
  return <div className="app-shell">
    <Header state={state} dispatch={dispatch} />
    <main>
      {state.scene === 'board' && <Board state={state} dispatch={dispatch} />}
      {state.scene === 'combat' && <Combat state={state} dispatch={dispatch} />}
      {state.scene === 'reward' && <RewardScreen state={state} dispatch={dispatch} />}
      {state.scene === 'shop' && <Shop state={state} dispatch={dispatch} />}
      {(state.scene === 'gameover' || state.scene === 'victory') && <EndScreen state={state} dispatch={dispatch} />}
    </main>
    <Footer state={state} />
  </div>;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
