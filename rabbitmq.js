var amqp = require('amqplib/callback_api');
var exports = module.exports = {};

exports.amqpConn = null;
exports.pubChannel = null;
exports.offlinePubQueue = [];

exports.closeOnErr = function(err) {
  if (!err) return false;
  console.error("[AMQP] error", err);
  exports.amqpConn.close();
  return true;
};

exports.publish = function(exchange, routingKey, content) {
  try {
    exports.pubChannel.publish(exchange, routingKey, content, { persistent: true },
                      function(err, ok) {
                        if (err) {
                          console.error("[AMQP] publish", err);
                          exports.offlinePubQueue.push([exchange, routingKey, content]);
                          exports.pubChannel.connection.close();
                        }
                      });
  } catch (e) {
    console.error("[AMQP] publish", e.message);
    exports.offlinePubQueue.push([exchange, routingKey, content]);
  }
};

exports.startPublisher = function(queue) {
  exports.amqpConn.createConfirmChannel(function(err, ch) {
    if (exports.closeOnErr(err)) return;
      ch.on("error", function(err) {
      console.error("[AMQP] channel error", err.message);
    });
    ch.on("close", function() {
      console.log("[AMQP] channel closed");
    });

    exports.pubChannel = ch;

    if ( exports.offlinePubQueue.length === 0 ) {
      exports.publish(queue["exchange"], queue["routingKey"], queue["content"]);
    }

    while (true) {
      var m = exports.offlinePubQueue.shift();
      if (!m) break;
      exports.publish(m[0], m[1], m[2]);
    }
  });
};


exports.whenConnected = function(queue) {
  exports.startPublisher(queue);
  // startWorker();
};

exports.start = function(__AMQP_URI__, queue) {
  amqp.connect(__AMQP_URI__, function(err, conn) {
    if (err) {
      console.error("[AMQP]", err.message);
      return setTimeout(exports.start, 1000);
    }
    conn.on("error", function(err) {
      if (err.message !== "Connection closing") {
        console.error("[AMQP] conn error", err.message);
      }
    });
    conn.on("close", function() {
      console.error("[AMQP] reconnecting");
      return setTimeout(exports.start, 1000);
    });
    console.log("[AMQP] connected");
    exports.amqpConn = conn;
    exports.whenConnected(queue);
  });
};