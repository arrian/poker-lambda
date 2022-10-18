console.log('loaded');
const { createApp } = Vue;

createApp({
    data() {
        return {
            table: null,
            tableString: null,
            message: 'Hello Vue!',
            inputs: {}
        }
    },
    mounted() {
        this.load();
    },
    computed: {
        actingPlayer() {
            return this.table.players.find(player => player.id === this.table.round.actingPlayer);
        }
    },
    methods: {
        async load() {
            const result = await fetch('/status?player=3').then(response => response.json());
            this.table = result;
            this.tableString = JSON.stringify(result, null, 4);
            this.inputs = {};
            this.table.players.forEach(player => this.inputs[player.id] = this.table.round?.betSize || 0);
            return result;
        },
        cardUrl(card) {
            const value = this.table.ValueName[card.value];
            const suit = this.table.SuitName[card.suit];
            return `background-image: url('https://raw.githubusercontent.com/arrian/cards-svg/master/svg/${value}-${suit}.svg')`;
        },
        cardOverlap(index) {
            return `grid-area: 1 / ${index + 1} / span 1 / span 5`;
        },
        playerStyle(player) {
            return `opacity: ${this.table.round.playersData[player.id].action === 'FOLD' ? 0.5 : 1 }; outline: ${this.actingPlayer?.id === player.id ? '5px solid white' : 'none' };`;
        },
        getPlayer(id) {
            return this.table.players.find(player => player.id === id);
        },
        async sendAction(player, action, data) {
            const body = {
            player,
            action,
            data: data || {}
            };

            await fetch('/action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
            });

            await this.load();
        }
    },
    template: `
    <div v-if="table && table.round">
    <div class="table">
    <h2>Table</h2>
    <div>{{ table.round.progress }}</div>
    <button @click="sendAction(null, 'ROUND_START')">Start Round</button>
    <button @click="sendAction(null, 'ROUND_NEXT')">Next Round</button>
    <button @click="sendAction(null, 'ROUND_END')">End Round</button>
    <div>Pot \${{table.round?.potSize}}</div>
    <div>Bet \${{table.round?.betSize}}</div>
    <div class="actions">
        <div class="action" v-if="table && table.round" v-for="log in table.round.log">{{ log?.player?.name }} {{ log?.action?.type }} {{ log?.action?.data?.value }}</div>
    </div>
    <div v-if="actingPlayer">Awaiting {{actingPlayer.name}}</div>
    <div class="deck">
        <div v-if="table && table.round && table.round.deck" v-for="(card, index) in table.round.deck.cards" class="card" :style="cardOverlap(index)">
        <div class="front" :style="cardUrl(card)"></div>
        <div class="back"></div>
        </div>
    </div>
    <div class="deck-short">
        <div v-if="table && table.round && table.round.communityCards" v-for="(card, index) in table.round.communityCards.cards" class="card" :style="cardOverlap(index)">
        <div class="front" :style="cardUrl(card)"></div>
        <div class="back"></div>
        </div>
    </div>
    <div v-if="table.round.results"> 
        <div v-for="result in table.round.results">
        <h3>{{getPlayer(result.id).name}} Rank {{result.rank}}</h3>
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
        </div>
        </div>
    </div>
    </div>
    <div class="player" v-if="table && table.players" v-for="player in table.players" :style="playerStyle(player)">
    <h2>{{ player.name }}</h2>
    <div class="button" v-if="table.round.button === player.id">Dealer</div>
    <div>\${{ player.worth }}</div>
    <div>Action {{table.round.playersData[player.id].action}}</div>
    <div>Bet {{table.round.playersData[player.id].bet}}</div>
    <div class="deck-short">
        <div v-for="(card, index) in table.round.playersData[player.id].cards.cards" class="card" :style="cardOverlap(index)">
        <div class="front" :style="cardUrl(card)"></div>
        <div class="back"></div>
        </div>
    </div>
    <input type="number" v-model="inputs[player.id]">
    <button @click="sendAction(player.id, 'FOLD')">Fold</button>
    <button @click="sendAction(player.id, 'CHECK')">Check</button>
    <button @click="sendAction(player.id, 'CALL', { value: +inputs[player.id] })">Call</button>
    <button @click="sendAction(player.id, 'ALL_IN', { value: +inputs[player.id] })">All In</button>
    <button @click="sendAction(player.id, 'BET', { value: +inputs[player.id] })">Bet</button>
    <button @click="sendAction(player.id, 'RAISE', { value: +inputs[player.id] })">Raise</button>
    </div>
    <details>
    <summary>Json</summary>
    <pre>{{tableString}}</pre>
    </details>
    </div>
    `
}).mount('#app');