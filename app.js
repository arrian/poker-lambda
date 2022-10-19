var createError = require('http-errors');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const colors = require('colors');

var { Table, Player, Cards, Action, ValueName, SuitName, getPartialKnowledge } = require('./poker');

var table = new Table('test');

let playerConnections = {};

function broadcastStatus({exclude = []} = { exclude: []}) {
  Object.entries(playerConnections).filter(([playerId, connection]) => !exclude.includes(playerId)).forEach(([playerId, connection]) => {
    console.log('status to', playerId);
    connection.emit('status', getPartialKnowledge(playerId, table));
  });
}

table.on('joined', () => {
  console.log('sending joined status');
  broadcastStatus();
});

table.on('left', () => {
  console.log('sending left status');
  broadcastStatus();
});

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const { resourceLimits } = require('worker_threads');

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
app.use('/users', usersRouter);

app.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Status',
    id: table.id
  });
});

app.get('/status', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(getPartialKnowledge(req.query.player ? table.players[req.query.player] : null, table)));
});

app.post('/action', function(req, res) {
  if(req.body.player === table.round?.actingPlayer || !req.body.player) {
    table.act(req.body.player, {
      type: req.body.action,
      data: req.body.data
    });
    res.sendStatus(200);
  } else {
    console.error(colors.red.bold('Action played out of turn'));
    res.sendStatus(400);
  }
  
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.locals.title = 'Server Error';

  console.error(colors.red.bold(err.message));
  console.error(colors.red.bold(err.stack));

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

let playerCounter = 0;

app.socketConnection = client => {
  console.log('client connected');

  playerCounter++;
  
  const player = new Player('Player ' + playerCounter);
  playerConnections[player.id] = client;

  try {
    table.join(player);
  } catch(e) {
    console.error(colors.red.bold(e.message));
    console.error(colors.red.bold(e.stack));
  }

  client.on('action', ({ player: playerId, action, data }, acknowledge) => {
    // TODO: don't allow table actions from players
    if(playerId && player.id !== playerId) {
      console.error('Player id in action does not match source connection', playerId, player.id);
      return;
    }
    console.log('on action', playerId, action, data);
    try {
      table.act(playerId, { type: action, data });
      acknowledge(getPartialKnowledge(player.id, table));
      broadcastStatus({ exclude: [player.id] });
    } catch(e) {
      console.error(colors.red.bold(e.message));
      console.error(colors.red.bold(e.stack));
    }
  });

  client.on('disconnect', () => {
    console.log('disconnect');
    delete playerConnections[player.id];
    try {
      table.leave(player);
      broadcastStatus();
    } catch(e) {
      console.error(colors.red.bold(e.message));
      console.error(colors.red.bold(e.stack));
    }
  });
};

module.exports = app;
