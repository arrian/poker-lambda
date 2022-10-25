const AWS = require('aws-sdk');
const cuid = require('cuid');
const colors = require('colors');
var { Table, Player } = require('../poker');

const client = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: `http://localhost:3001`,
  region: 'localhost'
});

function broadcast(table) {
  return Promise.all(table.players.map(player => {
    return client.postToConnection({
      ConnectionId: player.connectionId,
      Data: JSON.stringify({
        action: 'status',
        data: Table.serializePartial(player.id, table)
      })
    }).promise();
  }));
}

const POKER_TABLE = 'pokerTable';

function getDatabaseClient() {
  return new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: 'http://localhost:8001',
    accessKeyId: 'DEFAULT_ACCESS_KEY',
    secretAccessKey: 'DEFAULT_SECRET'
  });
}

async function loadGames() {
  const dbClient = getDatabaseClient();

  const params = {
    TableName: POKER_TABLE,
    limit: 100,
    projectionExpression: 'tableId'
  }

  try {
    const results = await dbClient.scan(params).promise();
    if (results && results.Items) {
      return results.Items.map(item => item['tableId']);
    }
  } catch (e) {
    console.log(e);
  }

  return null;
}


async function loadGame(tableId) {
  const dbClient = getDatabaseClient();

  const params = {
    TableName: POKER_TABLE,
    Key: {
      tableId: tableId,

    }
  }

  try {
    const { Item } = await dbClient.get(params).promise();
    if (Item) {
      const { tableId, data } = Item;
      const table = Table.deserialize(data);
      return table;
    }
  } catch (e) {
    console.log(e);
  }

  return null;
}

async function storeGame(table) {
  const dbClient = getDatabaseClient();

  const params = {
    TableName: POKER_TABLE,
    Item: {
      tableId: table.id,
      data: Table.serialize(table)
    }
  };

  try {
    await dbClient.put(params).promise();
    return true;
  } catch (e) {
    console.log(e);
  }

  return false;
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

async function startGame(connectionId) {
  const table = new Table('Test Table');
  const player = new Player('Player ' + connectionId, connectionId);

  try {
    table.join(player);
    await storeGame(table);
  } catch (e) {
    console.error(colors.red.bold(e.message));
    console.error(colors.red.bold(e.stack));
  }

  return {
    player,
    table
  };
}

async function getAllGames() {
  const tableIds = await loadGames();
  console.log('getAllGames', tableIds);

  return tableIds;
}

async function joinGame(connectionId, tableId) {
  const table = await loadGame(tableId);
  const player = new Player('Player ' + connectionId, connectionId);

  try {
    table.join(player);
    await storeGame(table);
  } catch (e) {
    console.error(colors.red.bold(e.message));
    console.error(colors.red.bold(e.stack));
  }

  return {
    player,
    table
  };
}

async function onAction(connectionId, tableId, action, data) {
  const table = await loadGame(tableId);
  const player = table.getPlayerByConnectionId(connectionId);

  try {
    table.act(player, { type: action, data });
    await storeGame(table);
  } catch (e) {
    console.error(colors.red.bold(e.message));
    console.error(colors.red.bold(e.stack));
  }

  return {
    table,
    player
  };
}

async function leaveGame(connectionId, tableId) {
  const table = await loadGame(tableId);
  const player = table.getPlayerByConnectionId(connectionId);

  try {
    table.leave(player);
    // TODO: if(table.players.length < 1) 
    await storeGame(table);
  } catch (e) {
    console.error(colors.red.bold(e.message));
    console.error(colors.red.bold(e.stack));
  }

  return {
    table,
    player
  };
}

async function websocket(event) {
  const { body, requestContext: { connectionId, routeKey, domainName, stage } } = event;

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
      try {
        await client.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify(result)
        }).promise();
      } catch(e) {
        console.error(e);
      }
      break;
    case 'start':
      result = await startGame(connectionId, body.tableId);
      broadcast(result.table);
      break;
    case 'join':
      result = await joinGame(connectionId, body.tableId);
      broadcast(result.table);
      break;
    case 'leave':
      result = await leaveGame(connectionId, body.tableId);
      broadcast(result.table);
      break;
    case 'action':
      result = await onAction(connectionId, body.tableId, body.action, body.data);
      broadcast(result.table);
      break;
    default:
      console.log('unhandled websocket event');
      break;
  }

  return { statusCode: 200 };
};


exports.ping = ping;
exports.websocket = websocket;



