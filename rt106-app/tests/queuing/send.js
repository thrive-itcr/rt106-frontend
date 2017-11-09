// Copyright (c) General Electric Company, 2017.  All rights reserved.

var amqp = require('amqplib/callback_api');

const AMQP_HOST = 'localhost';
const AMQP_QUEUE_NAME = 'MR_BIAS_CORRECTION';

amqp.connect('amqp://' + AMQP_HOST, function(err, conn) {
    conn.createChannel(function(err, ch) {
        var q = AMQP_QUEUE_NAME;
        ch.assertQueue(q, {durable: false});
        ch.sendToQueue(q, new Buffer('Hello World'));
        console.log(" [x] Sent 'Hello world!'");
    });
    setTimeout(function() { conn.close(); process.exit(0) }, 500);
});

