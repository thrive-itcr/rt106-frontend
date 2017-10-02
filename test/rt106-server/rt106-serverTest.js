var chai = require('chai');
var expect = chai.expect;

var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

var rt106 = require('../../rt106-server/rt106-server');
var rt106server = rt106.rt106server;
var healthMgr = rt106.healthMgr;

describe("rt106-server", function() {
  describe("functions", function() {
    describe("system", function() {
      describe("healthMgr.checkHealth(false)", function() {
        it('should check all services and update database', function(done) {
          var promise = healthMgr.checkHealth(false);
          expect(promise).to.be.fulfilled.and.notify(done);
        });
      });
      describe("healthMgr.scanAnalyticCatalog(false)", function() {
        it('should scan catalog for analytics and update database', function(done) {
          var promise = healthMgr.scanAnalyticCatalog(false);
          expect(promise).to.be.fulfilled.and.notify(done);
        });
      });
    });
  });
});
