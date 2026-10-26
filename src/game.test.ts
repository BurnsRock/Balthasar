import { describe, expect, it } from 'vitest';
import { BOARD_SIZE, FLOOR_SPACES, MIN_DECK_SIZE, canPlay, cardRemovalCost, createEnemy, drawToLimit, gameReducer, generateFloor, newGame, scoreHand, scorePowers, startingDeck, tileIndex, type Card } from './game';

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
  it('recognizes mixed-suit Five of a Kind created by deck edits', () => {
    const cards = [
      c(7, 'spades'), c(7, 'clubs'), c(7, 'hearts'),
      c(7, 'diamonds'), c(7, 'spades', 'duplicate-7-spades'),
    ];
    const score = scoreHand(cards)!;
    expect(score.name).toBe('Five of a Kind');
    expect(score.activeIds).toHaveLength(5);
    const powers = scorePowers(cards, score, newGame().perks);
    expect(powers.attack).toBe(77);
    expect(powers.block).toBe(38);
    expect(powers.heal).toBe(22);
    expect(powers.luck).toBe(16);
  });
  it('recognizes Flush House over regular Full House with edited suits', () => {
    const cards = [
      c(7, 'hearts', 'a'), c(7, 'hearts', 'b'), c(7, 'hearts', 'c'),
      c(4, 'hearts', 'd'), c(4, 'hearts', 'e'),
    ];
    const score = scoreHand(cards)!;
    expect(score.name).toBe('Flush House');
    expect(score.activeIds).toHaveLength(5);
    expect(score.multiplier).toBeGreaterThan(4);
  });
  it('recognizes Flush Five as the highest edited-deck combination', () => {
    const cards = Array.from({ length: 5 }, (_, i) => c(7, 'spades', 'seven-' + i));
    const score = scoreHand(cards)!;
    expect(score.name).toBe('Flush Five');
    expect(score.activeIds).toHaveLength(5);
    expect(score.multiplier).toBeGreaterThan(scoreHand([
      c(7, 'hearts', 'a'), c(7, 'hearts', 'b'), c(7, 'hearts', 'c'),
      c(4, 'hearts', 'd'), c(4, 'hearts', 'e'),
    ])!.multiplier);
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
      ...base, scene: 'combat' as const, turn: 1, hand: [...cards, ...retained],
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

describe('Coffers and floor transitions', () => {
  it('opens a free relic-selection screen instead of combat', () => {
    const base = newGame();
    const spaces = [...base.spaces];
    spaces[2] = 'cache';
    const result = gameReducer({ ...base, spaces, rolled: 2, steps: 2 }, { type: 'LAND' });
    expect(result.scene).toBe('reward');
    expect(result.rewardSource).toBe('coffer');
    expect(result.rewards).toHaveLength(3);
    expect(result.rewards.every((reward) => reward.id !== 'twins' && reward.id !== 'royals')).toBe(true);
    expect(result.enemy).toBeNull();
    expect(result.gold).toBe(base.gold);
    const chosen = gameReducer(result, { type: 'CHOOSE_REWARD', id: result.rewards[0].id });
    expect(chosen.scene).toBe('board');
    expect(chosen.rewardSource).toBeNull();
    expect(chosen.rewards).toHaveLength(0);
  });
  it('resolves the pre-generated next floor without rerolling its destination', () => {
    const base = newGame();
    const nextSpaces = [...base.nextSpaces];
    nextSpaces[1] = 'cache';
    const result = gameReducer({
      ...base, floor: 1, position: FLOOR_SPACES - 1, rolled: 2, steps: 2, nextSpaces,
    }, { type: 'LAND' });
    expect(result.floor).toBe(2);
    expect(result.position).toBe(1);
    expect(result.spaces).toEqual(nextSpaces);
    expect(result.scene).toBe('reward');
    expect(result.rewardSource).toBe('coffer');
  });
  it('shows the boss battle at the end of the final circuit', () => {
    const base = newGame();
    const result = gameReducer({
      ...base, floor: 3, position: FLOOR_SPACES - 1, rolled: 2, steps: 2,
    }, { type: 'LAND' });
    expect(result.scene).toBe('combat');
    expect(result.enemy?.kind).toBe('boss');
  });
});

describe('10 by 10 tower floor', () => {
  it('builds 100 grid cells with 36 unique perimeter spaces', () => {
    expect(BOARD_SIZE).toBe(10);
    expect(FLOOR_SPACES).toBe(36);
    const cells = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) =>
      tileIndex(Math.floor(i / BOARD_SIZE), i % BOARD_SIZE));
    const entries = cells.filter((index): index is number => index !== null);
    expect(entries).toHaveLength(FLOOR_SPACES);
    expect([...new Set(entries)].sort((a, b) => a - b)).toEqual(
      Array.from({ length: FLOOR_SPACES }, (_, index) => index));
    expect(tileIndex(9, 0)).toBe(0);
    expect(tileIndex(9, 9)).toBe(9);
    expect(tileIndex(0, 9)).toBe(18);
    expect(tileIndex(0, 0)).toBe(27);
    expect(tileIndex(5, 5)).toBeNull();
  });
  it('populates all 36 rooms and starts at an entry landing', () => {
    const rooms = generateFloor();
    expect(rooms).toHaveLength(FLOOR_SPACES);
    expect(rooms[0]).toBe('entry');
    expect(rooms.filter((room) => room === 'shop')).toHaveLength(3);
    expect(rooms.filter((room) => room === 'cache')).toHaveLength(3);
  });
  it('keeps the next-floor layout stable before crossing', () => {
    const base = newGame();
    const upcoming = [...base.nextSpaces];
    upcoming[0] = 'cache';
    const result = gameReducer({ ...base, position: FLOOR_SPACES - 1,
      rolled: 1, steps: 1, nextSpaces: upcoming }, { type: 'LAND' });
    expect(result.floor).toBe(2);
    expect(result.position).toBe(0);
    expect(result.spaces).toEqual(upcoming);
    expect(result.scene).toBe('reward');
    expect(result.rewardSource).toBe('coffer');
    expect(result.nextSpaces).toHaveLength(FLOOR_SPACES);
  });
  it('does not ascend prematurely at the old 12-space limit', () => {
    const state = newGame();
    const result = gameReducer({ ...state, position: 11,
      rolled: 1, steps: 1 }, { type: 'LAND' });
    expect(result.floor).toBe(1);
    expect(result.position).toBe(12);
  });
});

describe('shop card removal', () => {
  const enterShop = (state = newGame()) => {
    const spaces = [...state.spaces];
    spaces[2] = 'shop';
    return gameReducer({ ...state, scene: 'board', spaces, position: 0,
      rolled: 2, steps: 2 }, { type: 'LAND' });
  };
  it('removes an exact card ID permanently and deducts gold once', () => {
    const game = enterShop({ ...newGame(), gold: 100 });
    expect(game.scene).toBe('shop');
    const card = game.deck[0];
    const price = cardRemovalCost(0);
    const removed = gameReducer(game, { type: 'SHOP_REMOVE_CARD', cardId: card.id });
    expect(removed.deck.some((entry) => entry.id === card.id)).toBe(false);
    expect(removed.deck).toHaveLength(game.deck.length - 1);
    expect(removed.gold).toBe(game.gold - price);
    expect(removed.cardsRemoved).toBe(1);
    expect(removed.shopRemoved).toBe(true);
    expect(gameReducer(removed, { type: 'SHOP_REMOVE_CARD', cardId: game.deck[1].id })).toEqual(removed);
    expect(gameReducer(removed, { type: 'LEAVE_SHOP' }).scene).toBe('board');
  });
  it('raises the next removal price and resets one-use limit in another shop', () => {
    const game = enterShop({ ...newGame(), gold: 100 });
    const removed = gameReducer(game, { type: 'SHOP_REMOVE_CARD', cardId: game.deck[0].id });
    const next = enterShop(gameReducer(removed, { type: 'LEAVE_SHOP' }));
    expect(next.shopRemoved).toBe(false);
    expect(cardRemovalCost(next.cardsRemoved)).toBe(cardRemovalCost(0) + 10);
    const result = gameReducer(next, { type: 'SHOP_REMOVE_CARD', cardId: next.deck[0].id });
    expect(result.gold).toBe(next.gold - 25);
    expect(result.cardsRemoved).toBe(2);
  });
  it('rejects insufficient gold, invalid IDs and out-of-shop removal', () => {
    const game = enterShop(newGame());
    const firstCard = game.deck[0];
    expect(gameReducer(game, { type: 'SHOP_REMOVE_CARD', cardId: firstCard.id })).toEqual(game);
    const rich = { ...game, gold: 100 };
    expect(gameReducer(rich, { type: 'SHOP_REMOVE_CARD', cardId: 'no-such-card' })).toEqual(rich);
    const board = { ...rich, scene: 'board' as const };
    expect(gameReducer(board, { type: 'SHOP_REMOVE_CARD', cardId: firstCard.id })).toEqual(board);
  });
  it('never thins a deck below the minimum safe card count', () => {
    const base = newGame();
    const game = enterShop({ ...base, gold: 100, deck: base.deck.slice(0, MIN_DECK_SIZE) });
    expect(gameReducer(game, { type: 'SHOP_REMOVE_CARD', cardId: game.deck[0].id })).toEqual(game);
  });
});
