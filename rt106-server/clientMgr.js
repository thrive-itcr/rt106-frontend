 /*
  *   Rt 106 - Client Manager module.
  *   Manage the identities of the web clients connected to the server.
  *   Maintain an AMQP response queue for each client.
  *   Clean up when a client becomes idle.
  */

 /*
  * TODO:  There is code in this file for saving client-specific data in clientMgr.executionList, clientMgr.lastTouched,
  *        and clientMgr.responsesExpected.  However, there is also newer code that saves and accesses all of this information
  *        from the MySQL database.  After we have some experience with this new code and are confident that it works well,
  *        we can remove the code that maintains these in-memory datastructures.
  *        This has the benefit of making rt106-server.js "stateless" so that there can be multiple copies running, managed
  *        by a load balancer.
  */

const rp         = require('request-promise');
const uuid       = require('uuid');
const os         = require('os'); // Used to get the hostname.
const dateformat = require('date-format');
const winston    = require('winston');

const MySQLmgr   = require('./MySQLmgr');   // module for managing MySQL interactions.

const PORT = 8106;


// client manager module.
var clientMgr = {};

// For each unique (web browser) client, save the hostname, response queue name, channel, executionList and other info.
// These variables are being phased out, and instead being kept in MySQL>  (See note above.)
clientMgr.clientList = [];
clientMgr.executionList = {};
clientMgr.lastTouched = {};
clientMgr.responsesExpected = {};

var queueTimeoutShort = 3600000; // Time to check for cleaning up unused queues (milliseconds)
var queueTimeoutLong  = 259200000; // Time to check for busy queues that have not received responses (milliseconds)
var checkTimeQueues   = 30000; // How often to check for unused and dead queues (milliseconds)

/*
 * getUniqueClientName.
 * The name for each client is the full IPv6 IP address, with colons replaced with c's and dots replaced with d's,
 * so that there are no special symbols.
 * This approach has the downside that any clients sharing the IP address will look like the same client.  Something
 * else, such as a UUID, could be used in addition to or instead of the IP address.
 * However, a reason this is not being done is so that a session that times out and then resumes will be recognized
 * as the same session.
 */
clientMgr.getUniqueClientName = function(req) {
    //var cName = req.connection.remoteAddress + "_" + uuid.v4();
    var cNameRaw = req.connection.remoteAddress;
    var cName1 = cNameRaw.replace(/:/g, 'c'); // replace all colons with c
    var cName2 = cName1.replace(/\./g, 'd'); // replace all dots with d
    winston.log('debug',"New client name is " + cName2);
    return cName2;
}

 /*
  * Determine whether a given cookie already exists in the request header.
  * This is used because the clientName is returned to the web client as a cookie.
  */
clientMgr.cookieExists = function(req, cookieName) {
    if (req.cookies[cookieName] && req.cookies[cookieName] !== "null" && req.cookies[cookieName] !== "undefined") {
        return true;
    } else {
        return false;
    }
}

 /*
  * Determine whether or not a given client has had its data structures initialized.
  * Currently this is being done just by checking that the client's name is in the clientName list.
  * To test more exhaustively, other internal data structures could potentially also be queried.
  */
clientMgr.clientInitialized = function(clientName) {
    // Find the index within clientList for the given clientName.
    var indx = -1;
    for (var i=0; i<clientMgr.clientList.length; i++)
    {
        if (clientMgr.clientList[i] === clientName) {
            indx = i;
            break;
        }
    }
    if (indx > -1)
        return true;
    else
        return false;
}

clientMgr.initializeClient = function(clientName) {
    winston.info("Entering initializeClient() with " + clientName);

    MySQLmgr.initializeClient(clientName)
        .then(function(result) {
            clientMgr.clientList.push(clientName);
            clientMgr.executionList[clientName] = [];

            clientMgr.lastTouched[clientName] = Date.now();
            MySQLmgr.touchClient(clientName)
                .catch(function(err) {
                    winston.error('Error in touchClient: ' + err);
                });

            // Initialize or reset the response-expected counter.
            clientMgr.responsesExpected[clientName] = 0;
        })
        .catch(function(err) {
            winston.error('Error initializing client ' + clientName + ": " + err);
        })
};

clientMgr.initializeExecutionList = function(clientName) {
    winston.debug("top of clientMgr.initializeExecutionList()");
    clientMgr.executionList[clientName] = [];
    if (MySQLmgr.connection == null) {
        winston.debug("clientMgr.initializeExecutionList() setting timeout");
        // Wait a short delay and try again.
        return setTimeout(clientMgr.initializeExecutionList, 1000, clientName);
    } else {
        winston.debug("clientMgr.initializeExecutionList() querying execution list");
        MySQLmgr.queryExecutionList(clientName, function(error, results) {
            winston.debug("On startup, the execution list from the DB is " + JSON.stringify(results));
	        if (error) {
		        winston.error("Error is " + JSON.stringify(error));
	        }
            if (results) {
                for (var i = 0; i < results.length; i++) {
                    var restored_json = JSON.parse(results[i].message_json);
                    winston.debug("On startup, one execution list from DB is: " + JSON.stringify(restored_json));
                    clientMgr.executionList[clientName].push(restored_json);
                }
            }
        })
            .catch(function(err) {
                winston.debug('Error querying execution list: ' + err);
            });
    }
}

 /*
  * Add a new entry to the client's execution list.
  */
clientMgr.addRequestToList = function(clientName, msgObj) {
    winston.debug("At top of addRequestToList, msgObj is " + JSON.stringify(msgObj));
    // Given the message, find its analytic.
    var analyticName = msgObj.analyticId.name;
    // Then find the parameters for that analytic.
    var localURI = 'http://' + os.hostname() + ':' + PORT + '/v1/analytics/' + analyticName + '/parameters';  // os.hostname() returns strings like 1a0412d09298 on Docker for Mac
    winston.debug('localURI is ' + localURI);
    rp({uri: localURI, json:true})
        .then(function(paramStruct) {
            winston.debug("analyticName is " + analyticName + " and paramStruct is " + JSON.stringify(paramStruct));
            var paramData = paramStruct[analyticName];
            winston.debug("addRequestToList, analyticName is " + analyticName + " with paramData " + JSON.stringify(paramData));
            if (paramData === undefined) {
              winston.error('Parameter description for ' + analyticName + ' is not defined.');
              return;
            }
            // Then determine whether there is a series.
            var numInputSeries = 0;
            var inputSeriesName = null;
            for (var param in paramData) {
                winston.debug("Inner loop with " + param + " with structure " + JSON.stringify(paramData[param]));
                if (paramData[param].type === "series") {
                    winston.debug("Found an input series: " + param + " with value " + msgObj.context[param]);
                    numInputSeries++;
                    inputSeriesName = msgObj.context[param];
                }
            }
            winston.debug("numInputSeries is " + numInputSeries, ", inputSeriesName is " + inputSeriesName);
            // If there is no series, the input field remains ''.
            // If there is one series, that is THE single series input.
            // If there are more than one series, for now, one is arbitrary displayed.
            if (numInputSeries > 1) {
                winston.info("More than one input series, displaying just one in the Execution List.")
            }
            // Create the details structure from the input data.
            var detailStruct = [];
            for (var element in msgObj.context) {
                var newObj = {
                    "source" : "context",
                    "name"   : element,
                    "value"  : msgObj.context[element]
                }
                detailStruct.push(newObj);
            }
            var reqTime = new Date();
            var reqTimeFormat = dateformat('MM/dd/yy hh:mm:ss', reqTime);
            winston.debug("reqTimeFormat is " + reqTimeFormat);
             var newElement = {
                executionId: msgObj.header.executionId,
                analyticName: analyticName,
                input : inputSeriesName,
                resultSeries : "unknown",
                result : {},
                details: detailStruct,
                status : "pending",
                requestTime : reqTime.getTime(),
                requestTimeFormatted : reqTimeFormat,
                responseTime : "unknown"
            };
             winston.debug("newElement is " + JSON.stringify(newElement));
            var tmpList = clientMgr.executionList[clientName];
            //tmpList.unshift(newElement);
            tmpList.unshift(newElement);
            clientMgr.executionList[clientName] = tmpList;
	    winston.debug("clientName="+clientName);
	    winston.debug("tmpList="+JSON.stringify(tmpList));
            //  Write the execution list to the database.
            MySQLmgr.insertExecutionItem(newElement, clientName)
                .catch(function(err) {
                   winston.error('Error inserting execution item in database: ' + err);
                });
            winston.debug("At bottom of addRequestToList, clientMgr.executionList[" + clientName + "] is " + JSON.stringify(clientMgr.executionList[clientName]));
        })
        .catch(function(err) {
            winston.error("Error getting parameters in /v1/analytics/" + analyticName + ": " + err);
            return;
        })
}

 /*
  * Update the status of the client's AMQP execution list after receiving an AMQP response.
  */
clientMgr.addResponseToList = function(clientName, msgObj) {
    winston.debug("addResponseToList, clientName is " + clientName + ", received msgObj: " + JSON.stringify(msgObj));
    var execId = msgObj.header.executionId;
    winston.debug("execId is " + execId);
    // Find the appropriate entry in the executionList.  Make a copy of it and delete it.
    var i = indexOfRequestId(clientName, execId);
    if (i === -1) winston.info("addResponseToList received response for unknown request");
    else {
        // Update the status and result of the copy.
        var resp = clientMgr.executionList[clientName][i];
        // Given the response, find its analytic, then the output spec for that analytic, and determine whether there is a series.
        var analyticName = resp.analyticName;
        winston.debug("addResponseToList, analyticName is " + analyticName);
        // Find the parameters for that analytic.
        var localURI = 'http://' + os.hostname() + ':' + PORT + '/v1/analytics/' + analyticName + '/results';
        winston.debug('localURI is ' + localURI);
        rp({uri: localURI, json:true})
            .then(function(resStruct) {
                var resData = resStruct[analyticName];
                // Determine whether there is a series.
                var numResultSeries = 0;
                var resultSeriesName = null;
                for (var res in resData) {
                    if (resData[res].type === "series") {
                        winston.debug("Found a result series: " + res + " with value " + msgObj.result[res]);
                        numResultSeries++;
                        resultSeriesName = msgObj.result[res];
                    }
                }
                winston.debug("numResultSeries is " + numResultSeries, ", resultSeriesName is " + resultSeriesName);
                // If there is no series, the input field remains ''.
                // If there is one series, that is THE single series input.
                // If there are more than one series, for now, one is arbitrary displayed.
                if (numResultSeries > 1) {
                    winston.debug("More than one result series, displaying just one in the Execution List.")
                }

                // If there is no series, set the result field to ''.
                // If there is one series, use that as the result.
                // If there are more than one series, use any of them?
                resp.status = msgObj.status;
                resp.resultSeries = resultSeriesName;
                resp.result = msgObj.result;
                // Fill out the details section with the result data.
                var detailStruct = resp.details;
                for (var element in msgObj.result) {
                    var newObj = {
                        "source" : "result",
                        "name"   : element,
                        "value"  : msgObj.result[element]
                    }
                    detailStruct.push(newObj);
                }
                resp.details = detailStruct;
                // For each element of msgObj.result...
                var reqTime = new Date();
                resp.responseTime = reqTime.getTime();

                //  Write the execution list to the database.
                MySQLmgr.updateExecutionItem(resp, clientName)
                    .catch(function(err) {
                       winston.error('Error updating execution item in database: ' + err);
                    });

                // Replace the copy back into the executionList.
                clientMgr.executionList[clientName].splice(i, 1, resp);
                winston.debug('clientMgr.addResponseToList, executionList is ' + JSON.stringify(clientMgr.executionList[clientName]));
            })
            .catch(function(err) {
                winston.error("Error getting results structure in /v1/analytics/" + analyticName + ": " + err);
                return;
            })
    }
}


module.exports = clientMgr;

///////////////////////
// INTERNAL FUNCTIONS
///////////////////////

/*
 * This should be called when we are completely finished with a client (or it has timed out).
 * Delete the channel and response queue for the client, and also delete the internal data structure entries.
 */
function cleanUpClient(clientName) {
    //console.log("cleanupClient chan="+chan);
    // Delete the queue and the channel.
    // var chan = clientMgr.AMQPchannel[clientName];
    // chan.deleteQueue(qName, function( err, ok) {
    //     if (err) {
    //         console.error("[AMQP] deleteQueue error", err.message);
    //     }
    // })
    // chan.close();
    // Remove client from all of these: var clientList, responseQueue, executionList, AMQPchannel, lastTouched, responsesExpected.
    if (clientName in clientMgr.executionList) {
        delete clientMgr.executionList[clientName];
    } else {
        winston.error("Error in cleanUpClient, executionList expected to exist for " + clientName + " but does not.");
    }
    // if (clientName in clientMgr.AMQPchannel) {
    //     delete clientMgr.AMQPchannel[clientName];
    // } else {
    //     winston.error("Error in cleanUpClient, AMQPchannel expected to exist for " + clientName + " but does not.");
    // }
    if (clientName in clientMgr.lastTouched) {
        delete clientMgr.lastTouched[clientName];
    } else {
        winston.error("Error in cleanUpClient, lastTouched expected to exist for " + clientName + " but does not.");
    }
    if (clientName in clientMgr.responsesExpected) {
        delete clientMgr.responsesExpected[clientName];
    } else {
        winston.error("Error in cleanUpClient, responsesExpected expected to exist for " + clientName + " but does not.");
    }
    var index = clientMgr.clientList.indexOf(clientName);
    if (index > -1) {
        clientMgr.clientList.splice(index, 1);
    } else {
        winston.error("Error in cleanUpClient, clientList " + clientMgr.clientList + " expected to contain " + clientName + " but does not.");
    }

    MySQLmgr.deleteClient(clientName)
        .catch(function(result) {
            winston.error("Error deleting client: " + clientName);
        });
}

/*
 * Rules for timing out a client.  This function should be called periodically to determine whether any clients
 * should be deleted.
 * Iterate through all the clients in the clientList.  For any where responsesExpected is zero
 * and time since lastTouched is > queueTimeoutShort, clean up the client.
 */
function cleanUnusedQueues() {
    // Make a copy of the clientList, because the loop in this function may change the list as it iterates.
    var clientListCopy = clientMgr.clientList;
    var timeNow = Date.now();
    for (var i=0; i < clientListCopy.length; i++) {
        var cName = clientListCopy[i];
        var respExp = clientMgr.responsesExpected[cName];
        winston.debug("Running cleanUnusedQueues: " + cName + " is expecting " + respExp + " responses and has not been touched for " + (timeNow - clientMgr.lastTouched[cName]) / 1000.0 + " seconds.");
        if (respExp < 0) {
            winston.error("cleanUnusedQueues:  responsesExpected for " + cName + " is " + respExp + " but should never be less than zero.");
        } else if (respExp == 0) {
            if (timeNow - clientMgr.lastTouched[cName] > queueTimeoutShort) {
                // Clean up this client.
                winston.info("Client " + cName + " has timed out and is being cleaned up.");
                cleanUpClient(cName);
            }
        }
    }
}

/*
 * Rules for timing out a dead client.  This function should be called periodically to determine whether any clients
 * are dead and should be deleted even though responses are still expected.
 * Iterate through all the clients in the clientList.
 * For any where lastTouched is > queueTimeoutLong, clean up the client, but log an error if there are
 * still responses expected.
 *
 * Update 4/26/17.  There used to be response queue per client (browser), but now there is a single response queue.
 *                  This logic to clean up queues is therefore no longer needed.
 *                  We are keeping track of clients, number of responses expected, and time last touched in the database.
 *                  We may not actually need that, although it may be useful for troubleshooting problems.
 */
function cleanDeadQueues() {
    // Make a copy of the clientList, because the loop in this function may change the list as it iterates.
    var clientListCopy = clientMgr.clientList;
    var timeNow = Date.now();
    for (var i=0; i < clientListCopy.length; i++) {
        var cName = clientListCopy[i];
        if (timeNow - clientMgr.lastTouched[cName] > queueTimeoutLong) {
            var respExp = clientMgr.responsesExpected[cName];
            if (respExp > 0) {
                winston.error("cleanDeadQueues:  cleaning up " + cName + " due to long inactivity even though it was still expecting " + respExp + " responses.");
                cleanUpClient(cName);
            } else {
                winston.info("Client " + cName + " has timed out and is being cleaned up.");
                cleanUpClient(cName);
            }
        }
    }
}

/*
 * Periodically check for timed-out and dead clients.
 */
/*
setInterval(cleanUnusedQueues, checkTimeQueues);
setInterval(cleanDeadQueues,   checkTimeQueues);
*/

/*
 * Find the index of a given request ID (reqId) in the execution list, to appropriately match a response
 * to the request.
 */
function indexOfRequestId(clientName, reqId) {
    // Find the index within exeuctionList for the given executionId.
    var indx = -1;
    for (var i=0; i<clientMgr.executionList[clientName].length; i++)
    {
        if (clientMgr.executionList[clientName][i].executionId === reqId) {
            indx = i;
            break;
        }
    }
    return indx;
}
