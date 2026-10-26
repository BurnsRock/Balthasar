# Balthasar: first playable design

**Pitch:** A suit-powered poker battler exploring a square staircase that climbs a dangerous tower. Poker influences combat; Monopoly-style dice influence exploration.

## Locked prototype rules

- Exactly **one scoring poker hand per player turn**.
- **8-card starting hand size**, retain unplayed cards and draw back to the limit on each new player turn.
- **Normally play exactly five cards.** The **Short-Handed relic** permits plays with 1–5 cards.
- Only cards involved in the **scoring combination** activate suits. A mixed 8♠ + 8♣ Pair activates both attack and block. Three kickers in the five-card play discard with **no effects**.
- ♠ Spades deal damage, ♣ Clubs grant block, ♥ Hearts heal, ♦ Diamonds generate Luck.
- Rank establishes strength, modified by poker-hand multipliers and permanent upgrades.
- Played cards go to discard. The draw pile reshuffles its discard pile when depleted, similar to Slay the Spire.
- No automatic full-hand discard at turn end: cards you keep carry forward.
- Enemy intention is public. Enemy acts **after** the single scoring play.
- Luck is spent to move a die roll up or down by one space per point.
- Each floor displays a **10×10 grid with a 36-space perimeter**. Moving clockwise around the complete perimeter climbs a floor. Both current and upcoming floor maps can be inspected; the next floor is pre-generated, and crossing a floor boundary automatically previews/highlights the destination. Completing the third floor triggers the tower boss.
- Upgrades and extra cards can be earned after battles or bought in shops. **Coffers** grant a free choice of one of three relic upgrades, without initiating combat or granting gold.
- Shopkeepers may **permanently remove one chosen card per shop** from the canonical deck. The fee starts at 15 gold and increases by 10 per previous removal across the run. Removal is blocked if the deck would fall below 8 cards.
- Modified decks can form **Five of a Kind** (five matching ranks), **Flush House** (three-of-a-kind and a pair, all one suit), or **Flush Five** (five identical ranks and suits). These rank above Straight Flush; all five scoring cards activate.

## Intentionally provisional

- Starting deck: ranks 2–9, all four suits (32 cards).
- 68 starting HP, 2 Luck, 12 gold; 8 starting hand size.
- Multiplier progression, per-suit power rates, enemy HP/damage, rewards, shop prices and number of floors.
- Enemy actions, room frequencies and board landing effects.
- Dice-based movement after each resolved board space, with optional Luck manipulation.
- Cards rank 10 and above are available through certain rewards, not in the initial deck.

## Future design questions

1. Are five-card submissions always desirable? Can more relics modify play size and kicker behavior?
2. Does retained-card strategy dominate cycling? Watch stalled hands and draw-locks.
3. Should turns allow optional burning of a hand, or is passing sufficient?
4. How does the tower's square geometry matter beyond presentation? Possible suit-themed walls.
5. Are Diamonds too powerful when used for both Luck generation and traversal?
6. Would persistent deck thinning, joker-like relics and suit enhancement overpower poker-hand composition?

## Prototype acceptance tests

- Players can form a mixed-suit Pair and see only those two suit effects.
- Exactly one hand resolves before an enemy action; no second play that turn.
- Eight cards are held initially, and unplayed cards remain through subsequent draws.
- Draw/discard piles recycle and permit longer fights.
- 10×10 maps, correct clockwise perimeter indices, Luck adjustment, next-floor visual previews, varied room landings and floor climbing work.
- Card removal deducts the correct gold, persists across battles, is limited to one per shop and never leaves fewer than 8 cards.
- Rewards modify combat or add cards, Coffer landings offer a free relic choice, and loss/restart/win states are reachable.
- Enhanced-deck hands (Five of a Kind / Flush House / Flush Five) trigger correctly, while floor-transition landings never silently reroll the preview.
- Layout is usable on narrow phones and on foldable screens.
