// Copyright (c) General Electric Company, 2017.  All rights reserved.

var amqp = require('amqplib/callback_api');

const AMQP_HOST = 'localhost';
const AMQP_QUEUE_NAME = 'MR_BIAS_CORRECTION';

amqp.connect('amqp://' + AMQP_HOST, function(err, conn) {
  conn.createChannel(function(err, ch) { 
    var q = AMQP_QUEUE_NAME;
 
    ch.assertQueue(q, {durable: false}); 
     console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q); 
     ch.consume(q, function(msg) { 
       console.log(" [x] Received %s", msg.content.toString()); 
     }, {noAck: true}); 
   }); 
}); 
