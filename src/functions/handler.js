const AWS = require('aws-sdk');
const cuid = require('cuid');
const colors = require('colors');
var { Table, Player } = require('../poker');



exports.example = async (event) => {
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  });
  send = async (connectionId, data) => {
    await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: `Echo: ${data}` }).promise();
  }
  // TODO implement
  // const response = {
  //     statusCode: 200,
  //     body: JSON.stringify('Hello from Lambda!'),
  // };
  // return response;
};

function broadcast({ player, table }) {
  // TODO: implement ack
}

function broadcastStatus({ table, exclude = [] }) {
  // TODO: get player connections
  Object.entries(playerConnections).filter(([playerId, connection]) => !exclude.includes(playerId)).forEach(([playerId, connection]) => {
    console.log('status to', playerId);
    connection.emit('status', Table.serializePartial(playerId, table));
  });
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
    // TODO: acknowledge(Table.serializePartial(player, table));
    // broadcastStatus({ table, exclude: [player] });
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

async function onWebsocketMessage(connectionId, body) {
  let result;
  switch(body.action) {
    case 'list':
      return getAllGames();
    case 'start':
      result = startGame(connectionId, body.tableId);
      broadcast(result);
      return result;
    case 'join':
      result = joinGame(connectionId, body.tableId);
      broadcast(result);
      return result;
    case 'leave':
      result = leaveGame(connectionId, body.tableId);
      broadcast(result);
      return result;
    case 'action':
      result = onAction(connectionId, body.tableId, body.action, body.data);
      broadcast(result);
      return result;
    case 'default':
      return null;
  } 
}

async function websocket(event) {

  console.log("EVENT: " + JSON.stringify(event, null, 2));

  const { body, requestContext: { connectionId, routeKey }} = event;

  switch(routeKey) {
    case '$connect':
      console.log('connect');
      break;
    case '$disconnect':
      console.log('disconnect');
      break;
    case '$default':
      await onWebsocketMessage(connectionId, body);
      break;
  }

  return { statusCode: 200 };
};

function wrapResponse(response) {
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
}

exports.ping = ping;
// exports.startGame = event => wrapResponse(startGame(event.body.connectionId));
// exports.getAllGames = event => wrapResponse(getAllGames());
// exports.onClientConnected = event => wrapResponse(joinGame(event.body.connectionId, event.body.tableId));
// exports.onClientAction = event => wrapResponse(onAction(event.body.connectionId, event.body.tableId, event.body.action, event.body.data));
// exports.onClientDisconnected = event => wrapResponse(leaveGame(event.body.connectionId, event.body.tableId));
exports.websocket = websocket;



