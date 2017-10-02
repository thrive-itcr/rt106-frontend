const mysql = require('mysql');
const winston = require('winston');

var MySQLmgr = {};

MySQLmgr.connection = null;

// MySQLmgr.initMySQL does not alarm failures, which could be due to start-up sequence.
MySQLmgr.initMySQL = function () {
    winston.info("At top of initMySQL()");
    // Initialize MySQL client.
    var connection = mysql.createConnection({
        host: 'mysql',
        user: 'root',
        password: 'rt106mysql',
        database: 'rt106db'
    });
    connection.connect(function (err) {
        if (err) {
	        winston.error('MySQL error connecting: ' + err.stack);
            return setTimeout(MySQLmgr.initMySQL, 5000); // Try again to connect.
        } else {
            winston.info("MySQL connection established with connection id " + connection.threadId);
        }
    });
    MySQLmgr.connection = connection;
    // Clear out the client_info table.  This is for session information, and should be started empty for each session.
    MySQLmgr.clearClients().
        catch(function(err) {
            winston.error("Error clearing clients");
    });
}

// Test error handling.
MySQLmgr.deliberateError = function(callback) {
    return new Promise(function(resolve, reject) {
        var qq = "SELECT * FROM nonexistant_table;";
        winston.info("MySQLmgr.deliberateError, qq is " + JSON.stringify(qq));
        MySQLmgr.connection.query(qq, function(error, results, fields) {
            winston.info("MySQLmgr.deliberateError, error is " + error);
            if (error) {
                winston.error("Error in MySQLmgr.deliberateError(): " + error);
                return reject(error);
            }
            else {
                callback(error, results);
                return resolve(results);
            }
        });
    })
}
MySQLmgr.shouldSucceed = function(callback) {
    return new Promise(function(resolve, reject) {
        var qq = "SELECT * FROM service_health;";
        winston.info("MySQLmgr.shouldSucceed, qq is " + JSON.stringify(qq));
        MySQLmgr.connection.query(qq, function(error, results, fields) {
            winston.info("MySQLmgr.shouldSucceed, error is " + error);
            if (error) {
                winston.error("Error in MySQLmgr.shouldSucceed(): " + error);
                return reject(error);
            }
            else {
                callback(error, results);
                return resolve(results);
            }
        });
    })
}



// Write request message to the database.
MySQLmgr.insertRequestMessage = function(message, rabbitHeader) {
    //winston.log("MySQLmgr.insertRequestMessage, message is " + JSON.stringify(message) + ", rabbitHeader is " + JSON.stringify(rabbitHeader));
    //winston.log("MySQLmgr.insertRequestMessage, rabbitHeader.appId is " + JSON.stringify(rabbitHeader.appId));
    return new Promise(function(resolve, reject) {
        var user = rabbitHeader.appId;
        //winston.log("MySQL.insertRequestMessage, user is " + user);
        var q = 'INSERT INTO execution_log (start_time, user, message_type, message_header, message_json) VALUES(' +
            "'" + message.header.creationTime + "','" + user + "','request','" +
            JSON.stringify(rabbitHeader) + "','" + JSON.stringify(message) + "');";
        winston.debug("MySQLmgr.insertRequestMessage, MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.insertRequestMessage(): " + error);
                return reject(error);
            }
            else {
                winston.debug('Inserted row ' + results.insertId);
                return resolve(results)
            }
        });
    })
}

// Write response message to the database.
MySQLmgr.insertResponseMessage = function(message, clientName) {
    return new Promise(function(resolve, reject) {
        var responseMessage = JSON.parse(message);
        winston.debug("responseMessage is " + JSON.stringify(responseMessage));
        var q = "INSERT INTO execution_log (end_time, user, message_type, message_json) VALUES('" + responseMessage.header.creationTime +
            "','" + clientName + "'," + "'response','" + JSON.stringify(responseMessage) + "');";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.insertResponseMessage(): " + error);
                return reject(error);
            }
            else {
                winston.debug('Inserted row ' + results.insertId);
                return resolve(results);
            }
        });

    })
}

// Write the execution list entry to the database.
MySQLmgr.insertExecutionItem = function(request, clientName) {
    return new Promise(function(resolve, reject) {
        winston.debug("insertExecutionItem, request is " + JSON.stringify(request));
        var q = "INSERT INTO execution_log (start_time, user, message_type, message_json) VALUES('" + request.requestTime +
            "','" + clientName + "'," + "'execution','" + JSON.stringify(request) + "');";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.insertExecutionItem(): " + error);
                return reject(error);
            }
            else {
                winston.debug('Inserted row ' + results.insertId);
                return resolve(results);
            }
        });
    })
}

// Update an existing execution list entry in the database.
MySQLmgr.updateExecutionItem = function(response, clientName) {
    return new Promise(function(resolve, reject) {
        winston.debug("updateExecutionItem, response is " + JSON.stringify(response));
        var q = "UPDATE execution_log SET end_time = '" + response.responseTime + "', message_json = '" + JSON.stringify(response) + "' WHERE start_time = '" + response.requestTime +
            "' AND user = '" + clientName + "' AND message_type = 'execution';";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.updateExecutionItem(): " + error);
                return reject(error);
            }
            else {
                winston.debug('Inserted row ' + results.insertId);
                return resolve(results);
            }
        });
    })
}

// Get the execution list from the database for this client.
MySQLmgr.queryExecutionList = function(clientName, callback) {
    return new Promise(function(resolve, reject) {
        var qq = "SELECT message_json FROM execution_log WHERE user = '" + clientName + "' AND message_type = 'execution' ORDER BY start_time;";
        winston.debug("queryExecutionList, qq is " + JSON.stringify(qq));
        MySQLmgr.connection.query(qq, function(error, results, fields) {
            winston.debug("queryExecutionList, error is " + error);
            if (error) {
                winston.error("Error in MySQLmgr.queryExecutionList(): " + error);
                return reject(error);
            }
            else {
                callback(error, results);
                return resolve(results);
            }
        });
    })
}


// Get the clientName for this executionId
MySQLmgr.queryClientName = function(executionId, callback) {
    return new Promise(function(resolve, reject) {
        var qq = "SELECT user, message_json FROM execution_log WHERE JSON_EXTRACT(message_json,\"$.header.executionId\") = '" + executionId + "';";
        winston.debug("queryClientName, qq is " + qq);
        MySQLmgr.connection.query(qq, function(error, results, fields) {
            if (error) {
                winston.error("Error in MySQLmgr.queryClientName(): " + error);
                return reject(error);
            }
            else {
                callback(error, results);
                return resolve(results);
            }
        });
    })
}


// Write an analytic evaluation entry to the database.
MySQLmgr.insertAnalyticEvaluation = function(request) {
    return new Promise(function(resolve, reject) {
        winston.debug("insertAnalyticEvaluation, request is " + JSON.stringify(request));
        var q = "INSERT INTO analytic_evaluation (executionId, user_evaluation, user_comments)" +
            " VALUES('" + request.executionId + "','" + request.evaluation + "','" + request.comments + "');";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.insertExecutionItem(): " + error);
                return reject(error);
            }
            else {
                winston.debug('Inserted row ' + results.insertId);
                return resolve(results);
            }
        });
    })
}

// Initialize and maintain client info in the database.
MySQLmgr.initializeClient = function(clientName) {
    return new Promise(function(resolve, reject) {
        var q = "INSERT INTO client_info (client_name, responses_expected, last_touched) VALUES('" + clientName + "',0," + Date.now() + ");";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.initializeClient(): " + error);
                return reject(error);
            }
            else {
                winston.debug('Inserted row ' + results.insertId);
                return resolve(results);
            }
        });
    })
}

MySQLmgr.getClientList = function(callback) {
    return new Promise(function(resolve, reject) {
        var qq = "SELECT client_name FROM client_info;";
        winston.debug("getClientList, qq is " + JSON.stringify(qq));
        MySQLmgr.connection.query(qq, function(error, results, fields) {
            winston.debug("getClientList, error is " + error);
            if (error) {
                winston.error("Error in MySQLmgr.getClientList(): " + error);
                return reject(error);
            }
            else {
                callback(error, results);
                return resolve(results);
            }
        });
    })
}

MySQLmgr.deleteClient = function(clientName) {
    return new Promise(function(resolve, reject) {
        var q = "DELETE FROM client_list WHERE client_name = '" + clientName + "';";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.deleteClient(): " + error);
                return reject(error);
            }
            else {
                return resolve(results);
            }
        });
    })
}

MySQLmgr.clearClients = function() {
    return new Promise(function(resolve, reject) {
        var q = "DELETE FROM client_info;";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.clearClients(): " + error);
                return reject(error);
            }
            else {
                return resolve(results);
            }
        });
    })
}

MySQLmgr.incrementResponsesExpected = function(clientName) {
    return new Promise(function(resolve, reject) {
        var q = "UPDATE client_info SET responses_expected = responses_expected + 1 WHERE client_name = '" + clientName + "';";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.incrementResponsesExpected(): " + error);
                return reject(error);
            }
            else {
                return resolve(results);
            }
        });
    })
}

MySQLmgr.decrementResponsesExpected = function(clientName) {
    return new Promise(function(resolve, reject) {
        var q = "UPDATE client_info SET responses_expected = responses_expected - 1 WHERE client_name = '" + clientName + "';";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.decrementResponsesExpected(): " + error);
                return reject(error);
            }
            else {
                return resolve(results);
            }
        });
    })
}

MySQLmgr.getResponsesExpected = function(clientName, callback) {
    return new Promise(function(resolve, reject) {
        var qq = "SELECT responses_selected FROM client_info WHERE client_name = '" + clientName + "';";
        winston.debug("getResponsesExpected, qq is " + JSON.stringify(qq));
        MySQLmgr.connection.query(qq, function(error, results, fields) {
            winston.debug("getResponsesExpected, error is " + error);
            if (error) {
                winston.error("Error in MySQLmgr.getResponsesExpected(): " + error);
                return reject(error);
            }
            else {
                callback(error, results, clientName);
                return resolve(results);
            }
        });
    })
}

MySQLmgr.touchClient = function(clientName) {
    return new Promise(function(resolve, reject) {
        var q = "UPDATE client_info SET last_touched = " + Date.now() + " WHERE client_name = '" + clientName + "';";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.touchClient(): " + error);
                return reject(error);
            }
            else {
                return resolve(results);
            }
        });
    })
}

MySQLmgr.getLastTouched = function(clientName, callback) {
    return new Promise(function(resolve, reject) {
        var qq = "SELECT last_touched FROM client_info WHERE client_name = '" + clientName + "';";
        winston.debug("getLastTouched, qq is " + JSON.stringify(qq));
        MySQLmgr.connection.query(qq, function(error, results, fields) {
            winston.debug("getLastTouched, error is " + error);
            if (error) {
                winston.error("Error in MySQLmgr.getLastTouched(): " + error);
                return reject(error);
            }
            else {
                callback(error, results, clientName);
                return resolve(results);
            }
        });
    });
}

MySQLmgr.clearAnalytics = function() {
    return new Promise(function(resolve, reject) {
        var q = "DELETE FROM service_health WHERE type = 'analytic';";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.clearAnalytics(): " + error);
                return reject(error);
            }
            else {
                return resolve(results);
            }
        });
    })
}

MySQLmgr.getHealthList = function(callback) {
    return new Promise(function(resolve, reject) {
        var q = "SELECT * FROM service_health;";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.getHealthList(): " + error);
                return reject(error);
            }
            else {
                callback(error, results);
                return resolve(results);
            }
        });
    })
}

MySQLmgr.updateHealth = function(name, lastChecked, statusCode, statusString) {
    return new Promise(function(resolve, reject) {
        // statusString may in some cases be very long.  If this happens, truncate it to fit in the database field.
        var stringMax = 254;
        if (statusString.length > stringMax) {
            statusString = statusString.substring(0,stringMax);
        }
        var q = "UPDATE service_health SET last_checked = '" + lastChecked + "', status_code = '" + statusCode + "', status_string = '" + statusString + "' WHERE name = '" + name + "';";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.updateHealth(): " + error);
                return reject(error);
            }
            else {
                return resolve(results);
            }
        });
    })
}

MySQLmgr.queryBadServices = function() {
    return new Promise(function(resolve, reject) {
        var q = "SELECT name FROM service_health WHERE status_code != '200';";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.getHealthList(): " + error);
                return reject(error);
            }
            else {
                return resolve(results);
            }
        });
    })
}

MySQLmgr.analyticHealthEntries = function(analyticName, analyticURL, callback) {
    return new Promise(function(resolve, reject) {
        var q = "SELECT * FROM service_health WHERE name = '" + analyticName + "' AND URL = '" + analyticURL + "' AND type = 'analytic';";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.analyticHealthEntries(): " + error);
                return reject(error);
            }
            else {
                callback(error, results);
                return resolve(results);
            }
        });
    })
}

MySQLmgr.analyticHealthEntryAdd = function(analyticName, analyticURL) {
    return new Promise(function(resolve, reject) {
        var q = "INSERT INTO service_health (name, URL, type) VALUES ('" + analyticName + "', '" + analyticURL + "', 'analytic');";
        winston.debug("MySQL query: " + q);
        MySQLmgr.connection.query(q, function (error, results) {
            if (error) {
                winston.error("Error in MySQLmgr.analyticHealthEntryAdd(): " + error);
                return reject(error);
            }
            else {
                return resolve(results);
            }
        });
    })
}


module.exports = MySQLmgr;
