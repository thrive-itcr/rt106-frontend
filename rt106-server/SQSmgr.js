const AWS = require('aws-sdk');
const winston = require('winston');

var SQSmgr = {};

SQSmgr.initSQS = function(queuename,msgHandler) {
    winston.debug("Top of initSQS");

    SQSmgr.sqsResource = null;
    if (process.env.AWS_REGION) {
	winston.info("[SQS] service requests using region '"+process.env.AWS_REGION+"'");
	SQSmgr.sqsResource = new AWS.SQS({region:process.env.AWS_REGION});
    }
    else {
	SQSmgr.sqsResource = new AWS.SQS();
    }
    
    SQSmgr.initPromise = new Promise(function(resolve,reject) {

	SQSmgr.sqsResource.getQueueUrl({QueueName:queuename}, function(err,data) {
    	    if (err) {
    		winston.error("[SQS] getQueueUrl failed (queue="+queuename+") : " + err.message);
		SQSmgr.sqsResource.createQueue({QueueName:queuename}, function(err,responseQ) {
		    if (err) {
			winston.error("[SQS] createQueue failed: " + err.message); 
			reject(err);
		    }
		    else {
			winston.info("[SQS] created response queue : " + responseQ.QueueUrl);
			SQSmgr.responseQueue = responseQ.QueueUrl;
			SQSmgr.pollForMessages(responseQ.QueueUrl,msgHandler);
			resolve();
		    }
		});
	    }
	    else {
    		winston.info("[SQS] response queue : " + data.QueueUrl);
		SQSmgr.responseQueue = data.QueueUrl;
		SQSmgr.pollForMessages(data.QueueUrl,msgHandler);
		resolve();
	    }
	});
    });
}


SQSmgr.getQueueUrl = function(queuename) {
    return new Promise(function(resolve,reject) {
	SQSmgr.sqsResource.getQueueUrl( { QueueName: queuename }, function(err,data) {
	    if (err) {
		reject(err);
	    }
	    else {
		resolve(data.QueueUrl);
	    };
	});
    });
};
	
SQSmgr.pollForMessages = function(queuename,msgHandler) {
    winston.debug('pollForMessages');
    SQSmgr.sqsResource.receiveMessage(
	{ QueueUrl: queuename, MaxNumberOfMessages: 1, VisibilityTimeout: 10, WaitTimeSeconds: 20 },
	function(err,data) {
	    if (err) { winston.error(err,err.stack); return; }
	    else {
		winston.debug(data);
	    	if (data.Messages) {
		    msgHandler(data.Messages[0].Body);
	    	    SQSmgr.sqsResource.deleteMessage(
	    		{ QueueUrl: queuename, ReceiptHandle: data.Messages[0].ReceiptHandle },
			function(err,data) {
	    		    if (err) { winston.error(err); return; }
	    		    else winston.debug('deleted message');
	    		});
	    	}
	    };
	    setTimeout(SQSmgr.pollForMessages,0,queuename,msgHandler);
	});
};

module.exports = SQSmgr;
