#!/usr/bin/env node

var rabbitmqjs = require("./rabbitmq.js");

var payload = {
  "key1": "yaya", 
  "key2": "lololo"
};

var content = JSON.stringify(payload)
var buff = new Buffer(content)

var queue = { 
  "exchange": "",
  "routingKey": "jobs", 
  "content": buff
};

rabbitmqjs.start("amqp://localhost", queue);