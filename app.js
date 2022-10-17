var createError = require('http-errors');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const colors = require('colors');

var { Table, Player, Cards, Action, ValueName, SuitName } = require('./poker');

var table = new Table('test');
var player1 = new Player('player 1');
var player2 = new Player('player 2');
var player3 = new Player('player 3');
var player4 = new Player('player 4');
var player5 = new Player('player 5');
var player6 = new Player('player 6');
table.join(player1);
table.join(player2);
table.join(player3);
table.join(player4);
table.join(player5);
table.join(player6);
table.startRound();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const { resourceLimits } = require('worker_threads');

var app = express();


// var cribbage;

// view engine setup
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
    id: table.id,
    // name: table.name,
    // players: table.players,
    // playerStrings: table.players.map(player => `${player.name} ${player.hand.cards.map(card => `${card.value.short}${card.suit.short}`).join(', ')}`).join(', '),
    // round: JSON.stringify(table.round),
    // communityCards: table.round.communityCards.cards.map(card => `${card.value.short}${card.suit.short}`).join(', '),
    // deck: table.round.deck.cards.map(card => `${card.value.short}${card.suit.short}`).join(', '),
    // winners: table.winners
  });
});

app.get('/status', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    ...table,
    ValueName: ValueName,
    SuitName: SuitName,
    pot: table.round?.getPotSize(),
    bet: table.round?.getBetSize()
  }));
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

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
