/*
    Receive AMQP requests to run an algorithm in Rt 106.
    Wait a random amount of time, then send the response message for each request.
    Some responses may randomly be error responses.
    Some of the AMQP code in this file is thanks to:
    https://www.cloudamqp.com/blog/2015-05-19-part2-2-rabbitmq-for-beginners_example-and-sample-code-node-js.html
 */

var amqp = require('amqplib/callback_api');
var uuid = require('uuid');

const AMQP_HOST = 'localhost';
const AMQP_QUEUE_NAME = 'MR_BIAS_CORRECTION';
const AMQP_DURABLE = true;
const AMQP_DELIVERY_MODE = 2;  // 2 means persistent and should be used for durable queues.

const MIN_SECONDS = 2;
const MAX_SECONDS = 10;
const SUCCESS_RATE = 75; // percent of requests that will succeed.

var amqpConn = null;
var respChan = null;

function startAMQPconnection() {
    amqp.connect('amqp://' + AMQP_HOST, function(err, conn) {
        if (err) {
            console.error("[AMQP]", err.message);
            return setTimeout(startAMQPconnection, 1000); // Try again to connect.
        }
        conn.on("error", function(err) {
           if (err.message !== "Connection closing") {
               console.error("[AMQP] conn error", err.message);
           }
        });
        conn.on("close", function() {
            console.log("[AMQP] connection closed");
        });
        console.log("[AMQP] connected to request queue");
        amqpConn = conn;
        whenAMQPconnected();
     });
}
startAMQPconnection();

// Create the channel, queue, and sets up the callback for messages.
function whenAMQPconnected() {
    createResponseChannel();
    amqpConn.createChannel(function(err, ch) {
        if (err) {
            console.error("[AMQP] createChannel error", err.message);
            return;
        }
        ch.on("error", function(err) {
            console.error("[AMQP] channel error", err.message);
        });
        ch.on("close", function() {
            console.log("[AMQP] channel closed");
        });
        var q = AMQP_QUEUE_NAME;

        ch.assertQueue(q, {durable: AMQP_DURABLE}, function(err, _ok) {
             if (err) {
                 console.error("[AMQP] assertQueue error", err.message);
                 amqpConn.close();
                 return;
             }
        });
        ch.consume(q, function(msg) {
             var str = msg.content.toString();
             console.log(" [x] Received %s", str);
             ch.ack(msg);
             var msgObj = JSON.parse(str);
             setTimeout(sendResponse, randomMilliseconds(), msgObj);
         }, {noAck: false});
        console.log("[AMQP] Waiting for messages in %s. To exit press CTRL+C", q);
    });
}

function createResponseChannel() {
    amqpConn.createChannel(function(err, ch) {
        if (err) {
            console.error("[AMQP] response createChannel error", err.message);
            return;
        };
        ch.on("error", function(err) {
            console.error("[AMQP] response channel error", err.message);
        });
        ch.on("close", function() {
            console.log("[AMQP] response channel closed");
        });
        respChan = ch;
    })
}

function sendResponse(req) {
    //console.log("Sending response to " + JSON.stringify(req) + ", requestId is " + req.requestId);
    console.log("Sending response to requestId " + req.requestId);
    // Create response message.
    var r = 100 * Math.random();
    // Randomly have some failures.
    var st;
    if (r < SUCCESS_RATE)
        st = "EXECUTION_FINISHED_SUCCESS";
    else
        st = "EXECUTION_FINISHED_ERROR";
    // Get the patient and study.
    var URI = "";
    URI = req.input[0].value;
    //console.log("URI is " + URI);
    var splitURI = URI.split("/");
    //console.log("splitURI is " + splitURI);
    var patient = splitURI[0];
    var study   = splitURI[1];
    var result = patient + "/" + study + "/resultStudy";
    var http_data = {
        "header": {
            "messageId": uuid.v4(),
            "executionId": req.header.executionId,
            "creationTime": Date.now()
        },
        "result": {
            "resultSeries": {
                "type": "STRING",
                "value": result
            }
        },
        "status": st
    };
    /*
        "responseId" : uuid.v4(),
        "response" : {
            "status": st,
            "result": [
                {"name":"MRimage", "value":result, "type":"DICOM"}
            ]
        },
        "provenance" : {
            "requestId" : req.requestId,
            "input" : req.input[0].value
        }
    };
    */
    console.log("Response message " + JSON.stringify(http_data));
    // Send response message.
    // We should still have an AMQP connection at this point.
    if (amqpConn == null) {
        console.log("[AMQP] No valid AMQP connection for sending response");
        return;
    }
    var q = req.responseQueue;
    if (respChan == null) {
        console.log("Channel not set.");
        return;
    }
    respChan.assertQueue(q, {durable: false, autoDelete: true});  // Response queues are always non-durable.
    respChan.sendToQueue(q, new Buffer(JSON.stringify(http_data)), { deliveryMode: AMQP_DELIVERY_MODE });
    console.log(" [x] Sent " + JSON.stringify(http_data));
}

function randomMilliseconds() {
    var seconds = (MAX_SECONDS - MIN_SECONDS) * Math.random() + MIN_SECONDS;
    return seconds * 1000;
}
