const _ = require('lodash');
const cuid = require('cuid');
const colors = require('colors');

const DEAL_SIZE = 2;
const HAND_SIZE = 5;
const ACTION_TIME_LIMIT = 1000;
const MAX_PLAYERS = 8;

const Suits = ['♥','♠','♣','♦'];
const Values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const Heart = '♥';
const Spade = '♠';
const Club = '♣';
const Diamond = '♦';

const Two = '2';
const Three = '3';
const Four = '4';
const Five = '5';
const Six = '6';
const Seven = '7';
const Eight = '8';
const Nine = '9';
const Ten = '10';
const Jack = 'J';
const Queen = 'Q';
const King = 'K';
const Ace = 'A';

class Card {
	constructor(value, suit) {
		if(_.isString(value) && !suit) {
			suit = value.length === 2 ? value[1] : value[2];
			value = value.length === 2 ? value[0] : value[0] + value[1];
		}
		this.value = value;
		this.suit = suit;
		this.rank = Values.findIndex(v => v === value);
	}

	toString() {
		const string = `${this.value}${this.suit}`;
		if(this.isRed()) return colors.red.bgWhite(string);
		return colors.black.bgWhite(string);
	}

	log() {
		console.log(`${this.value} of ${this.suit}`);
	}

	valueOf() {
		return this.rank;
	}

	isSame(card) {
		if(!card.value || !card.suit || !this.suit || !this.value) throw new Error('Invalid card passed for isSame comparison.');
		return this.value === card.value && this.suit === card.suit;
	}

	isSuit(suit) {
		return suit === this.suit;
	}

	isValue(value) {
		return value === this.value;
	}

	isRed() {
		return this.isSuit(Heart) || this.isSuit(Diamond);
	}

	isBlack() {
		return this.isSuit(Spade) || this.isSuit(Club);
	}
}

class Cards {
	constructor(cards) {
		if(_.isString(cards)) {
			this.cards = cards.split(' ').map(card => new Card(card));
		} else {
			this.cards = cards ? cards : [];
		}
	}

	add(card) {
		this.cards.push(card);
	}

	draw() {
		if(!this.cards.length) throw new Error('Not enough cards to draw from');
		return this.cards.pop();
	}

	shuffle() {
		this.cards = _.shuffle(this.cards);
	}

	count() {
		return this.cards.length;
	}

	getCard(index) {
		return this.cards[index];
	}

	getCards() {
		return this.cards;
	}

	getCombined(other) {
		return new Cards(_.concat(this.cards, other.cards));
	}

	getStraight(length) {
		var cards = this.getSorted(),
			straight = new Cards();

		for(var i = 0; i < cards.count(); i++) {
			var currentCard = cards.getCard(i),
			currentLow = straight.count() > 0 ? _.last(straight.cards) : null;
			console.log(currentCard, currentCard.valueOf(), currentLow, currentLow ? currentLow.valueOf() : null);

			if(!currentLow) {
				// first card
				straight.add(currentCard);
				console.log('first card');
			} else if(currentCard.valueOf() === (currentLow.valueOf() - 1)) {
				straight.add(currentCard);
				console.log('found seq');
			} else if(currentCard.valueOf() === currentLow.valueOf()) {
				// skip duplicates
				console.log('skip dupe');
				continue;
			} else {
				console.log('reset');
				// current straight ended and is not of required length. reset.
				straight = new Cards();
				straight.add(currentCard);
			}

			console.log('length', straight.count(), 'target length', length);

			if(straight.count() === length) return straight;
			else if(straight.count() === length - 1) {
				// Determine if ace is low in the straight
				var two = straight.containsValue(Two),
						ace = cards.containsValue(Ace);
				if(two && ace) {
					straight.add(ace);
					return straight;
				}
			}
		}
		return null;
	}

	getReversed() {
		return new Cards(_.reverse(this.cards));
	}

	/**
	Get a new sorted set of cards from high to low.
	**/
	getSorted() {
		return new Cards(_.reverse(_.sortBy(this.cards, 'rank')));
	}

	getRelativeComplement(excluded) {
		const excludedCards = excluded ? excluded.getCards() : [];
		console.log('getRelativeComplement excluded', excluded);
		return new Cards(this.cards.filter(card => !excludedCards.some(excludedCard => card.isSame(excludedCard))));
	}

	getGroupedBySuit() {
		return _.mapValues(_.groupBy(this.cards, card=>card.suit), cards => new Cards(cards));
	}

	getGroupedByValue() {
		return _.mapValues(_.groupBy(this.cards, card=>card.value), cards => new Cards(cards));
	}

	getHighestCard() {
		return this.getSorted().cards[0];
	}

	getHighestCards(count) {
		return this.getSorted().cards.slice(0, count);
	}

	toString() {
		return _.join(_.map(this.cards, card=>card.toString()), ' ');
	}

	containsValue(value) {
		return _.find(this.cards, card => card.isValue(value));
	}

	containsSuit(suit) {
		return _.find(this.cards, card => card.isSuit(suit));
	}

	contains(card) {
		return _.find(this.cards, card => card.isSame(card));
	}

	static isSame(leftCards, rightCards) {
		console.log('isSame', leftCards, rightCards);
		let same = false,
			a = leftCards.getSorted().cards,
			b = rightCards.getSorted().cards;

		if(leftCards.count() !== rightCards.count()) {
			return false;
		}

		return _.some(_.zip(a, b), _.spread((aCard, bCard) => {
			same = aCard.valueOf() - bCard.valueOf();
			return !same;
		}));
	}

	static compare(leftCards, rightCards) {
		let result = 0,
			a = leftCards.getSorted().cards,
			b = rightCards.getSorted().cards;

		_.some(_.zip(a, b), _.spread((aCard, bCard) => {
			result = aCard.valueOf() - bCard.valueOf();
			return result !== 0;
		}));
		return result;
	}

	static createDeck() {
		var cards = new Cards();

		_.forEach(Suits, function(suit) {
			_.forEach(Values, function(value) {
				cards.add(new Card(value, suit));
			});
		});

		cards.shuffle();

		return cards;
	}

}

Cards.SuitName = {
	'♥': 'hearts',
	'♠': 'spades',
	'♣': 'clubs',
	'♦': 'diamonds'
};

Cards.ValueName = {
	'2': 'two',
	'3': 'three',
	'4': 'four',
	'5': 'five',
	'6': 'six',
	'7': 'seven',
	'8': 'eight',
	'9': 'nine',
	'10': 'ten',
	'J': 'jack',
	'Q': 'queen',
	'K': 'king',
	'A': 'ace'
};

class Hand {
	constructor(cards, communityCards) {
		this.cards = cards;
		this.communityCards = communityCards;

		var allCards = cards.getCombined(communityCards),
			handTypes = _.reverse(_.sortBy(_.values(Hand.Type), 'rank'));

		_.some(handTypes, (type, key) => {
			let { hand, kickers } = type.is(allCards);
			if(hand) {
				this.type = type;
				this.hand = hand;
				this.kickers = kickers;
			}
			return hand;
		});
	}

	static compare(leftHand, rightHand) {
		if(leftHand.type.rank === rightHand.type.rank) {
			let handRank = Cards.compare(new Cards(leftHand.hand), new Cards(rightHand.hand));
			if(handRank === 0) {
				let kickerRank = Cards.compare(new Cards(leftHand.kickers), new Cards(rightHand.kickers));
				return kickerRank;
			}
			return handRank;
		}
		return leftHand.type.rank - rightHand.type.rank;
	}
}

Hand.Type = {
	ROYAL_FLUSH: {
		rank: 10,
		name: 'Royal Flush',
		is: function(cards) {
			var royalFlush = _.find(cards.getGroupedBySuit(), function(suitGroup) {
				var straight = suitGroup.getStraight(HAND_SIZE);
				return straight && straight.containsValue(Ace) && straight.containsValue(King);
			});

			return {
				hand: royalFlush ? royalFlush.getCards() : null,
				kickers: null
			};
		}
	},
	STRAIGHT_FLUSH: {
		rank: 9,
		name: 'Straight Flush',
		is: function(cards) {
			var straightFlush = _.find(cards.getGroupedBySuit(), suitGroup=> suitGroup.getStraight(HAND_SIZE));

			return {
				hand: straightFlush ? straightFlush.getCards() : null,
				kickers: null
			};
		}
	},
	FOUR_OF_A_KIND: {
		rank: 8,
		name: 'Four of a Kind',
		is: function(cards) {
			var four = _.find(cards.getGroupedByValue(), valueGroup=> valueGroup.count() === 4);
			return {
				hand: four ? four.getCards() : null,
				kickers: [ cards.getRelativeComplement(four).getHighestCard() ]
			};
		}
	},
	FULL_HOUSE: {
		rank: 7,
		name: 'Full House',
		is: function(cards) {
			var handByValues = cards.getGroupedByValue(),
				triple = _.find(handByValues, valueGroup=> valueGroup.count() === 3), // three of a kind in the full house
				double = _.find(handByValues, valueGroup=> valueGroup.count() === 2); // two pair in the full house

			return {
				hand: triple && double ? [ ...triple.getCards(), ...double.getCards()] : null,
				kickers: null
			};
		}
	},
	FLUSH: {
		rank: 6,
		name: 'Flush',
		is: function(cards) {
			const flush = _.find(cards.getGroupedBySuit(), suitGroup=> suitGroup.count() === HAND_SIZE);
			return {
				hand: flush ? flush.getCards() : null,
				kickers: null
			};
		}
	},
	STRAIGHT: {
		rank: 5,
		name: 'Straight',
		is: function(cards) {
			const straight = cards.getStraight(HAND_SIZE);
			return {
				hand: straight ? straight.getCards() : null,
				kickers: null
			};
		}
	},
	THREE_OF_A_KIND: {
		rank: 4,
		name: 'Three of a Kind',
		is: function(cards) {
			var three = _.find(cards.getGroupedByValue(), valueGroup=> valueGroup.count() === 3);
			return {
				hand: three ? three.getCards() : null,
				kickers: cards.getRelativeComplement(three).getHighestCards(2)
			};
		}
	},
	TWO_PAIR: {
		rank: 3,
		name: 'Two Pair',
		is: function(cards) {
			var pairs = _.filter(cards.getGroupedByValue(), valueGroup=> valueGroup.count() === 2);
			var twoPairs = pairs.length >= 2 ? new Cards([...pairs[0].getCards(), ...pairs[1].getCards()]) : null;

			console.log('two pair', pairs, twoPairs, cards.getRelativeComplement(twoPairs), cards.getRelativeComplement(twoPairs).getHighestCard());

			return {
				hand: twoPairs ? twoPairs.getCards() : null,
				kickers: [ cards.getRelativeComplement(twoPairs).getHighestCard() ]
			};
		}
	},
	PAIR: {
		rank: 2,
		name: 'Pair',
		is: function(cards) {
			var pair = _.find(cards.getGroupedByValue(), valueGroup=> valueGroup.count() === 2);
			console.log('pair', pair, cards.getRelativeComplement(pair), cards.getRelativeComplement(pair).getHighestCards(3));

			return {
				hand: pair ? pair.getCards() : null,
				kickers: cards.getRelativeComplement(pair).getHighestCards(3)
			};
		}
	},
	HIGH_CARD: {
		rank: 1,
		name: 'High Card',
		is: function(cards) {
			return {
				hand: [ cards.getHighestCard() ],
				kickers: cards.getRelativeComplement(new Cards([cards.getHighestCard()])).getHighestCards(4)
			};
		}
	}
};

class Player {
	constructor(name) {
		this.id = cuid();
		this.name = name;

		this.worth = 3000; // temp value
	}

	log() {
		console.log(`${this.name}`);
	}
}

class Action {
	constructor(type, data) {
		this.type = type;
		this.data = data;
	}
}

Action.Type = {

	//Player
	CHECK: 'CHECK',
	BET: 'BET',
	CALL: 'CALL',
	RAISE: 'RAISE',
	FOLD: 'FOLD',
	ALL_IN: 'ALL_IN',
	STARTED: 'STARTED',
	DEAD: 'DEAD',
	JOIN: 'JOIN',
	LEAVE: 'LEAVE',

	// Round
	ROUND_START: 'ROUND_START',
	ROUND_NEXT: 'ROUND_NEXT',
	DEAL: 'DEAL',
	FLOP: 'FLOP',
	TURN: 'TURN',
	RIVER: 'RIVER',
	ROUND_END: 'ROUND_END'
};

class Round {
	constructor(players, rules) {
		if(players.length <= 0) throw new Error('Can\'t start a round with no players');

		this.id = cuid();

		this.communityCards = new Cards();
		this.deck = null;

		this.players = [...players];
		this.button = players[0].id;
		this.actingPlayer = this.getNextPlayer(this.button).id;
		
		this.acted = {}; // TODO: to avoid errors it might be worth basing this on transactional data
		this.actions = {};
		this.bets = {};
		this.cards = {};
		
		this.rules = rules;
		
		this.pots = [];

		this.log = [];

		this.progress = Round.State.STARTING;
		this.record(null, {
			type: 'START'
		});

		this.deal();
		this.preflop();
	}

	nextState() {
		if(this.progress === Round.State.ENDED) {
			return;
		}

		console.log('awaiting action', this.isAwaitingAction());
		
		if(this.players.length <= 1) {
			this.end();
		} else if(this.isAwaitingAction()) {
			this.nextPlayer();
		} else if(this.progress === Round.State.DEALT) {
			this.flop();
		} else if(this.progress === Round.State.FLOPPED) {
			this.turn();
		} else if(this.progress === Round.State.TURNED) {
			this.river();
		} else {
			this.end();
		}
	}

	nextPlayer() {
		if(this.players.length < 2) {
			this.actingPlayer = null;
			this.end();
		} else {
			this.actingPlayer = this.getNextPlayer(this.actingPlayer).id;
		}
	}

	isAwaitingAction() {
		if(this.progress === Round.State.ENDED) {
			return false;
		}

		// All players must have acted since the last raise
		const allActed = this.players.every(player => this.acted[player.id] || this.isPlayerAllIn(player));

		return !this.isBetSizeEqual() || !allActed;
	}

	isBetSizeEqual() {
		const bet = this.getBetSize();
		console.log(bet, 'isBetSizeEqual', this.players.every(player => this.bets[player.id] === bet || this.isPlayerAllIn(player)));
		return this.players.every(player => this.bets[player.id] === bet || this.isPlayerAllIn(player));
	}

	record(player, action) {
		this.log.push({ state: this.progress, player: player, action: action, time: Date.now(), step: this.log.length });
	}

	act(player, action) {
		if(player.id !== this.actingPlayer) {
			throw new Error('Player acted out of turn');
		}

		if(action.type === Action.Type.FOLD) this.fold(player, action);
		else if(action.type === Action.Type.CHECK) this.check(player, action);
		else if(action.type === Action.Type.BET) this.bet(player, action);
		else if(action.type === Action.Type.RAISE) this.raise(player, action);
		else if(action.type === Action.Type.CALL) this.call(player, action);
		else if(action.type === Action.Type.ALL_IN) this.allIn(player, action);
		else throw new Error(`Invalid action ${action.type}`);
		
		if(this.progress !== Round.State.ENDED) {
			this.nextState();
		}
	}

	dead(player) {
		this.record(player, new Action(Action.Type.DEAD));
		this.removePlayer(player);
	}

	fold(player, action) {
		this.record(player, action);
		this.actions[player.id] = Action.Type.FOLD;
		this.dead(player);

		if(this.players.length < 2) {
			this.end();
		}
	}

	check(player, action) {
		if(this.bets[player.id] !== this.getBetSize()) throw new Error('Check can only be called if the player bet is the same as the highest bet.');
		this.record(player, action);
		this.acted[player.id] = true;
		this.actions[player.id] = Action.Type.CHECK;
	}

	bet(player, action) {
		if(action.data.value <= 0) throw new Error('A bet > 0 was expected');
		if(this.getBetSize()) throw new Error('Can\'t bet after a bet. Call or raise was expected.');
		this.record(player, action);
		console.log(this.log, player, action);
		this.acted[player.id] = true;
		this.actions[player.id] = Action.Type.BET;
		this.bets[player.id] = action.data.value;
	}

	raise(player, action) {
		if(action.data.value <= this.getBetSize()) throw new Error('A raise larger than the current bet was expected.');
		this.record(player, action);
		this.acted = {};
		this.acted[player.id] = true;
		this.actions[player.id] = Action.Type.RAISE;
		this.bets[player.id] = action.data.value;
	}

	call(player, action) {
		if(action.data.value !== this.getBetSize()) throw new Error('A call must be the size of the current bet.');
		this.record(player, action);
		this.acted[player.id] = true;
		this.actions[player.id] = Action.Type.CALL;
		this.bets[player.id] = action.data.value;
	}

	allIn(player, action) {
		if(action.data.value !== player.worth) throw new Error('All in must be of the size of the player worth');// fix this, depend on size of other all ins
		this.record(player, action);
		this.acted[player.id] = true;
		this.actions[player.id] = Action.Type.ALL_IN;
		this.bets[player.id] = action.data.value;
	}

	deal() {
		if(this.progress !== Round.State.STARTING) throw new Error(`Expected ${Round.State.STARTING} instead of ${this.progress}`);

		this.deck = Cards.createDeck();
		this.deck.shuffle();
		this.acted = {};

		this.cards = {};
		this.players.forEach(player => this.cards[player.id] = new Cards());
		for(var i = 0; i < DEAL_SIZE; i++) {
			this.players.forEach(player => this.cards[player.id].add(this.deck.draw()));
		}

		this.progress = Round.State.DEALT;
		this.record(null, {
			type: Action.Type.DEAL
		});
	}

	preflop() {
		if(this.rules && this.rules.blinds) {
			this.rules.blinds.forEach((blind, index) => {
				if(index === 0) {
					this.bet(this.getActingPlayer(), {
						type: Action.Type.BET,
						data: {
							reason: 'Blind',
							value: blind.value
						}
					});
				} else {
					this.raise(this.getActingPlayer(), {
						type: Action.Type.RAISE,
						data: {
							reason: 'Blind',
							value: blind.value
						}
					});
				}
				this.nextPlayer();
			});
		}
	}

	flop() {
		if(this.progress !== Round.State.DEALT) throw new Error(`Expected ${Round.State.DEALT} instead of ${this.progress}`);

		this.communityCards.add(this.deck.draw());
		this.communityCards.add(this.deck.draw());
		this.communityCards.add(this.deck.draw());

		this.actingPlayer = this.getNextPlayer(this.button).id;
		this.acted = {};

		this.progress = Round.State.FLOPPED;
		this.record(null, {
			type: Action.Type.FLOP
		});
	}

	turn() {
		if(this.progress !== Round.State.FLOPPED) throw new Error(`Expected ${Round.State.FLOPPED} instead of ${this.progress}`);

		this.communityCards.add(this.deck.draw());

		this.actingPlayer = this.getNextPlayer(this.button).id;
		this.acted = {};

		this.progress = Round.State.TURNED;
		this.record(null, {
			type: Action.Type.TURN
		});
	}

	river() {
		if(this.progress !== Round.State.TURNED) throw new Error(`Expected ${Round.State.TURNED} instead of ${this.progress}`);

		this.communityCards.add(this.deck.draw());

		this.actingPlayer = this.getNextPlayer(this.button).id;
		this.acted = {};

		this.progress = Round.State.RIVERED;
		this.record(null, {
			type: Action.Type.RIVER
		});
	}

	end() {
		if(this.progress === Round.State.ENDED) {
			return;
		}
		this.actingPlayer = null;
		this.results = this.rankPlayers();

		this.progress = Round.State.ENDED;

		this.record(null, {
			type: Action.Type.ROUND_END
		});
	}

	hasEnded() {
		return this.progress === Round.State.ENDED;
	}

	getFlopCards() {
		if(this.progress !== Round.State.FLOPPED) throw new Error(`Expected ${Round.State.FLOPPED} instead of ${this.progress}`);
		return [this.communityCards[0], this.communityCards[1], this.communityCards[2]];
	}

	getTurnCard() {
		if(this.progress !== Round.State.TURNED) throw new Error(`Expected ${Round.State.TURNED} instead of ${this.progress}`);
		return this.communityCards[3];
	}

	getRiverCard() {
		if(this.progress !== Round.State.RIVERED) throw new Error(`Expected ${Round.State.RIVERED} instead of ${this.progress}`);
		return this.communityCards[4];
	}

	getPots() {
		// TODO: handle side pots
		return [{
			total: this.getPotSize(),
			participants: this.rankPlayers()
		}];
	}

	getWinners() {
		if(this.players.length === 0) return null;
		var ranked = this.rankPlayers(),
			winner = ranked[0], // we know this is a winner
			winners = _.filter(ranked, rank => Hand.compare(winner.hand, rank.hand) === 0); // find all winners

		return winners;
	}

	getBetSize() {
		const betValues = Object.values(this.bets);
		if(!betValues.length) return 0;
		return Math.max(...betValues);
	}

	getPotSize() {
		return Object.values(this.bets).reduce((result, bet) => result + bet, 0);
	}

	getPlayer(id) {
		return this.players.find(player => player.id === id);
	}

	getNextPlayer(id) {
		const currentIndex = this.players.findIndex(player => player.id === id);
		console.log('getNextPlayer current', currentIndex);
		if(currentIndex < 0) throw new Error('Could not find player with id ' + id);
		const nextIndex = (currentIndex + 1) >= this.players.length ? 0 : currentIndex + 1;
		console.log('getNextPlayer next', nextIndex);
		return this.players[nextIndex];
	}

	getActingPlayer() {
		if(!this.actingPlayer) return null;
		return this.getPlayer(this.actingPlayer);
	}

	isPlayerAllIn(player) {
		return this.bets[player.id] === player.worth;
	}

	rankPlayers() {
		const players = this.players.map(player => ({
			id: player.id,
			hand: new Hand(this.cards[player.id], this.communityCards)
		})).sort((left, right) => Hand.compare(left.hand, right.hand)).reverse();

		let previousPlayer = null;
		players.forEach(player => {
			if(!previousPlayer) {
				player.rank = 1;
			} else if(Hand.compare(player.hand, previousPlayer.hand) === 0) {
				player.rank = previousPlayer.rank;
			} else {
				player.rank = previousPlayer.rank + 1;
			}
			previousPlayer = player;
		});

		return players;
	}

	removePlayer(player) {
		if(this.actingPlayer === player.id) {
			this.nextPlayer();
		}
		_.remove(this.players, p => p.id === player.id);
	}

}

Round.State = {
	STARTING: 'STARTING',
	DEALT: 'DEALT',
	FLOPPED: 'FLOPPED',
	TURNED: 'TURNED',
	RIVERED: 'RIVERED',
	ENDING: 'ENDING',
};

class Table {
	constructor(name) {
		this.id = cuid();
		this.name = name;
		this.players = [];
		this.round = null;

		// Rules
		this.ante = 10;
		this.blinds = [{
			name: 'Small blind',
			value: 20
		}, {
			name: 'Big blind',
			value: 40
		}];
	}

	act(playerId, action) {
		if(!playerId && action.type === Action.Type.ROUND_START) this.startRound();
		if(!playerId && action.type === Action.Type.ROUND_NEXT) this.nextRound();
		else if(!playerId && action.type === Action.Type.ROUND_END) this.endRound();
		else {
			const player = this.round.getPlayer(playerId);
			if(!this.round) throw new Error('No round currently active');
			this.round.act(player, action);
		}
	}

	tick() {
		if(!this.round) return;


	}

	startRound() {
		this.round = new Round(this.players, {
			ante: this.ante,
			blinds: this.blinds
		});
	}

	nextRound() {
		const lastPlayer = this.players.shift();
		this.players.push(lastPlayer);
		this.round = new Round(this.players, {
			ante: this.ante,
			blinds: this.blinds
		});
	}

	endRound() {
		this.round.end();
	}

	isRoundComplete() {
		if(!this.round) return true;
		return this.round.hasEnded();
	}

	getRoundWinners() {
		return this.round.getWinners();
	}

	completeRound() {

	}

	join(player) {
		if(this.players.length >= MAX_PLAYERS) throw new Error('Player can\'t join. The table is full');
		this.players.push(player);
	}

	leave(player) {
		var removed = _.remove(this.players, p => player.id === p.id);
		if(removed.length < 1) throw new Error('Could not find the player to remove');
		else if(removed.length > 1) throw new Error('Found more than one of the player to remove');
	}

	getActingPlayer() {
		if(this.round) return this.round.getActingPlayer();
		return null;
	}

	log() {
		_.each(this.players, player=>player.log());
		if(this.round) console.log(`Table: ${this.round.communityCards.getSorted().toString()}`);
	}

	logRanked() {
		console.log('--Ranked');
		var ranked = this.round.rankPlayers();
		_.each(ranked, rank => {
			console.log(`${rank.player.name} (${rank.hand.type.name})`);
		});
	}

	logWinners() {
		console.log('--Winners');
		var winners = this.getRoundWinners();
		_.each(winners, rank => {
			console.log(`${rank.player.name} (${rank.hand.type.name} ${new Cards(rank.hand.hand).toString()})`);
		});
	}
}

class Casino {
	constructor(name) {
		this.name = name;
		this.tables = [];
		this.players = [];

	}

	createTable(name) {
		const table = new Table(name);
		this.tables.push(table);
		return table;
	}

	createPlayer(name) {
		const player = new Player(name);
		this.players.push(player);
		return player;
	}
}

module.exports = {
	Values,
	Suits,
	Card,
	Cards,
	Hand,
	Action,
	Player,
	Round,
	Table
};
