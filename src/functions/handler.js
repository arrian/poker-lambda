const AWS = require('aws-sdk');
const cuid = require('cuid');
const colors = require('colors');
var { Table, Player } = require('../poker');

console.log(process.env);

const client = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.GATEWAY_ENDPOINT,//`http://localhost:3001`,
  region: process.env.AWS_REGION //'localhost'
});

function send(connectionId, data) {
  return client.postToConnection({
    ConnectionId: connectionId,
    Data: JSON.stringify(data)
  }).promise();
}

function broadcast(player, table) {
  const players = {};
  players[player.id] = player;
  table.players.forEach(p => players[p.id] = p);

  return Promise.all(Object.values(players).map(p => {
    console.log('broadcast', p);
    return client.postToConnection({
      ConnectionId: p.connectionId,
      Data: JSON.stringify({
        route: 'status',
        data: Table.serializePartial(p.id, table)
      })
    }).promise().catch(e => {
      console.error('failed to broadcast to ' + p.id);
    });
  }));
}

const POKER_TABLE = 'pokerTable';

function getDatabaseClient() {
  return new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION, //'localhost',
    endpoint: process.env.DYNAMODB_ENDPOINT, //'http://localhost:8001',
    accessKeyId: process.env.AWS_ACCESS_KEY, //'DEFAULT_ACCESS_KEY',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY //'DEFAULT_SECRET'
  });
}

async function loadGames() {
  const dbClient = getDatabaseClient();

  const params = {
    TableName: POKER_TABLE,
    limit: 100,
    projectionExpression: 'tableId, name, playerCount, playerConnections, playerNames'
  }

  const results = await dbClient.scan(params).promise();
  if (results && results.Items) {
    return results.Items.map(item => ({
      tableId: item['tableId'],
      name: item['name'],
      playerCount: item['playerCount']
    }));
  }

  return null;
}


async function loadGame(tableId) {
  console.log('tableId', tableId);
  const dbClient = getDatabaseClient();

  const params = {
    TableName: POKER_TABLE,
    Key: {
      tableId: tableId
    }
  };

  const { Item } = await dbClient.get(params).promise();
  if (Item) {
    const { tableId, data } = Item;
    const table = Table.deserialize(data);
    return table;
  }

  return null;
}

async function storeGame(table) {
  const dbClient = getDatabaseClient();

  const params = {
    TableName: POKER_TABLE,
    Item: {
      tableId: table.id,
      data: Table.serialize(table),
      name: table.name,
      playerCount: table.players.length,
      playerConnections: {
        SS: table.players.map(player => player.connectionId)
      },
      playerNames: {
        SS: table.players.map(player => player.name)
      }
    }
  };

  await dbClient.put(params).promise();

  return true;
}

async function removeGame(table) {
  const dbClient = getDatabaseClient();
  
  const params = {
    TableName: POKER_TABLE,
    Key: {
      tableId: table.id
    }
  };

  await dbClient.delete(params).promise();

  return true;
}

async function ping(event) {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      version: process.version,
      arch: process.arch,
      platform: process.platform
    }),
  };
  return response;
}

async function startGame(connectionId, tableName, playerName) {
  const table = new Table(tableName ? tableName : 'Test Table');
  const player = new Player(playerName ? playerName : 'Player ' + connectionId.substring(0, 4), connectionId);

  table.join(player);
  await storeGame(table);

  return {
    player,
    table
  };
}

async function getAllGames() {
  const games = await loadGames();
  console.log('getAllGames', games);

  return games;
}

async function joinGame(connectionId, tableId, playerName) {
  const table = await loadGame(tableId);
  const player = new Player(playerName ? playerName : 'Player ' + connectionId.substring(0, 4), connectionId);

  table.join(player);
  await storeGame(table);

  return {
    player,
    table
  };
}

async function onAction(connectionId, tableId, action, data) {
  console.log('onAction', connectionId, tableId, action, data);
  const table = await loadGame(tableId);
  const player = table.getPlayerByConnectionId(connectionId);

  if(!player) {
    throw new Error(`Could not find player with connection id ${connectionId} on table ${tableId}`);
  }

  table.act(player.id, { type: action, data });
  await storeGame(table);

  return {
    table,
    player
  };
}

async function leaveGame(connectionId, tableId) {
  const table = await loadGame(tableId);
  const player = table.getPlayerByConnectionId(connectionId);
  console.log('leave', connectionId, tableId, table, player);

  if(!player) {
    throw new Error(`Could not find player with connection id ${connectionId} on table ${tableId}`);
  }

  table.leave(player);

  if(table.players.length < 1) {
    await removeGame(table);
  } else {
    await storeGame(table);
  }

  return {
    table,
    player
  };
}

async function websocket(event) {
  try {
    const { body, requestContext: { connectionId, routeKey, domainName, stage } } = event;
    const { route, tableId, action, data } = body && typeof body === 'string' ? JSON.parse(body) : {};

    console.log('websocket', connectionId, routeKey, domainName, stage, event);

    let result;

    switch (routeKey) {
      case '$connect':
        console.log('connect');
        break;
      case '$disconnect':
        console.log('disconnect');
        break;
      case 'list':
        result = await getAllGames();
        await send(connectionId, { route: 'list', data: { games: result } });
        break;
      case 'start':
        result = await startGame(connectionId, data.tableName, data.playerName);
        await broadcast(result.player, result.table);
        break;
      case 'join':
        result = await joinGame(connectionId, tableId, data.playerName);
        await broadcast(result.player, result.table);
        break;
      case 'leave':
        result = await leaveGame(connectionId, tableId);
        await broadcast(result.player, result.table);
        break;
      case 'action':
        result = await onAction(connectionId, tableId, action, data);
        await broadcast(result.player, result.table);
        break;
      default:
        console.log('unhandled websocket event');
        break;
    }
  } catch(e) {
    console.error(colors.red.bold(e.message));
    console.error(colors.red.bold(e.stack));
    return { statusCode: 500 };
  }

  return { statusCode: 200 };
};


exports.ping = ping;
exports.websocket = websocket;



