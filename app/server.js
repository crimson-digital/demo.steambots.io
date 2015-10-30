var express = require("express"),
    session = require("express-session"),
    swig = require("swig"),
    fs = require("fs"),
    _ = require("lodash"),
    SteamBots = require("steambots-node-sdk"),
    bodyParser = require("body-parser"),
    openid = require("openid"),
    mysql = require("mysql"),
    Long = require("long"),
    config = require("./config");

var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);

if (!process.env.API_KEY) {
  console.error("Please specify the API_KEY environment variable");
  process.exit();
}

var sdk = new SteamBots(process.env.API_KEY);
var relyingParty = new openid.RelyingParty(config.baseUrl + "/verify", config.baseUrl, true, false, []);
var connection = mysql.createConnection(config.mysql);

// configure swig as the express templating engine
app.engine("html", swig.renderFile);
app.set("view engine", "html");
app.set("views", __dirname + "/views");
app.set("view cache", false);
app.use("/static", express.static(__dirname + "/public"));

// enable body parsing
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// enable cookies
app.use(session({ secret: "demo.steambots", resave: true, saveUninitialized: true, cookie: { maxAge: 3600000 }}));

// for every request lets make the user session available to the templates
app.use(function (req, res, next) { 
  res.locals.user = req.session.user;
  next();
});


// no cache in debug mode
swig.setDefaults({ cache: !config.debug });

// for formatting numbers with 2 decimal places
swig.setFilter("toFixed", function(a, b) { return a.toFixed(b); });


/******************************************************
 * Utils
 ******************************************************/

function commitTransaction(connection, callback) {
  connection.commit(function(err) {
    if (err) {
      return connection.rollback(function() {
        throw err;
      });
    }
    if (callback) callback();
  });
}

function validateTradeLink(steamId, tradeLink) {

  var matches = tradeLink.match(/^https?:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=([0-9]+)&token=([\w\p\-]+)$/i);
  
  if (!matches) {
    return false;
  }
  
  // ensure the accountId matches the steamId
  var accountId  = matches[1];
  if (steamId != new Long(parseInt(accountId, 10), 0x1100001).toString()) {
    return false;
  }

  return true;
}


/******************************************************
 * Handling SteamBots http stream
 ******************************************************/

sdk.on("data", function(event) {

  var now = new Date();

  console.log("New event of type " + event.type + " (#" + event.id + ")")

  switch(event.type) {
    case "trades":
    case "bots":
      connection.beginTransaction(function(err) {
        
        // insert the event
        var sql = "insert into events (id, type, action, data, date) values (?, ?, ?, ?, ?)";
        var params = [event.id, event.type, event.action, JSON.stringify(event.data), now];
        connection.query(sql, params, function(err, result) {
          if (err) {
            return connection.rollback(function() {
              throw err;
            });
          }
          // if it's a trade, which is a deposit and it's just completed, lets insert the items
          if (event.type == "trades") {

            var trade = event.data;

            // tell the user about the trade update
            io.to(trade.user_steam_id).emit("trade", trade);

            // if it's a deposit and it's completed, lets insert the items
            if (trade.type == "deposit" && trade.state == "complete") {

              console.log("New completed deposit");

              var sql = "insert into item (id, state, owner_steam_id, name, quality, icon, inspect_link, guide_price, created_at, updated_at) values ?";
              var params = _.map(trade.items, function(item) {
                return [item.id, "myitems", trade.user_steam_id, item.name, item.quality, item.icon, item.inspect_link, item.guide_price, now, now];
              });
              
              return connection.query(sql, [params], function(err, result) {
                if (err) {
                  return connection.rollback(function() {
                    throw err;
                  });
                }
                // commit the transaction
                commitTransaction(connection);
              });
            }
          }

          commitTransaction(connection);
        });
      });
    break;
  }
});

// resume the stream from the last event we processed
connection.query("select max(id) as id from events", function(e, results) {
  var lastId = 0;
  if (results && results.length > 0) {
    lastId = results[0].id;
  }
  console.log("Resuming http stream from id " + lastId);
  sdk.openStream(lastId);
});


/******************************************************
 * Web application routes
 ******************************************************/

app.get("/", function (req, res) {
 res.render("index", {}); 
});

app.get("/login", function(req, res) {
  relyingParty.authenticate("http://steamcommunity.com/openid", false, function(e, authUrl) {
    if (e) {
      return res.redirect("/");
    }
    res.redirect(authUrl);
  });
});

app.get("/verify", function(req, res) {

  relyingParty.verifyAssertion(req, function(e, result) {
    
    if (!result.authenticated) {
      return res.redirect("/");
    }

    var IDENTIFIER_REGEX = /^https?:\/\/steamcommunity\.com\/openid\/id\/([0-9]+)$/;
    var matches = IDENTIFIER_REGEX.exec(result.claimedIdentifier);

    if (matches === null) {
      return res.redirect("/");
    }

    req.session.user = {
      steam_id: matches[1]
    };

    return res.redirect("/");
  });

});

app.get("/logout", function (req, res) {
  req.session.destroy(function(err) {
    res.redirect("/");
  });
});

app.get("/deposit", function(req, res) {
  
  if (!req.session.user) {
    return res.redirect("/login");
  }

  sdk.loadInventory(req.session.user.steam_id, function(e, inventory) {

    var templateVars = {};

    if (e) {
      templateVars.error = e.message;
    } else if (inventory) {

      var items = inventory.response;

      // remove any non-tradable items and items without prices
      items = _.filter(items, function(item) {
        return item.tradable && item.guide_price != null;
      });
      
      // sort items by price descending
      templateVars.items = _.sortByOrder(items, "guide_price", "desc");

      // return a total price
      templateVars.total = _.sum(items, "guide_price");
    }

    res.render("deposit", templateVars);
  });

});

app.post("/deposit", function(req, res) {

  if (!req.session.user) {
    return res.redirect("/login");
  }
  
  if (!req.body.trade_link) {
    throw new Error("No trade link specified");
  }
  
  if (!req.body.asset_ids || req.body.asset_ids.length == 0) {
    throw new Error("No assets specified");
  }

  var tradeLink = req.body.trade_link;
  var assetIds = _.map(req.body.asset_ids, function(assetId) {
    return parseInt(assetId);
  });
  var steamId = req.session.user.steam_id;

  if (!validateTradeLink(steamId, tradeLink)) {
    throw new Error("Trade link must be for your steam id");
  }

  sdk.createDeposit(tradeLink, assetIds, function(err, response) {
    console.log(err, response);
    res.redirect("/trades");
  });

});

app.get("/withdraw", function(req, res) {

  if (!req.session.user) {
    return res.redirect("/login");
  }

  connection.query(
    "select * from item where owner_steam_id = ? and state = ?",
    [req.session.user.steam_id, "myitems"],
    function(e, items) {
      res.render("withdraw", {
        items: items
      });
    }
  );
});

app.post("/withdraw", function(req, res) {

  if (!req.session.user) {
    return res.redirect("/login");
  }
  
  if (!req.body.trade_link) {
    throw new Error("No trade link specified");
  }
  
  if (!req.body.item_ids || req.body.item_ids.length == 0) {
    throw new Error("No items specified");
  }

  var tradeLink = req.body.trade_link;
  var itemIds = _.map(req.body.item_ids, function(itemId) {
    return parseInt(itemId);
  });
  var steamId = req.session.user.steam_id;

  if (!validateTradeLink(steamId, tradeLink)) {
    throw new Error("Trade link must be for your steam id");
  }

  connection.beginTransaction(function(err) {

    // select all of the items that have been requested
    connection.query(
      "select * from item where id in (?) and owner_steam_id = ? and state = ? for update",
      [itemIds, req.session.user.steam_id, "myitems"],
      function(err, items) {

        if (err || items.length != itemIds.length) {
          return connection.rollback(function() {
            throw err;
          });
        }

        // set them to requested state
        connection.query(
          "update item set state = ? where id in (?)",
          ["requested", itemIds],
          function(err, results) {
            if (err) {
              return connection.rollback(function() {
                throw err;
              })
            }

            commitTransaction(connection, function() {
              sdk.createWithdrawal(tradeLink, itemIds, function(e, data) {
                console.log(e, data);
                return res.redirect("/trades");
              });
            });
          }
        )
      }
    );
  });
});

app.get("/trades", function(req, res) {
  
  if (!req.session.user) {
    return res.redirect("/login");
  }
  
  sdk.getTrades({
    user_steam_id: req.session.user.steam_id,
    sort: "desc"
  }, function(e, data) {
    res.render("trades", {
      trades: data.response
    });
  });
});

io.on("connection", function (socket) {
  // WARNING: Do not do this in production. Use a more secure method 
  // for binding users to sockets (access tokens.etc.)
  if (socket.handshake.query.steam_id) {
    socket.steam_id = socket.handshake.query.steam_id;
    socket.join(socket.steam_id);
  }
});

server.listen(config.port, function() {
  console.log("Server running on port " + config.port);
});