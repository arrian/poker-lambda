const { io } = require('socket.io-client');

const socket = io('ws://localhost:3001', {
    path: '/Dev',
    transports: ["websocket"]
});

socket.on('connect', () => {
    console.log('connected-----------------------');
})

socket.onAny((name, ...args) => {
    console.log(name, args);
});

// console.log(socket);

// socket.emit('list');