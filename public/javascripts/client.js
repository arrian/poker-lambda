// const { table } = require("console");

const { createApp } = Vue;

const ConnectionStatus = {
    Unknown: 'Unknown',
    Disconnected: 'Disconnected',
    Connecting: 'Connecting',
    Connected: 'Connected'
};

const ActionText = {
	CHECK: 'Check',
	BET: 'Bet',
	CALL: 'Call',
	RAISE: 'Raise',
	FOLD: 'Fold',
	ALL_IN: 'All In'
};

createApp({
    data() {
        return {
            table: null,
            tableString: null,
            message: 'Hello Vue!',
            input: 0,
            inputs: {},
            showDebug: false,
            positions: { // to keep table asthetically balanced
                1: [{ col: '2 / span 2', row: 3 }],
                2: [{ col: '3 / span 2', row: 3 }, { col: '1 / span 2', row: 3 }],
                3: [{ col: 4, row: 2 }, { col: '2 / span 2', row: 3 }, { col: 1, row: 2 }],
                4: [{ col: 4, row: 2 }, { col: 3, row: 3 }, { col: 2, row: 3 }, { col: 1, row: 2 }],
                5: [{ col: 4, row: 1 }, { col: 4, row: 3 }, { col: '2 / span 2', row: 3 }, { col: 1, row: 3 }, { col: 1, row: 1 }],
                6: [{ col: 4, row: 1 }, { col: 4, row: 2 }, { col: '3 / span 2', row: 3 }, { col: '1 / span 2', row: 3 }, { col: 1, row: 2 }, { col: 1, row: 1 }],
                7: [{ col: 4, row: 1 }, { col: 4, row: 2 }, { col: 4, row: 3 }, { col: '2 / span 2', row: 3 }, { col: 1, row: 3 }, { col: 1, row: 2 }, { col: 1, row: 1 }],
                8: [{ col: 4, row: 1 }, { col: 4, row: 2 }, { col: 4, row: 3 }, { col: 3, row: 3 }, { col: 2, row: 3 }, { col: 1, row: 3 }, { col: 1, row: 2 }, { col: 1, row: 1 }]
            },
            connection: ConnectionStatus.Unknown,
            ConnectionStatus,
            ActionText,
            showCard: {
                communityCards: [false, false, false, false, false],
                playerCards: [false, false]
            }
        }
    },
    async mounted() {
        this.socket = io();
        this.socket.on('connect', () => {
            this.connection = ConnectionStatus.Connected;
            console.log('connected');
        });
        this.socket.on('disconnect', () => {
            this.connection = ConnectionStatus.Disconnected;
        });
        this.socket.on('status', table => {
            console.log('status', table);
            this.onUpdate(table);
        });
    },
    computed: {
        actingPlayer() {
            return this.table.players.find(player => player.id === this.table.round?.actingPlayer);
        },

        communityCards() {
            const cards = this.table?.round?.communityCards?.cards || [];
            return [...cards, ...Array(5 - cards.length).fill(null)];
        },

        results() {
            // return this.table.results.map(result => ({
            //     players: {
            //         ...result.
            //     }
            // }));
        }
    },
    methods: {
        async load() {
            const result = await fetch('/status?player=3').then(response => response.json());
            this.onUpdate(result);
            return result;
        },
        onUpdate(table) {
            console.log('onUpdate', table);
            this.table = table;
            this.tableString = JSON.stringify(table, null, 4);
            this.input = Math.min(table.round?.betSize + table.round?.betIncrement || 0, table.player?.worth - 1);
            this.inputs = {};
            this.table.players.forEach(player => this.inputs[player.id] = table.round?.betSize || 0);

            if(this.isAwaitingCommunityCardTransition()) {
                this.startCommunityCardTransition();
            }
        },
        isAwaitingCommunityCardTransition() {
            return this.showCard.communityCards.filter(show => show).length !== this.table?.round?.communityCards?.cards.length;
        },
        flipNextCommunityCard() {
            const index = this.showCard.communityCards.indexOf(false);
            if(index >= 0) this.showCard.communityCards[index] = true;
        },
        startCommunityCardTransition() {
            setTimeout(() => {
                this.flipNextCommunityCard();
                if(this.isAwaitingCommunityCardTransition()) this.startCommunityCardTransition();
            }, 1000);
        },
        cardUrl(card) {
            if(!card || !card.value || !card.suit) return 'background: none';
            const value = this.table.ValueName[card.value];
            const suit = this.table.SuitName[card.suit];
            return `background-image: url('https://raw.githubusercontent.com/arrian/cards-svg/master/svg/${value}-${suit}.svg')`;
        },
        cardBackground(card) {
            if(!card.value || !card.suit) return 'background: none';
            return '';
        },
        cardOverlap(index) {
            return `grid-area: 1 / ${index + 1} / span 1 / span 5`;
        },
        playerGridStyle(index, player) {
            const playerCount = this.table?.players?.length || 0;
            if(!playerCount) {
                return '';
            }
            const position = this.positions[playerCount][index];
            return `grid-column: ${position.col}; grid-row: ${position.row}; opacity: ${this.table.round?.playersData[player.id]?.action === 'FOLD' || player.left ? 0.5 : 1 }`;
        },
        playerStyle(player) {
            return `opacity: ${this.table.round?.playersData[player.id]?.action === 'FOLD' ? 0.5 : 1 }; outline: ${this.actingPlayer?.id === player.id ? '5px solid white' : 'none' };`;
        },
        getPlayer(id) {
            return this.table.players.find(player => player.id === id);
        },
        getPlayerData(id) {
            if(id) {
                return this.table.round?.playersData[id];
            }
            return this.table.round?.playersData[this.table.player?.id];
        },
        getPlayerByPosition(index) {
            
        },
        async sendAction(player, action, data) {
            this.socket.emit('action', {
                player,
                action,
                data: data || {}
            }, table => {
                console.log('action response', table);
                this.onUpdate(table);
            });
            // const body = {
            // player,
            // action,
            // data: data || {}
            // };

            // await fetch('/action', {
            // method: 'POST',
            // headers: {
            //     'Content-Type': 'application/json',
            // },
            // body: JSON.stringify(body)
            // });

            // await this.load();
        }
    },
    template: `
    <div v-if="table" class="poker container">
        <div class="badge urgent connection" :style="connection === ConnectionStatus.Disconnected ? 'opacity: 1; visibility: visible' : 'opacity: 0; visibility: hidden'">
            Disconnected</div>


        <div class="table-grid">
            <div v-if="table.players" v-for="(player, index) in table.players" class="player" :style="playerGridStyle(index, player)">
                <div class="player-inner" :class="{ 'player-active': player?.id === actingPlayer?.id }">
                    <div class="player-turn"></div>
                    <div class="player-name">{{ player.name }}</div>
                    <div class="dealer" v-if="table.round?.rules.button === player.id">Dealer</div>
                    <div class="blind" v-else-if="table.round?.blinds[player.id]">{{
                    table.round?.blinds[player.id]?.name }}</div>
                    <div>\${{ player.worth }}</div>
                    <div class="badge urgent" v-if="player.left">Left game</div>
                    <div class="badge" v-else="getPlayerData(player.id)?.action">
                        {{ActionText[getPlayerData(player.id)?.action]}} <template v-if="getPlayerData(player.id)?.bet">\${{getPlayerData(player.id)?.bet}}</template></div>
                    <div class="deck-short">
                        <div v-if="getPlayerData(player.id)?.cards.cards.length" v-for="(card, index) in getPlayerData(player.id)?.cards.cards" class="card" :class="{ empty: !card, flipped: card && !card.value }">
                            <div class="front" :style="cardUrl(card)"></div>
                            <div class="back"></div>
                        </div>
                        <template v-else>
                            <div class="card empty"></div>
                            <div class="card empty"></div>
                        </template>
                    </div>

                    <div class="player-actions" v-if="table.player?.id === player.id || showDebug">
                        <div>
                            <button class="button small secondary" :disabled="!table?.round?.actingPlayerActions.includes('CHECK')" @click="sendAction(table.player.id, 'CHECK')">Check</button>
                            <button class="button small secondary" :disabled="!table?.round?.actingPlayerActions.includes('CALL')" @click="sendAction(table.player.id, 'CALL', { value: table.round?.betSize })">Call
                                <template v-if="table.round?.betSize">\${{ table.round?.betSize }}</template></button>
                        </div>
                        <div>
                            <input class="small" type="number" v-model="input" :disabled="!table?.round?.actingPlayerActions.includes('RAISE') && !table?.round?.actingPlayerActions.includes('BET')">
                            <button class="button small primary" v-if="table?.round?.actingPlayerActions.includes('BET')" @click="sendAction(table.player.id, 'BET', { value: +input })">Bet</button>
                            <button class="button small primary" :disabled="!table?.round?.actingPlayerActions.includes('RAISE')" @click="sendAction(table.player.id, 'RAISE', { value: +input })">Raise<template v-if="input">
                                    \${{input}}</template></button>
                        </div>
                        <div>
                            <button class="button small primary" :disabled="!table?.round?.actingPlayerActions.includes('ALL_IN')" @click="sendAction(table.player.id, 'ALL_IN', { value: player.worth })">All In <template
                                    v-if="player.worth">\${{ player.worth }}</template></button>
                            <button class="button small destructive" :disabled="!table?.round?.actingPlayerActions.includes('FOLD')" @click="sendAction(table.player.id, 'FOLD')">Fold</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="details">
                <div class="details-inner">
                    <div class="table-actions">
                        <button @click="sendAction(null, 'ROUND_START')">Start Round</button>
                        <button @click="sendAction(null, 'ROUND_NEXT')">Next Round</button>
                        <button @click="sendAction(null, 'ROUND_END')">End Round</button>
                    </div>
                    <div class="table-summary">
                        <div>
                            <div class="card flipped deck-top">
                                <div class="front"></div>
                                <div class="back"></div>
                                <div>{{ table.round?.progress }}</div>
                            </div>
                        </div> 
                        <div class="details-bets">
                            <div v-if="table.round?.potSize && !table.round?.results" class="badge warning pot-size">Pot
                                \${{table.round?.potSize}}</div>
                            <div v-if="table.round?.betSize && !table.round?.results" class="badge">Bet
                                \${{table.round?.betSize}}</div>
                            <div class="results" v-if="table.round && table.round.results" v-for="(pot, index) in table.round.results">
                                <div class="badge warning">\${{pot.total}} Pot</div>
                                <span class="badge">&nbsp;{{Object.keys(pot.winnings).map(winner => getPlayer(winner)?.name).join(', ')}}
                                    <template v-if="Object.keys(pot.winnings).length === 1">wins</template><template v-else>all
                                        win \${{Object.values(pot.winnings)[0]}}</template> ({{Object.keys(pot.participants).map(player => getPlayer(player)?.name).join(' v ')}})</span>
                            </div>
                        </div>

                        <div>
                            <div class="log">
                                <div class="fade">
                                    <div class="badge log-next" v-if="actingPlayer">{{actingPlayer.name}}'s turn</div>
                                    <transition-group name="log" tag="div" class="log-items">
                                        <div class="badge" v-for="log in table.round?.log.slice(-6).reverse()" :key="log.id">{{log.player?.name}} {{log.action?.type}} {{log.action?.data?.value}}</div>
                                    </transition-group>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="showDebug">
                        <div class="deck">
                            <div v-if="table && table.round && table.round.deck" v-for="(card, index) in table.round.deck.cards" class="card" :style="cardOverlap(index)">
                                <div class="front" :style="cardUrl(card)"></div>
                                <div class="back"></div>
                            </div>
                        </div>
                        <div class="actions">
                            <div class="action" v-if="table && table.round" v-for="log in table.round.log">{{
                            log?.player?.name }} {{ log?.action?.type }} {{ log?.action?.data?.value }}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="community-cards">
                <div class="community-cards-inner">
                    <div v-for="(card, index) in communityCards" class="card" :class="{ empty: !card, flipped: !showCard.communityCards[index] || !card?.value }">
                        <div class="front" :style="cardUrl(card)"></div>
                        <div class="back"></div>
                    </div>
                </div>
            </div>
        </div>

        <details v-if="showDebug">
            <summary>Json</summary>
            <pre>{{tableString}}</pre>
        </details>
    </div>

    `
}).mount('#app');


/* <h3>{{getPlayer(result.id)?.name}} Rank {{result.rank}}</h3>
            <div>{{result.hand.type.name}}</div>
            <div>
                <h5>Hand</h5>
                <div v-for="(card, index) in result.hand.hand" class="card">
                    <div class="front" :style="cardUrl(card)"></div>
                    <div class="back"></div>
                </div>

                <h5>Kickers</h5>
                <div v-for="(card, index) in result.hand.kickers" class="card">
                    <div class="front" :style="cardUrl(card)"></div>
                    <div class="back"></div>
                </div>
                <hr>
            </div> */