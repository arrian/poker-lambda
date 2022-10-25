// const { io } = require('socket.io-client');

// const socket = io('http://localhost:3001/Local', {
//     transports: ["websocket"]
// });

// socket.on('connect', () => {
//     console.log('connect-----------------------');
// })

// socket.on('disconnect', () => {
//     console.log('disconnect-----------------------');
// })

// socket.onAny((name, ...args) => {
//     console.log(name, args);
// });


const prompt = require('prompt');
prompt.start();

const { WebSocket } = require('ws');
const socket = new WebSocket('ws://localhost:3001/Local');

function promptAction() {
    return new Promise((resolve, reject) => {
        prompt.get(['action'], function (err, result) {
            socket.send(JSON.stringify({
                action: result.action
            }));
            resolve();
        });
    })
}

socket.on('open', async function open() {
    console.log('opened');

    while(true) {
        await promptAction();
    }
});

socket.on('message', function message(data) {
    console.log('received: %s', data);
});

socket.on('close', function open() {
    console.log('closed');
});


