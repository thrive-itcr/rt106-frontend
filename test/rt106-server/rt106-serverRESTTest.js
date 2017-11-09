// Copyright (c) General Electric Company, 2017.  All rights reserved.

var chai = require('chai');
var expect = chai.expect;

var chaiHttp = require('chai-http');
chai.use(chaiHttp);

var uuid = require('uuid');

var rt106 = require('../../rt106-server/rt106-server');
var rt106server = rt106.rt106server;

describe("rt106-server", function() {
  describe("REST endpoints", function() {
    describe("system", function() {
      describe("GET /v1/health/bad", function() {
        it('should return an array', function(done) {
          chai.request(rt106server)
            .get('/v1/health/bad')
            .end(function(err, res) {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.an('array');
              done();
            });
        });
      });
    });
    describe("clients", function() {
      describe("GET /v1/clients", function() {
        it('should return an array', function(done) {
          chai.request(rt106server)
            .get('/v1/clients')
            .end(function(err, res) {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.an('array');
              done();
            });
        });
      });
    });
    describe("cookies", function() {
      describe("GET /v1/setCookies", function() {
        it('should return a string', function(done) {
          chai.request(rt106server)
            .get('/v1/setCookies')
            .end(function(err, res) {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.an('string');
              done();
            });
        });
      });
    });
    describe("mysql", function() {
      describe("GET /v1/succeed/mysql", function() {
        it('should return 200', function(done) {
          chai.request(rt106server)
            .get('/v1/succeed/mysql')
            .end(function(err, res) {
              expect(res).to.have.status(200);
              done();
            });
        });
      });
      describe("GET /v1/fail/mysql", function() {
        it('should return 501', function(done) {
          chai.request(rt106server)
            .get('/v1/fail/mysql')
            .end(function(err, res) {
              expect(res).to.have.status(501);
              done();
            });
        });
      });    
    });
    describe("analytics", function() {
      describe("GET /v1/analytics", function() {
        it('should return an object', function(done) {
          chai.request(rt106server)
            .get('/v1/analytics')
            .end(function(err, res) {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.an('object');
              done();
            });
        });
      });
      describe("algorithm-template--v1_0_0", function() {
        describe("GET /v1/analytics/algorithm-template--v1_0_0", function() {
          it('should return an object', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/algorithm-template--v1_0_0')
              .end(function(err, res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                expect(res.body).to.include({'name': 'algorithm-template', 'version': 'v1_0_0'});
                done();
              });
          });
        });
        describe("GET /v1/analytics/algorithm-template--v1_0_0/queue", function() {
          it('should return an object', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/algorithm-template--v1_0_0/queue')
              .end(function(err, res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                done();
              });
          });
        });
        describe("GET /v1/analytics/algorithm-template--v1_0_0/parameters", function() {
          it('should return an object', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/algorithm-template--v1_0_0/parameters')
              .end(function(err, res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                done();
              });
          });
        });
        describe("GET /v1/analytics/algorithm-template--v1_0_0/results", function() {
          it('should return an object', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/algorithm-template--v1_0_0/results')
              .end(function(err, res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                done();
              });
          });
        });
        describe("GET /v1/analytics/algorithm-template--v1_0_0/results/display", function() {
          it('should return an object', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/algorithm-template--v1_0_0/results/display')
              .end(function(err, res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                done();
              });
          });
        });
        describe("GET /v1/analytics/algorithm-template--v1_0_0/classification", function() {
          it('should return a object', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/algorithm-template--v1_0_0/classification')
              .end(function(err, res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                done();
              });
          });
        });
        describe("GET /v1/analytics/algorithm-template--v1_0_0/documentation", function() {
          it('should return a object', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/algorithm-template--v1_0_0/documentation')
              .end(function(err, res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                done();
              });
          });
        });
        describe("GET /v1/analytics/algorithm-template--v1_0_0/api", function() {
          it('should return an object', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/algorithm-template--v1_0_0/api')
              .end(function(err, res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                done();
              });
          });
        });
      });

      describe("missing-algorithm--v1_0_0", function() {
        describe("GET /v1/analytics/missing-algorithm--v1_0_0", function() {
          it('should return an error', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/missing-algorithm--v1_0_0')
              .end(function(err, res) {
                expect(res).to.have.status(404);
                expect(res).to.be.json;
                expect(res.body).to.be.a('string');
                expect(res.body).equals("Analytic 'missing-algorithm--v1_0_0' is not available.");
                done();
              });
          });
        });
        describe("GET /v1/analytics/missing-algorithm--v1_0_0/queue", function() {
          it('should return an error', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/missing-algorithm--v1_0_0/queue')
              .end(function(err, res) {
                expect(res).to.have.status(404);
                expect(res).to.be.json;
                expect(res.body).to.be.a('string');
                expect(res.body).equals("Analytic 'missing-algorithm--v1_0_0' is not available.");
                done();
              });
          });
        });
        describe("GET /v1/analytics/missing-algorithm--v1_0_0/parameters", function() {
          it('should return an error', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/missing-algorithm--v1_0_0/parameters')
              .end(function(err, res) {
                expect(res).to.have.status(404);
                expect(res).to.be.json;
                expect(res.body).to.be.a('string');
                expect(res.body).equals("Analytic 'missing-algorithm--v1_0_0' is not available.");
                done();
              });
          });
        });
        describe("GET /v1/analytics/missing-algorithm--v1_0_0/results", function() {
          it('should return an error', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/missing-algorithm--v1_0_0/results')
              .end(function(err, res) {
                expect(res).to.have.status(404);
                expect(res).to.be.json;
                expect(res.body).to.be.a('string');
                expect(res.body).equals("Analytic 'missing-algorithm--v1_0_0' is not available.");
                done();
              });
          });
        });
        describe("GET /v1/analytics/missing-algorithm--v1_0_0/results/display", function() {
          it('should return an error', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/missing-algorithm--v1_0_0/results/display')
              .end(function(err, res) {
                expect(res).to.have.status(404);
                expect(res).to.be.json;
                expect(res.body).to.be.a('string');
                expect(res.body).equals("Analytic 'missing-algorithm--v1_0_0' is not available.");
                done();
              });
          });
        });
        describe("GET /v1/analytics/missing-algorithm--v1_0_0/classification", function() {
          it('should return an error', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/missing-algorithm--v1_0_0/classification')
              .end(function(err, res) {
                expect(res).to.have.status(404);
                expect(res).to.be.json;
                expect(res.body).to.be.a('string');
                expect(res.body).equals("Analytic 'missing-algorithm--v1_0_0' is not available.");
                done();
              });
          });
        });
        describe("GET /v1/analytics/missing-algorithm--v1_0_0/documentation", function() {
          it('should return an error', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/missing-algorithm--v1_0_0/documentation')
              .end(function(err, res) {
                expect(res).to.have.status(404);
                expect(res).to.be.json;
                expect(res.body).to.be.an('string');
                expect(res.body).equals("Analytic 'missing-algorithm--v1_0_0' is not available.");
                done();
              });
          });
        });
        describe("GET /v1/analytics/missing-algorithm--v1_0_0/api", function() {
          it('should return an error', function(done) {
            chai.request(rt106server)
              .get('/v1/analytics/missing-algorithm--v1_0_0/api')
              .end(function(err, res) {
                expect(res).to.have.status(404);
                expect(res).to.be.json;
                expect(res.body).to.be.a('string');
                expect(res.body).equals("Analytic 'missing-algorithm--v1_0_0' is not available.");
                done();
              });
          });
        });
      });
     });
    describe("evalution", function() {
      describe("POST /v1/analytics/evaluation", function() {
        it('should schedule an execution and return an object', function(done) {
          var data = {
            "executionId": 'someExecID',
            "evaluation": 'Good',
            "comments" : 'some comments'
          };

          chai.request(rt106server)
            .post('/v1/analytics/evaluation')
            .send( data )
            .end(function(err, res) {
              expect(res).to.have.status(200);
              done();
            });
        });
      });  
    });
    // assume the path for the test csv file is /AGA_260_3/021/test/Quant
    describe("convert CSV to json", function() {
      describe("GET v1/dataconvert/csvtojson/v1/pathology/datafile/:slide/:region/:branch/:channel", function() {
        it('should return a json object', function(done) {
          chai.request(rt106server)
            .get('/v1/dataconvert/csvtojson/v1/pathology/datafile/AGA_260_3/021/test/Quant')
            .end(function(err, res) {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.an('object');
              done();
            });
        });
      });
    });
    describe("executions", function() {
      describe("GET /v1/executions", function() {
        it('should return an array', function(done) {
          chai.request(rt106server)
            .get('/v1/executions')
            .end(function(err, res) {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.an('array');
              done();
            });
        });
      });
      describe("GET /v1/queryExecutionList", function() {
        it('should return an array', function(done) {
          chai.request(rt106server)
            .get('/v1/queryExecutionList')
            .end(function(err, res) {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.an('array');
              done();
            });
        });
      });
      describe("POST /v1/execution", function() {
        it('should schedule an execution and return an object', function(done) {
          var data = {
            "analyticId": {
              "name": 'algorithm-template--v1_0_0',
              "version": 'v1.0.0'
            },
            "context": {
              "inputSeries": 'something',
              "threshold": 5,
              "specialVersion": false,
              "seedPoint": [128, 200, 17]
            }
          };

          chai.request(rt106server)
            .post('/v1/execution')
            .send( data )
            .end(function(err, res) {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.a('string');
              done();
            });
        });
      });
    });
    describe("datastore", function() {
      describe("GET /datastore/v1/health", function() {
        it('should return an object', function(done) {
          chai.request(rt106server)
            .get('/datastore/v1/health')
            .end(function(err, res) {
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              expect(res.body).to.be.an('object');
              expect(res.body).to.include({'status': "Data Store is healthy."});
              done();
            });
        });
      });
    });
  });
});
