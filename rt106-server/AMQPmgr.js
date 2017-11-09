// Copyright (c) General Electric Company, 2017.  All rights reserved.

/*
 *   Rt 106 - AMQP Manager module.
 *   Manage interactions with AMQP (RabbitMQ) queues.
 */

const amqp = require('amqplib/callback_api');  // Required for RabbitMQ client.
const winston = require('winston');

var AMQPmgr = {};

AMQPmgr.AMQP_HOST = 'rabbitmq'; // 'rabbitmq' when running in Docker Compose.
AMQPmgr.AMQP_REQ_DURABLE = true;
AMQPmgr.AMQP_REQ_DELIVERY_MODE = 2;  // 2 means persistent and should be used for durable queues.

AMQPmgr.amqpConn = null;
AMQPmgr.reqChan  = null;

 /*
  * Initialize the AMQP connection and the channel / queue for algorithm requests.
  */
AMQPmgr.initAMQP = function(queuename,msgHandler) {
    winston.info("At top of initAMQP()");

    AMQPmgr.initPromise = new Promise(function(resolve,reject) {

	amqp.connect('amqp://' + AMQPmgr.AMQP_HOST, function(err, conn) {
            if (err) {
		winston.error("[AMQP] connection problem: ", err.message);
		//reject(err);
		return setTimeout(function() {
		    AMQPmgr.initAMQP(queuename,msgHandler);}, 1000);
            }
            conn.on("error", function(err) {
				if (err.message !== "Connection closing") {
                	winston.error("[AMQP] connection error", err.message);
		    		reject(err);
					return setTimeout(function() {
						AMQPmgr.initAMQP(queuename, msgHandler);
					}, 1000); //Try again to connect.
				}
			});
            conn.on("close", function() {
		if (AMQPmgr.reqChan != null) {
                    AMQPmgr.reqChan.close();
                    AMQPmgr.reqChan = null;
		}
		// TODO:  Cleanly close all the channels and queues when the connection is closed.
		winston.error("[AMQP] connection closed");
		reject(err);
            });
            winston.debug("[AMQP] connection established.");
            AMQPmgr.amqpConn = conn;
            // Create channel for requests.
            conn.createChannel(function(err,ch) {
		if (err) {
                    winston.error("[AMQP] createChannel error ", err.message);
		    reject(err);
		}
		ch.on("error", function (err) {
                    winston.error("[AMQP] channel error ", err.message);
		});
		ch.on("close", function () {
                    winston.log("[AMQP] channel closed");
		});

		AMQPmgr.reqChan = ch;

		ch.checkQueue(queuename, function(err,exists) {
		    if (err) {
			winston.error("[AMQP] checkQueue failed. " + err.message);
			conn.createChannel(function(err,ch) {
			    if (err) {
				winston.error("[AMQP] re-createChannel error", err.message);
				//reject(err);
			    }
			    ch.on("error", function (err) {
				winston.error("[AMQP] re-channel error", err.message);
			    });
			    ch.on("close", function () {
				winston.log("[AMQP] re-channel closed");
			    });

			    AMQPmgr.reqChan = ch;

			    ch.assertQueue(queuename, {durable: false, autoDelete: true}, function(err,ok) {
				if (err) {
				    winston.error("[AMQP] assertQueue failed. " + err.message);
				    reject(err);
				}
				else { 
				    AMQPmgr.responseQueue = queuename;
				    winston.info("[AMQP] queue created, start consuming (queue="+queuename+")");
				    ch.consume(queuename, function(msg) { msgHandler(msg.content) },{noAck:true});
				    resolve();
				}
			    });
			});
		    }
		    else if (exists) { // queue already exists, start consuming
			AMQPmgr.responseQueue = queuename;
			winston.info("[AMQP] queue exists, start consuming (queue="+queuename+")");
			ch.consume(queuename, function(msg) { msgHandler(msg.content) },{noAck:true});
			resolve();
		    }
		});
	    });
	});
    });
}


module.exports = AMQPmgr;
