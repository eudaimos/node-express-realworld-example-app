var http = require("http"),
  path = require("path"),
  methods = require("methods"),
  express = require("express"),
  bodyParser = require("body-parser"),
  session = require("express-session"),
  cors = require("cors"),
  passport = require("passport"),
  errorhandler = require("errorhandler"),
  mongoose = require("mongoose");
var util = require("util");

// var redis = require('./redis');

var isProduction = process.env.NODE_ENV === "production";

// Create global app object
var app = express();

// const wireTaoJsToSocketIO = require('@tao.js/socket.io');
// var Server = require('http').Server;
// var IO = require('socket.io');

app.use(cors());

// Normal express config defaults
app.use(require("morgan")("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(require("method-override")());
app.use(express.static(__dirname + "/public"));

app.use(
  session({
    secret: "conduit",
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false,
  })
);

if (!isProduction) {
  app.use(errorhandler());
}

if (isProduction) {
  mongoose.connect(process.env.MONGODB_URI);
} else {
  mongoose.connect("mongodb://localhost/conduit");
  mongoose.set("debug", true);
}

const tao = require("@tao.js/core");
const Channel = require("@tao.js/utils").Channel;
const { default: TAO } = tao;

console.log(util.inspect({ TAO }, true, 3, true));

app.use((req, res, next) => {
  const channel = new Channel(TAO);
  req.channel = channel;
  next();
});

require("./models/User");
require("./models/Article");
require("./models/Comment");
require("./config/passport");

require("./tao");
// const tao = require('@tao.js/core');
// const { default: TAO, AppCtx } = tao;

TAO.setCtx(
  { t: "app", a: "init", o: "anon" },
  { app: { name: "conduit api" } }
);

app.use(require("./routes"));

/// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (!isProduction) {
  app.use(function (err, req, res, next) {
    console.log(err.stack);

    res.status(err.status || 500);

    res.json({
      errors: {
        message: err.message,
        error: err,
      },
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    errors: {
      message: err.message,
      error: {},
    },
  });
});

// finally, let's start our server...
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port " + server.address().port);
});

// var server = Server(app);
// var io = IO(server);

// wireTaoJsToSocketIO(TAO, io, {
//   // onConnect: initClientTAO
// });

// server.listen( process.env.PORT || 3000, function(){
//   console.log('Listening on port ' + server.address().port);
// });
