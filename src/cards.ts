const _ = require('lodash');
const colors = require('colors');

function isString(myVar:any) {
	return (typeof myVar === 'string' || myVar instanceof String);
}

export function groupBy<T, K extends keyof T>(array: T[], key: K) {
	let map = new Map<T[K], T[]>();
	array.forEach(item => {
		let itemKey = item[key];
		if (!map.has(itemKey)) {
			map.set(itemKey, array.filter(i => i[key] === item[key]));
		}
	});
	return map;
}

export const Suits = ['♥','♠','♣','♦'];
export const Values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const Suit = {
    Heart: '♥',
    Spade: '♠',
    Club: '♣',
    Diamond: '♦'
};

export const Value = {
    Two: '2',
    Three: '3',
    Four: '4',
    Five: '5',
    Six: '6',
    Seven: '7',
    Eight: '8',
    Nine: '9',
    Ten: '10',
    Jack: 'J',
    Queen: 'Q',
    King: 'K',
    Ace: 'A'
};

export const SuitName = {
	'♥': 'hearts',
	'♠': 'spades',
	'♣': 'clubs',
	'♦': 'diamonds'
};

export const ValueName = {
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

export class Card {
	value: string;
	suit: string;
	rank: number;

	constructor(value?:string, suit?:string) {
		if(!value) {
			this.suit = '';
			this.value = '';
			this.rank = 0;
			return;
		}
		if(isString(value) && !suit) {
			this.suit = value.length === 2 ? value[1] : value[2];
			this.value = value.length === 2 ? value[0] : value[0] + value[1];
		} else {
			this.suit = suit || '';
			this.value = value;
		}
		this.rank = Values.findIndex(v => v === this.value);
	}

	static toString(card : Card) {
		const string = `${card.value}${card.suit}`;
		if(card.isRed()) return colors.red.bgWhite(string);
		return colors.black.bgWhite(string);
	}

	toString() {
		return Card.toString(this);
	}

	log() {
		console.log(`${this.value} of ${this.suit}`);
	}

	valueOf() {
		return this.rank;
	}

	isSame(card:Card) {
		if(!card.value || !card.suit || !this.suit || !this.value) throw new Error('Invalid card passed for isSame comparison.');
		return this.value === card.value && this.suit === card.suit;
	}

	isSuit(suit:string) {
		return suit === this.suit;
	}

	isValue(value:string) {
		return value === this.value;
	}

	isRed() {
		return this.isSuit(Suit.Heart) || this.isSuit(Suit.Diamond);
	}

	isBlack() {
		return this.isSuit(Suit.Spade) || this.isSuit(Suit.Club);
	}
}

Card.prototype.toString = function() {
	return Card.toString(this);
}

export class Cards {
	cards: Card[]

	constructor(cards?: Card[] | string | null | undefined) {
		if(cards && isString(cards)) {
			this.cards = String(cards).split(' ').map(card => new Card(card));
		} else if(cards && Array.isArray(cards)) {
			this.cards = cards ? cards : [];
		} else {
			this.cards = [];
		}
	}

	add(card:Card) {
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

	getCard(index:number) {
		return this.cards[index];
	}

	getCards() {
		return this.cards;
	}

	getCombined(other:Cards) {
		return new Cards(_.concat(this.cards, other.cards));
	}

	getStraight(length:number) {
		var cards = this.getSorted(),
			straight = new Cards();

		for(var i = 0; i < cards.count(); i++) {
			var currentCard = cards.getCard(i),
			currentLow = straight.count() > 0 ? _.last(straight.cards) : null;

			if(!currentLow) {
				// first card
				straight.add(currentCard);
			} else if(currentCard.valueOf() === (currentLow.valueOf() - 1)) {
				straight.add(currentCard);
			} else if(currentCard.valueOf() === currentLow.valueOf()) {
				// skip duplicates
				continue;
			} else {
				// current straight ended and is not of required length. reset.
				straight = new Cards();
				straight.add(currentCard);
			}

			if(straight.count() === length) return straight;
			else if(straight.count() === length - 1) {
				// Determine if ace is low in the straight
				var two = straight.containsValue(Value.Two),
						ace = cards.containsValue(Value.Ace);
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

	getRelativeComplement(excluded: Cards | null | undefined) {
		const excludedCards = excluded ? excluded.getCards() : [];
		return new Cards(this.cards.filter(card => !excludedCards.some(excludedCard => card.isSame(excludedCard))));
	}

	getGroupedBySuit() : Cards[] {
		return Array.from(groupBy(this.cards, 'suit').values()).map(group => new Cards(group));
	}

	getGroupedByValue() : Cards[] {
		return Array.from(groupBy(this.cards, 'value').values()).map(group => new Cards(group));
	}

	getHighestCard() {
		return this.getSorted().cards[0];
	}

	getHighestCards(count:number) {
		return this.getSorted().cards.slice(0, count);
	}

	toString() {
		return this.cards.map(card => card.toString()).join(' ');
	}

	containsValue(value:string) {
		return this.cards.find(card => card.isValue(value));
	}

	containsSuit(suit:string) {
		return this.cards.find(card => card.isSuit(suit));
	}

	contains(card:Card) {
		return this.cards.find(card => card.isSame(card));
	}

	static isSame(leftCards:Cards, rightCards:Cards) {
		let same = false,
			a = leftCards.getSorted().cards,
			b = rightCards.getSorted().cards;

		if(leftCards.count() !== rightCards.count()) {
			return false;
		}

		return _.some(_.zip(a, b), _.spread((aCard:Card, bCard:Card) => {
			same = !!(aCard.valueOf() - bCard.valueOf());
			return !same;
		}));
	}

	static compare(leftCards:Cards, rightCards:Cards) {
		let result = 0,
			a = leftCards.getSorted().cards,
			b = rightCards.getSorted().cards;

		_.some(_.zip(a, b), _.spread((aCard:Card, bCard:Card) => {
			result = aCard.valueOf() - bCard.valueOf();
			return result !== 0;
		}));
		return result;
	}

	static createDeck() {
		var cards = new Cards();

		_.forEach(Suits, function(suit:string) {
			_.forEach(Values, function(value:string) {
				cards.add(new Card(value, suit));
			});
		});

		cards.shuffle();

		return cards;
	}

	static createDeckUnkownCards(length:number) {
		let cards = new Cards();
		for(let i = 0; i < length; i++) {
			cards.add(new Card());
		}
		return cards;
	}

}

