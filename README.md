# Balthasar ♠ ♣ ♥ ♦

**A roguelike poker-hand card battler with a dice-driven square tower.**

Choose which cards score and which get sacrificed as kickers. Build mixed-suit hands that deal damage, block, heal, and generate Luck. Use Luck to manipulate where the dice take you on the tower's staircase.

## Play the prototype

After merging the prototype PR into `main`, enable **GitHub Pages → Source: GitHub Actions** in repository settings. The included workflow runs tests and publishes the Vite build on pushes to `main`.

For local play:

```sh
npm install
npm run dev
```

Open the local URL shown by Vite.

Run tests and a production build:

```sh
npm test
npm run build
```

## Rules at a glance

- One poker-hand play per player turn. Start with **8 cards** in hand.
- By default, submit **exactly five cards** to score; the **Short-Handed** relic unlocks 1–5-card plays.
- Only the cards belonging to the scored poker combination activate suit powers. A mixed-suit pair (8♠ + 8♣) delivers both attack and block; three kickers have no effects.
- ♠ **Spades:** damage. ♣ **Clubs:** block. ♥ **Hearts:** healing. ♦ **Diamonds:** Luck.
- All played cards enter the discard pile. Reshuffle the discard pile when the draw pile runs out.
- **Retain** unplayed cards; draw back to the hand limit on the next turn.
- Enemy actions are telegraphed, then resolve after your one hand play.
- Roll a D6 to move on a **12-space square staircase**. Spend Luck to alter the result. The next floor is pre-generated so the predicted landing stays accurate.
- Fight enemies, rest, shop, open Coffers for a **free relic choice**, acquire upgrades, and ascend three floors to face the Tower Keeper.
- Duplicate and edited cards make **Five of a Kind**, **Flush House**, and **Flush Five** possible. These score all five cards, and Flush Five ranks highest.

The starter deck is 32 cards (ranks 2–9 across four suits). This and most numbers are prototype balance defaults, not final design.

## Project structure

- `src/game.ts`: pure hand scoring, suit powers, drawing/reshuffling, enemy combat, game state.
- `src/main.tsx`: responsive game UI.
- `src/styles.css`: card and square-board styles.
- `src/game.test.ts`: baseline hand-scoring and deck tests.
- `docs/GAME_DESIGN.md`: locked rules, temporary assumptions, future questions.
- `.github/workflows/pages.yml`: CI + GitHub Pages deployment after merge.

## Scope and caveats

This is a **playable rules prototype**, not a content-complete roguelike. The board, enemies, upgrades, card economy and UI will evolve through playtests. Luck and dice rolls currently use `Math.random` rather than seeded runs. Progress does not persist on refresh.

Built with React, TypeScript and Vite. No back end is required.
