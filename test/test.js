const _ = require('lodash');
const assert = require('assert');
const { Hand, Cards, Card, Value, Suit, Round, Player, Action } = require('../src/poker');

describe('Cards', function() {
	describe('getStraight()', function() {
		it('should return highest straight of given length', function() {
			var cards = new Cards('A♥ 2♥ 3♥ 4♥ 5♥ 6♥ 7♦ K♥');

			assert.equal(Cards.isSame(cards.getStraight(3), new Cards('7♦ 6♥ 5♥')), true);
			assert.equal(Cards.isSame(cards.getStraight(7), new Cards('A♥ 2♥ 3♥ 4♥ 5♥ 6♥ 7♦')), true);
		});
	});
});

describe('Hand', function() {
	describe('Type', function() {
		describe('is()', function() {
			it('should evaluate royal flush correctly', function() {
				var royalFlush = new Cards('A♥ K♥ Q♥ J♥ 10♥ 3♦');
				var { hand } = Hand.Type.ROYAL_FLUSH.is(royalFlush);

				assert.equal(Cards.isSame(new Cards(hand), new Cards('A♥ K♥ Q♥ J♥ 10♥')), true);
			});

			it('should evaluate straight flush correctly', function() {
				var straightFlush = new Cards('3♥ 4♥ 5♥ 6♥ 7♥ 3♦');
				var { hand } = Hand.Type.FLUSH.is(straightFlush);

				assert.equal(Cards.isSame(new Cards(hand), new Cards('3♥ 4♥ 5♥ 6♥ 7♥')), true);
			});

			it('should evaluate four of a kind correctly', function() {
				var four = new Cards('3♥ 3♠ 3♣ 3♦ 10♥ 4♦');
				var { hand } = Hand.Type.FOUR_OF_A_KIND.is(four);

				assert.equal(Cards.isSame(new Cards(hand), new Cards('3♥ 3♠ 3♣ 3♦')), true);
			});

			it('should evaluate full house correctly', function() {
				var fullHouse = new Cards('3♥ 3♠ 3♣ 10♦ 10♥ 4♦');
				var { hand } = Hand.Type.FULL_HOUSE.is(fullHouse);

				assert.equal(Cards.isSame(new Cards(hand), new Cards('3♥ 3♠ 3♣ 10♦ 10♥')), true);
			});

			it('should evaluate flush correctly', function() {
				var flush = new Cards('3♥ 5♥ 6♥ 8♥ 10♥ 4♦');
				var { hand } = Hand.Type.FLUSH.is(flush);

				assert.equal(Cards.isSame(new Cards(hand), new Cards('3♥ 5♥ 6♥ 8♥ 10♥')), true);
			});

			it('should evaluate straight correctly', function() {
				var straight = new Cards('A♥ 2♠ 3♣ 4♦ 5♥ 9♦');
				var { hand } = Hand.Type.STRAIGHT.is(straight);

				assert.equal(Cards.isSame(new Cards(hand), new Cards('A♥ 2♠ 3♣ 4♦ 5♥')), true);
			});

			it('should evaluate three of a kind correctly', function() {
				var three = new Cards('A♥ A♠ A♣ 4♦ 6♥ 9♦');
				var { hand } = Hand.Type.THREE_OF_A_KIND.is(three);

				assert.equal(Cards.isSame(new Cards(hand), new Cards('A♥ A♠ A♣')), true);
			});

			it('should evaluate two pair correctly', function() {
				var twoPair = new Cards('A♥ A♠ 3♣ 3♦ 5♥ 8♦');
				var { hand } = Hand.Type.TWO_PAIR.is(twoPair);

				assert.equal(Cards.isSame(new Cards(hand), new Cards('A♥ A♠ 3♣ 3♦')), true);
			});

			it('should evaluate pair correctly', function() {
				var pair = new Cards('A♥ 2♠ 3♣ 5♦ 5♥ 8♦');
				var { hand } = Hand.Type.PAIR.is(pair);

				assert.equal(Cards.isSame(new Cards(hand), new Cards('5♦ 5♥')), true);
			});

			it('should evaluate high card correctly', function() {
				var high = new Cards('A♥ 7♠ 3♣ 4♦ 5♥');
				var { hand } = Hand.Type.HIGH_CARD.is(high);

				assert.equal(Cards.isSame(new Cards(hand), new Cards('A♥')), true);
			});


			it('should rank two two pairs correctly', function() {
				var communityCards = new Cards('A♥ A♠ 3♣ 2♦ 7♥');
				var leftCards = new Hand(new Cards('Q♣ 6♣'), communityCards); // should rank higher
				var rightCards = new Hand(new Cards('J♣ 6♥'), communityCards); // should rank lower
				var result = Hand.compare(leftCards, rightCards);

				assert.equal(result, 1);

				result = Hand.compare(rightCards, leftCards);

				assert.equal(result, -1);
			});

			it('should rank two two pairs correctly with lowest card in hand to rank', function() {
				var communityCards = new Cards('A♥ A♠ 3♣ 2♦ 7♥');
				var leftCards = new Hand(new Cards('Q♣ 6♣'), communityCards); // should rank higher
				var rightCards = new Hand(new Cards('Q♦ 5♥'), communityCards); // should rank lower
				var result = Hand.compare(leftCards, rightCards);

				assert.equal(result, 1);

				result = Hand.compare(rightCards, leftCards);

				assert.equal(result, -1);
			});
		});
	});
});


describe('Round', function() {
	describe('isAwaitingAction()', function() {
		it('should return true if no players acted', function() {
			var player1 = new Player('player1'),
				player2 = new Player('player2'),
				round = new Round([player1, player2], null);

			round.start();

			assert(round.isAwaitingAction());
		});

		it('should return true if all but one player calls', function() {
			var player1 = new Player('player1'),
				player2 = new Player('player2'),
				round = new Round([player1, player2], null);

			round.start();

			round.act(player2, new Action(Action.Type.BET, { value: 100 }));

			assert(round.isAwaitingAction());
		});

		it('should return false if all but one player folds', function() {
			var player1 = new Player('player1'),
				player2 = new Player('player2'),
				round = new Round([player1, player2], null);

			round.start();

			round.act(player2, new Action(Action.Type.FOLD));

			assert(!round.isAwaitingAction());
		});

		it('should return true after flop', function() {
			var player1 = new Player('player1'),
				player2 = new Player('player2'),
				round = new Round([player1, player2], null);

			round.start();

			round.act(player2, new Action(Action.Type.BET, { value: 100 }));
			round.act(player1, new Action(Action.Type.CALL, { value: 100 }));

			assert(round.progress === Round.State.FLOPPED);
			assert(round.isAwaitingAction());
		});
	});

	describe('dead()', function() {
		it('should remove the player from the round', function() {
			var player1 = new Player('player 1'),
				round = new Round([player1]);

			round.start();

			round.dead(player1);
			assert(!round.getActingPlayer());
		});
	});

	describe('act()', function() {
		it('should correctly transition to next game state', function() {
			var player1 = new Player('player1'),
				player2 = new Player('player2'),
				round = new Round([player1, player2]);

			round.start();

			assert.equal(round.progress, Round.State.DEALT, 'First game state should be DEALT');

			round.act(player2, new Action(Action.Type.BET, { value: 100 }));
			round.act(player1, new Action(Action.Type.CALL, { value: 100 }));

			assert.equal(round.progress, Round.State.FLOPPED, 'Second game state should be FLOPPED');

			round.act(player2, new Action(Action.Type.CHECK));
			round.act(player1, new Action(Action.Type.CHECK));

			assert.equal(round.progress, Round.State.TURNED, 'Third game state should be TURNED');
		});
	});
});


// ♥
// ♠
// ♣
// ♦



//QQQ99 wins over QQ999

// Incorrect Cases:

// Case 1 -------------------
// Player 1: 10♠ 5♣
// Player 2: 10♥ 4♥
// Player 3: 10♣ 7♠
// Table: K♣ J♦ J♥ 3♠ 2♠
// Player 3 (Pair)
// Player 2 (Pair)
// Player 1 (Pair)
// ------------ Expected: player 1 second

// Case 2 -------------------
// Player 1: 6♥ 5♦
// Player 2: A♦ 3♣
// Table: A♥ 6♣ 5♠ 4♥ 3♠
// Player 2 (Two Pair)
// Player 1 (Two Pair)
// Winners
// Player 2 (Two Pair)
// Player 1 (Two Pair)
// ------------ Expected: player 2  win

// Case 3 -------------------
// Player 1: K♥ 3♦
// Player 2: K♣ 10♣
// Table: A♣ A♥ 9♦ 9♣ 3♥
// Player 2 (Two Pair)
// Player 1 (Pair)
// Winners
// Player 2 (Two Pair)
// ------------ Expected: tie (both have two pair)

// Case 4 -------------------
// Player 1: A♦ 3♠
// Player 2: 10♦ 8♥
// Table: K♥ J♣ 9♥ 6♠ 2♠
// Player 2 (High Card)
// Player 1 (High Card)
// Winners
// Player 2 (High Card)
// Player 1 (High Card)
// ------------ Expected: player 1 win (ace high)

// Case 5 -------------------
// Player 1: K♣ 7♦
// Player 2: A♠ J♣
// Table: A♥ 7♠ 5♦ 4♠ 4♦
// --Ranked
// Player 2 (Two Pair)
// Player 1 (Two Pair)
// --Winners
// Player 2 (Two Pair)
// Player 1 (Two Pair)
// ------------ Expected: player 2 win (ace pair)

// Case 6 -------------------
// Player 1: 9♠ 3♦
// Player 2: K♥ J♣
// Player 3: 8♣ 6♣
// Player 4: A♣ 9♦
// Player 5: 8♦ 3♠
// Table: K♣ Q♦ J♥ 4♥ 4♦
// --Ranked
// Player 2 (Pair)
// Player 4 (Pair)
// Player 5 (Pair)
// Player 3 (Pair)
// Player 1 (Pair)
// --Winners
// Player 2 (Pair J♣ J♥)
// ------------- Expected: two pair for player 2
