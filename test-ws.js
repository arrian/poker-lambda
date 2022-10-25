const prompt = require('prompt');
prompt.start();

const { WebSocket } = require('ws');
const socket = new WebSocket('ws://localhost:3001/Local');

async function promptRoute() {
    const { route } = await prompt.get(['route']);
    let tableId = null;
    let action = null;
    let data = null;
    
    if(['join', 'leave', 'action'].includes(route)) {
        const result = await prompt.get(['table id']);
        tableId = result['table id'];
    }

    if(route === 'action') {
        const result = await prompt.get(['action', 'data']);
        action = result.action;
        data = result.data;
    }

    console.log('prompt sent', JSON.stringify({
        route,
        tableId,
        action,
        data
    }));

    socket.send(JSON.stringify({
        route,
        tableId,
        action,
        data
    }));
}

socket.on('open', async function open() {
    console.log('opened');

    while(true) {
        await promptRoute();
        await new Promise(r => setTimeout(r, 500));
    }
});

socket.on('message', function message(data) {
    console.log('received: %s', data);
});

socket.on('close', function open() {
    console.log('closed');
});


