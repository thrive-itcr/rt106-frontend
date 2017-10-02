const numSeconds = 500;  // Check health every 5 minutes.  The period can be made shorter.
const PORT = 8106;  // MUST BE THE SAME AS rt106-server.js.

const os      = require('os'); // Used to get the hostname.
const rp      = require('request-promise');
const winston = require('winston');

const MySQLmgr = require('./MySQLmgr');   // module for managing MySQL interactions.

function scanAnalyticCatalog(rescan = true) {
    winston.debug("top of scanAnalyticsCatalog()");
    // Get the list of all analytics.
    var uristring = 'http://' + os.hostname() + ':' + PORT + '/v1/analytics';
    winston.debug('uristring is ' + uristring);

    // schedule the next scan now so we can return the promise from this scan
    if (rescan) {
      setTimeout(scanAnalyticCatalog, numSeconds*1000);
    }

    return rp({uri: uristring, json:true})
      .then(function(result) {
        winston.debug("scanAnalyticsCatalog, /v1/analytics returns: " + JSON.stringify(result));
        var promises = [];
        for (var analytic in result) {
          winston.debug("scanAnalyticCatalog, analytic is " + analytic);
          var uristring2 = 'http://consul:8500/v1/catalog/service/' + analytic;
          winston.debug('uristring2 is ' + uristring2);
          var p = rp({uri: uristring2, json:true})
            .then(function(result) {
              // For each analytic, get the ServiceAddress and ServicePort.
              winston.debug("scanAnalyticsCatalog, /v1/catalog/service/" + analytic + " returns: " + JSON.stringify(result));
              var sName    = result[0].ServiceName;
              winston.debug("scanAnalyticsCatalog: " + sName);
              var sAddress = result[0].ServiceAddress;
              var sPort    = result[0].ServicePort;
              var sURL = "http://" + sAddress + ":" + sPort;
              // Match the analytic from the catalog with database entries.
              MySQLmgr.analyticHealthEntries(sName, sURL, function(error, results) {
                //    If already there, no action needed.
                //    NOTE:  There should not be more than 1 entry returned, because name+URL is the primary key.
                //    If not there, add it.
                if (results.length == 0) {
                  winston.debug("scanAnalyticsCatalog, adding " + sName);
                  var pp = MySQLmgr.analyticHealthEntryAdd(sName, sURL)
                  .catch(function(err) {
                    winston.error('Error in MySQLmgr.analyticHealthEntryAdd: ' + err);
                  });
                  promises.push(pp);
                } else if (results.length > 0) {
                  winston.debug("scanAnalyticsCatalog, " + sName + " already in list.");
                }

                // Can also check on whether any analytics in the database are not reported from the catalog.
                //    That should be reported the first time (but not over and over).
                //    Perhaps once reported the database entry should be removed.
                //    In other words, an analytic has gone away, that has been reported, there is no further need to track it?
              })
              .catch(function(err) {
                winston.error('Error in MySQLmgr.analyticHealthEntries: ' + err);
              });
            })
            .catch(function(err) {
              winston.error("/v1/analytics/analytic returned an error.", err.data);
            });
        promises.push(p);
        }
        return Promise.all(promises);
      })
      .catch(function(err) {
          winston.error("/v1/analytics returned an error.", err.data);
      });
}
setTimeout(scanAnalyticCatalog, numSeconds*1000);


function checkHealth(rescan = true) {
  // schedule the next check now so we can return a promise below
  if (rescan) {
    setTimeout(checkHealth, numSeconds*1000);
  }

  return MySQLmgr.getHealthList(function(error, results) {
    //winston.debug("From checkHealth: " + JSON.stringify(results));
    var promises = [];
    results.forEach(function(service, index) {
      winston.debug("checkHealth examining " + service.name + " at " + service.URL);
      var p = rp({uri: service.URL, timeout: 5000})
      .then(function(health) {
        winston.debug("checkHealth(): good health for " + service.URL);
        // Update database.
        var pp = MySQLmgr.updateHealth(service.name, Date.now(), 200, health)
        .catch(function(err) {
          winston.error('Error in MySQLmgr.updateHealth: ' + err);
        });
        promises.push(pp);
      })
      .catch(function(err) {
        winston.debug("checkHealth(): bad health for " + service.URL);
        winston.error("Error in checkHealth(): " + err);
        // Update database.
        var pp = MySQLmgr.updateHealth(service.name, Date.now(), 500, err)
        .catch(function(err) {
          winston.error('Error in MySQLmgr.updateHealth: ' + err);
        });
        promises.push(pp);
      });
      promises.push(p);
    });
    return Promise.all(promises);
  })
  .catch(function(err) {
    winston.error('Error in MySQLmgr.getHealthList: ' + err);
  })
}
setTimeout(checkHealth, numSeconds*1000);

module.exports = {scanAnalyticCatalog: scanAnalyticCatalog, checkHealth: checkHealth};
