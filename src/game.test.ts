import { describe, expect, it } from 'vitest';
import { canPlay, createEnemy, drawToLimit, gameReducer, newGame, scoreHand, scorePowers, startingDeck, type Card } from './game';

const c = (rank: number, suit: Card['suit'], id = suit + rank): Card => ({ id, rank, suit });

describe('poker scoring', () => {
  it('activates both mixed-suit pair cards but not kickers', () => {
    const cards = [c(8, 'spades'), c(8, 'clubs'), c(3, 'hearts'), c(6, 'diamonds'), c(9, 'spades')];
    const score = scoreHand(cards)!;
    expect(score.name).toBe('Pair');
    expect(score.activeIds).toEqual(['spades8', 'clubs8']);
    const effects = scorePowers(cards, score, newGame().perks);
    expect(effects).toEqual({ attack: 10, block: 10, heal: 0, luck: 0 });
  });
  it('activates all five cards in a full house', () => {
    const cards = [c(7, 'spades'), c(7, 'clubs'), c(7, 'hearts'), c(4, 'spades'), c(4, 'diamonds')];
    expect(scoreHand(cards)!.activeIds).toHaveLength(5);
    expect(scoreHand(cards)!.name).toBe('Full House');
  });
  it('handles ace-low straights', () => {
    const cards = [c(14, 'spades'), c(2, 'clubs'), c(3, 'hearts'), c(4, 'clubs'), c(5, 'spades')];
    expect(scoreHand(cards)!.name).toBe('Straight');
  });
  it('does not treat four cards as a flush or a straight', () => {
    expect(scoreHand([c(2, 'spades'), c(3, 'spades'), c(4, 'spades'), c(5, 'spades')])!.name).toBe('High Card');
  });
  it('counts two pairs, not the kicker', () => {
    const hand = [c(2,'clubs'), c(2,'hearts'), c(6,'spades'), c(6,'diamonds'), c(9,'spades')];
    expect(scoreHand(hand)!.activeIds).toHaveLength(4);
  });
});
describe('deck and turns', () => {
  it('starts with 32 unique cards and an eight-card hand limit', () => {
    const state = newGame();
    expect(startingDeck()).toHaveLength(32);
    expect(new Set(state.deck.map((card) => card.id)).size).toBe(32);
    expect(state.perks.handSize).toBe(8);
  });
  it('recycles discards only when draw pile is empty', () => {
    const result = drawToLimit([c(2,'spades')], [c(3,'clubs'), c(4,'hearts')], [], 3, () => 0);
    expect(result.hand).toHaveLength(3);
    expect(result.drawPile).toHaveLength(0);
    expect(result.discardPile).toHaveLength(0);
  });
  it('rejects a standard two-card scoring play without the relic', () => {
    const base = newGame();
    const state = { ...base, scene: 'combat' as const, selected: ['a', 'b'] };
    expect(canPlay(state)).toBe(false);
    expect(canPlay({ ...state, perks: { ...state.perks, shortHanded: true } })).toBe(true);
  });
  it('resolves one five-card hand, then the enemy acts and retained cards refill', () => {
    const base = newGame();
    const cards = [c(8, 'spades'), c(8, 'clubs'), c(3, 'hearts'), c(6, 'diamonds'), c(9, 'spades')];
    const retained = [c(4, 'spades'), c(5, 'clubs'), c(7, 'hearts')];
    const state = {
      ...base, scene: 'combat' as const, hand: [...cards, ...retained],
      selected: cards.map((card) => card.id), enemy: createEnemy('boss', 1),
      drawPile: startingDeck().slice(0, 8),
    };
    const after = gameReducer(state, { type: 'PLAY' });
    expect(after.scene).toBe('combat');
    expect(after.turn).toBe(2);
    expect(after.enemy?.turn).toBe(1);
    expect(after.hand).toHaveLength(8);
    expect(after.hand).toEqual(expect.arrayContaining(retained));
    expect(after.discardPile).toHaveLength(5);
    expect(after.hp).toBe(65);
    expect(after.selected).toHaveLength(0);
  });
});
