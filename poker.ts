import { Card, Suits, Values, Suit, Value, Cards, SuitName, ValueName } from './cards';
const _ = require('lodash');
const cuid = require('cuid');
const colors = require('colors');

const DEAL_SIZE = 2;
const HAND_SIZE = 5;
const ACTION_TIME_LIMIT = 1000;
const MAX_PLAYERS = 8;

type PlayerId = string;

const sortByProperty = <T>(getTextProperty: (object: T) => number) => (objectA: T, objectB: T) => {
    const propA = getTextProperty(objectA);
    const propB = getTextProperty(objectB);
    if (propA < propB) {
        return -1;
    }
    if (propA > propB) {
        return 1;
    }
    return 0;
};

interface HandIsResult {
	hand: Card[] | null;
	kickers: Card[] | null;
}

interface HandType {
	rank: number;
	name: string;
	is: (cards: Cards) => HandIsResult
}

class Hand {
	cards: Cards
	communityCards: Cards
	type: HandType | null
	hand: Card[] | null
	kickers: Card[] | null

	static Type: Record<string, HandType>

	constructor(cards: Cards, communityCards: Cards) {
		this.cards = cards;
		this.communityCards = communityCards;
		this.type = null;
		this.hand = null;
		this.kickers = null;

		var allCards = cards.getCombined(communityCards),
			handTypes = Object.values(Hand.Type).sort(sortByProperty(type => type.rank)).reverse();

		handTypes.some(type => {
			let { hand, kickers } = type.is(allCards);
			if(hand) {
				this.type = type;
				this.hand = hand;
				this.kickers = kickers;
			}
			return hand;
		});
	}

	getRank() {
		return this.type?.rank || -1;
	}

	static compare(leftHand: Hand, rightHand: Hand) {
		if(leftHand.type?.rank === rightHand.type?.rank) {
			let handRank = Cards.compare(new Cards(leftHand.hand), new Cards(rightHand.hand));
			if(handRank === 0) {
				let kickerRank = Cards.compare(new Cards(leftHand.kickers), new Cards(rightHand.kickers));
				return kickerRank;
			}
			return handRank;
		}
		return leftHand.getRank() - rightHand.getRank();
	}
}

Hand.Type = {
	ROYAL_FLUSH: {
		rank: 10,
		name: 'Royal Flush',
		is: function(cards) {
			var royalFlush = cards.getGroupedBySuit().find(suitGroup => {
				var straight = suitGroup.getStraight(HAND_SIZE);
				return straight && straight.containsValue(Value.Ace) && straight.containsValue(Value.King);
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
			var straightFlush = cards.getGroupedBySuit().find(suitGroup => suitGroup.getStraight(HAND_SIZE));

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
			var four = cards.getGroupedByValue().find(valueGroup => valueGroup.count() === 4);

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
				triple = handByValues.find(valueGroup => valueGroup.count() === 3), // three of a kind in the full house
				double = handByValues.find(valueGroup => valueGroup.count() === 2); // two pair in the full house

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
			const flush = cards.getGroupedBySuit().find(suitGroup => suitGroup.count() === HAND_SIZE);
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
			var three = cards.getGroupedByValue().find(valueGroup => valueGroup.count() === 3);
			return {
				hand: three ? three.getSorted().getCards() : null,
				kickers: cards.getRelativeComplement(three).getHighestCards(2)
			};
		}
	},
	TWO_PAIR: {
		rank: 3,
		name: 'Two Pair',
		is: function(cards) {
			var pairs = cards.getGroupedByValue().filter(valueGroup => valueGroup.count() === 2);
			var twoPairs = pairs.length >= 2 ? new Cards([...pairs[0].getCards(), ...pairs[1].getCards()]) : null;

			return {
				hand: twoPairs ? twoPairs.getSorted().getCards() : null,
				kickers: [ cards.getRelativeComplement(twoPairs).getHighestCard() ]
			};
		}
	},
	PAIR: {
		rank: 2,
		name: 'Pair',
		is: function(cards) {
			var pair = cards.getGroupedByValue().find(valueGroup => valueGroup.count() === 2);

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
	id: string
	name: string
	worth: number

	constructor(name: string) {
		this.id = cuid();
		this.name = name;

		this.worth = 3000; // temp value
	}

	log() {
		console.log(`${this.name}`);
	}
}

interface ActionData {
	value?: number | null | undefined
	source?: string
}

class Action {
	type: string
	data: ActionData | null | undefined

	static Type: Record<string, string>

	constructor(type:string, data?:ActionData) {
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

interface RuleBlind {
	value: number
	name: string
}

interface Rules {
	ante: number;
	blinds: RuleBlind[]
}

interface Pot {

}

interface LogItem {
	state: RoundState
	player: Player | null
	action: Action
	time: string
	step: number
}

interface PlayerResult {
	id: string
	hand: Hand
	rank?: number
}

type RoundState = string;

class Round {
	id: string
	communityCards: Cards
	deck: Cards
	players: Player[]
	button: PlayerId | null
	actingPlayer: PlayerId | null
	acted: Record<PlayerId, boolean>
	actions: Record<PlayerId, string>
	bets: Record<PlayerId, number>
	cards: Record<PlayerId, Cards>
	rules: Rules
	pots: Array<Pot>
	log: Array<LogItem>
	progress: RoundState
	results: PlayerResult[] | null

	static State: Record<string, RoundState>

	constructor(players: Player[], rules: Rules) {
		if(players.length <= 0) throw new Error('Can\'t start a round with no players');

		this.id = cuid();

		this.communityCards = new Cards();
		this.deck = new Cards();

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

		this.results = null;

		this.progress = Round.State.STARTING;
		this.record(null, new Action(Action.Type.STARTED));

		this.deal();
		this.preflop();
	}

	nextState() {
		if(this.progress === Round.State.ENDED) {
			return;
		}
		
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
		return this.players.every(player => this.bets[player.id] === bet || this.isPlayerAllIn(player));
	}

	record(player: Player | null, action: Action) {
		const time = (new Date()).toISOString();
		this.log.push({ state: this.progress, player: player, action: action, time: time, step: this.log.length });
		console.log(`${colors.magenta(time)}: ${ player ? `${player.name}` : `dealer`} ${colors.green.bold(action.type)} (${this.communityCards.count() ? `table: ${this.communityCards.toString()}, ` : ''}players: ${this.players.map(player => `${player.name} ${this.cards[player.id]?.toString()}`).join(', ')}${colors.bgBlack.white(`)`)}`);
	}

	act(player: Player, action: Action) {
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

	dead(player: Player) {
		this.record(player, new Action(Action.Type.DEAD));
		this.removePlayer(player);
	}

	fold(player: Player, action: Action) {
		this.record(player, action);
		this.actions[player.id] = Action.Type.FOLD;
		this.dead(player);

		if(this.players.length < 2) {
			this.end();
		}
	}

	check(player: Player, action: Action) {
		if(this.bets[player.id] !== this.getBetSize()) throw new Error('Check can only be called if the player bet is the same as the highest bet.');
		this.record(player, action);
		this.acted[player.id] = true;
		this.actions[player.id] = Action.Type.CHECK;
	}

	bet(player: Player, action: Action) {
		if(!action || !action.data || !action.data.value || action.data.value <= 0) throw new Error('A bet > 0 was expected');
		if(this.getBetSize()) throw new Error('Can\'t bet after a bet. Call or raise was expected.');
		this.record(player, action);
		this.acted[player.id] = true;
		this.actions[player.id] = Action.Type.BET;
		this.bets[player.id] = action.data?.value;
	}

	raise(player: Player, action: Action) {
		if(!action || !action.data || !action.data.value || action.data.value <= this.getBetSize()) throw new Error('A raise larger than the current bet was expected.');
		this.record(player, action);
		this.acted = {};
		this.acted[player.id] = true;
		this.actions[player.id] = Action.Type.RAISE;
		this.bets[player.id] = action.data.value;
	}

	call(player: Player, action: Action) {
		if(!action || !action.data || !action.data.value || action.data.value !== this.getBetSize()) throw new Error('A call must be the size of the current bet.');
		this.record(player, action);
		this.acted[player.id] = true;
		this.actions[player.id] = Action.Type.CALL;
		this.bets[player.id] = action.data.value;
	}

	allIn(player: Player, action: Action) {
		if(!action || !action.data || !action.data.value || action.data.value !== player.worth) throw new Error('All in must be of the size of the player worth');// fix this, depend on size of other all ins
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
			this.players.forEach(player => {
				const drawnCard = this.deck.draw();
				if(drawnCard) {
					this.cards[player.id].add(drawnCard);
				} else {
					throw new Error('Failed to draw a card from the deck while dealing');
				}
			});
		}

		this.progress = Round.State.DEALT;
		this.record(null, new Action(Action.Type.DEAL));
	}

	preflop() {
		if(this.rules && this.rules.blinds) {
			this.rules.blinds.forEach((blind, index) => {
				const actingPlayer = this.getActingPlayer();
				if(!actingPlayer) {
					throw new Error('Failed to get acting player on the preflop');
				} else if(index === 0) {
					this.bet(actingPlayer, {
						type: Action.Type.BET,
						data: {
							source: 'Blind',
							value: blind.value
						}
					});
				} else {
					this.raise(actingPlayer, {
						type: Action.Type.RAISE,
						data: {
							source: 'Blind',
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

		for(let i = 0; i < 3; i++) {
			const drawnCard = this.deck.draw();
			if(drawnCard) {
				this.communityCards.add(drawnCard);
			} else {
				throw new Error(`Failed to draw card ${i + 1} of 3 on flop`);
			}
		}

		this.actingPlayer = this.getNextPlayer(this.button).id;
		this.acted = {};

		this.progress = Round.State.FLOPPED;
		this.record(null, new Action(Action.Type.FLOP));
	}

	turn() {
		if(this.progress !== Round.State.FLOPPED) throw new Error(`Expected ${Round.State.FLOPPED} instead of ${this.progress}`);

		const drawnCard = this.deck.draw();
		if(drawnCard) {
			this.communityCards.add(drawnCard);
		} else {
			throw new Error('Failed to draw card on turn.');
		}

		this.actingPlayer = this.getNextPlayer(this.button).id;
		this.acted = {};

		this.progress = Round.State.TURNED;
		this.record(null, new Action(Action.Type.TURN));
	}

	river() {
		if(this.progress !== Round.State.TURNED) throw new Error(`Expected ${Round.State.TURNED} instead of ${this.progress}`);

		const drawnCard = this.deck.draw();
		if(drawnCard) {
			this.communityCards.add(drawnCard);
		} else {
			throw new Error('Failed to draw card on river.');
		}

		this.actingPlayer = this.getNextPlayer(this.button).id;
		this.acted = {};

		this.progress = Round.State.RIVERED;
		this.record(null, new Action(Action.Type.RIVER));
	}

	end() {
		if(this.progress === Round.State.ENDED) {
			return;
		}
		this.actingPlayer = null;
		this.results = this.rankPlayers();

		this.progress = Round.State.ENDED;

		this.record(null, new Action(Action.Type.ROUND_END));
	}

	hasEnded() {
		return this.progress === Round.State.ENDED;
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
			winners = ranked.filter(rank => Hand.compare(winner.hand, rank.hand) === 0); // find all winners

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

	getPlayer(id: PlayerId) {
		return this.players.find(player => player.id === id);
	}

	getNextPlayer(id: PlayerId | null) {
		if(!id) {
			throw new Error('Failed to get next player. Player id provided was null.');
		}
		const currentIndex = this.players.findIndex(player => player.id === id);
		if(currentIndex < 0) throw new Error('Could not find player with id ' + id);
		const nextIndex = (currentIndex + 1) >= this.players.length ? 0 : currentIndex + 1;
		return this.players[nextIndex];
	}

	getActingPlayer() {
		if(!this.actingPlayer) return null;
		return this.getPlayer(this.actingPlayer);
	}

	isPlayerAllIn(player: Player) {
		return this.bets[player.id] === player.worth;
	}

	rankPlayers() : PlayerResult[] {
		const players : PlayerResult[] = this.players.map(player => ({
			id: player.id,
			hand: new Hand(this.cards[player.id], this.communityCards)
		})).sort((left, right) => Hand.compare(left.hand, right.hand)).reverse();

		let previousPlayer: PlayerResult | null = null;
		players.forEach(player => {
			if(!previousPlayer) {
				player.rank = 1;
			} else if(Hand.compare(player.hand, previousPlayer.hand) === 0) {
				player.rank = previousPlayer.rank;
			} else {
				player.rank = previousPlayer.rank ? previousPlayer.rank + 1 : 1;
			}
			previousPlayer = player;
		});

		return players;
	}

	removePlayer(player : Player) {
		if(this.actingPlayer === player.id) {
			this.nextPlayer();
		}
		this.players = this.players.filter(p => p.id !== player.id);
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
	id: string
	name: string
	players: Player[]
	round: Round | null
	rules: Rules

	constructor(name: string) {
		this.id = cuid();
		this.name = name;
		this.players = [];
		this.round = null;

		this.rules = {
			ante: 10,
			blinds: [{
				name: 'Small blind',
				value: 20
			}, {
				name: 'Big blind',
				value: 40
			}]
		};
	}

	act(playerId: PlayerId, action: Action) {
		if(!playerId && action.type === Action.Type.ROUND_START) this.startRound();
		if(!playerId && action.type === Action.Type.ROUND_NEXT) this.nextRound();
		else if(!playerId && action.type === Action.Type.ROUND_END) this.endRound();
		else {
			if(!this.round) throw new Error('No round currently active');
			const player = this.round.getPlayer(playerId);
			if(!player) throw new Error(`Player with id ${playerId} could not be found while attempting to act.`);
			this.round.act(player, action);
		}
	}

	tick() {
		if(!this.round) return;


	}

	startRound() {
		this.round = new Round(this.players, this.rules);
	}

	nextRound() {
		const lastPlayer = this.players.shift();
		if(!lastPlayer) throw new Error('Failed to shift player order while proceeding to next round.');
		this.players.push(lastPlayer);
		this.round = new Round(this.players, this.rules);
	}

	endRound() {
		if(!this.round) throw new Error('Attempted to end a round but no round exists.');
		this.round.end();
	}

	isRoundComplete() {
		if(!this.round) return true;
		return this.round.hasEnded();
	}

	getRoundWinners() {
		if(!this.round) throw new Error('Attempted to get round winners but no round exists.');
		return this.round.getWinners();
	}

	completeRound() {

	}

	join(player: Player) {
		if(this.players.length >= MAX_PLAYERS) throw new Error('Player can\'t join. The table is full');
		this.players.push(player);
	}

	leave(player: Player) {
		var removed = _.remove(this.players, (p: Player) => player.id === p.id);
		if(removed.length < 1) throw new Error('Could not find the player to remove');
		else if(removed.length > 1) throw new Error('Found more than one of the player to remove');
	}

	getActingPlayer() {
		if(this.round) return this.round.getActingPlayer();
		return null;
	}

	log() {
		this.players.forEach(player => player.log());
		if(this.round) console.log(`Table: ${this.round.communityCards.getSorted().toString()}`);
	}

	logRanked() {
		if(!this.round) throw new Error('Attempted to log ranked players but no round exists.');
		console.log('--Ranked');
		var ranked = this.round.rankPlayers();
		ranked.forEach(rank => {
			console.log(`${rank.id} is rank ${rank.rank}`);
		});
	}

	logWinners() {
		console.log('--Winners');
		var winners = this.getRoundWinners();
		(winners || []).forEach(rank => {
			console.log(`${rank.id} (${rank.hand?.type?.name} ${new Cards(rank.hand.hand).toString()})`);
		});
	}
}

class Casino {
	name: string
	tables: Table[]
	players: Player[]

	constructor(name: string) {
		this.name = name;
		this.tables = [];
		this.players = [];

	}

	createTable(name: string) {
		const table = new Table(name);
		this.tables.push(table);
		return table;
	}

	createPlayer(name: string) {
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
	Table,
	SuitName,
	ValueName
};
