// Copyright (c) General Electric Company, 2017.  All rights reserved.

describe('promise chaining', function() {
  it('should propagate rejects', function(done) {
    var p = new Promise(function(resolve, reject) {
      console.log('Calling reject');
      reject('Base rejection');
    });

    var p2 = p.then(function(response) {
      console.log(response + ' 1st then.');
      return response + ' 1st then.';
    }).catch(function(reason) {
      return Promise.reject(reason + ' 1st catch.');
    });

    p2.then(function(response) {
      console.log(response + ' 2nd then.');
      done();
    }).catch(function(reason) {
      console.log(reason + ' 2nd catch.');
      done();
    });
  })
});


describe('rt106DemoRadiologyController', function() {
  beforeEach(module('rt106'));

  var $controller;
  var $httpBackend;
  var $rootScope;
  var $compile;
  var $scope;

  beforeEach(inject(function(_$controller_, _$httpBackend_, _$rootScope_, _$compile_) {
    $controller = _$controller_;
    $httpBackend = _$httpBackend_;
    $rootScope = _$rootScope_;
    $compile = _$compile_;
    $scope = $rootScope.$new();

    $httpBackend.when('GET', 'http://localhost/v1/datastore/patients')
    .respond(200, [ { "birthDate": "unknown",
          "gender": "m/f",
          "id": "pat002",
          "patientName": "pat002"
        },
        {
          "birthDate": "unknown",
          "gender": "m/f",
          "id": "pat001",
          "patientName": "pat001"
        }
      ]);
      $httpBackend.when('GET', 'http://localhost/v1/datastore/pat001/study')
      .respond(200, [{"id": "studyA", "studyDate": "unknown"}]);
      $httpBackend.when('GET', 'http://localhost/v1/datastore/pat001/studyA/series')
      .respond(200, [{"id": "series1", "instanceCount": "unknown", "modality": "unknown"}]);
      $httpBackend.when('GET', 'http://localhost/v1/datastore/series/list/pat001/studyA/series1')
      .respond(200, {'files': ['Image001.dcm', 'Image002.dcm', 'Image003.dcm']});
      $httpBackend.when('GET', 'http://localhost/v1/datastore/instance/pat001/studyA/series1/Image001.dcm')
      .respond(200, []);
      $httpBackend.when('GET', 'http://localhost/v1/datastore/instance/pat001/studyA/series1/Image002.dcm')
      .respond(200, []);
      $httpBackend.when('GET', 'http://localhost/v1/datastore/instance/pat001/studyA/series1/Image003.dcm')
      .respond(200, []);


      $httpBackend.when('GET', 'http://localhost/v1/analytics')
      .respond(200, {"algorithm-template--v1_0_0":["analytic"]});
      $httpBackend.when('GET', 'http://localhost/v1/analytics/algorithm-template--v1_0_0/parameters')
      .respond(200, {"algorithm-template--v1_0_0":{"inputSeries":{"default":"","description":"The series upon which the algorithm acts.","label":"Input Series","type":"series"},"seedPoint":{"default":[0,0,0],"description":"3D coordinates selected from the image.","label":"seed","type":"voxelIndex"},"specialVersion":{"default":"false","description":"Whether to run special version of algorithm.","label":"Special Version","type":"boolean"},"threshold":{"default":0,"description":"This is an example of a parameter.","label":"threshold","type":"number"}}});
      $httpBackend.when('GET', 'http://localhost/v1/analytics/algorithm-template--v1_0_0/results')
      .respond(200, {"algorithm-template--v1_0_0":{"calculatedValue":{"description":"A value calculated by the algorithm.","label":"Calculated Value","type":"number"},"outputSeries":{"description":"The new series the algorithm produces.","label":"Output Series","type":"series"}}});
      $httpBackend.when('GET', 'http://localhost/v1/analytics/algorithm-template--v1_0_0/results/display')
      .respond(200, {"algorithm-template--v1_0_0":{"cells":[{"cellDisplayMode":"background","cellType":"image","column":0,"parameter":"inputSeries","row":0,"source":"context"},{"cellDisplayMode":"background","cellType":"image","column":0,"controls":{"color":"Detection Color: ","opacity":"Detection Opacity: "},"parameter":"outputSeries","properties":{"color":"rgb(144,238,144)","opacity":1},"row":1,"source":"result"}],"grid":{"columns":[1],"rows":[0.5,0.5],"shape":[1,2]}}});
      $httpBackend.when('GET', 'http://localhost/v1/analytics/algorithm-template--v1_0_0/classification')
      .respond(200, {"algorithm-template--v1_0_0":"template/radiology"});

  }));


  describe('initializing', function() {

    // // remove these log lines for real tests
    // var $log;
    // beforeEach(inject(function(_$log_){ $log = _$log_;  }));
    // afterEach(inject(function(){ console.log($log.log.logs);  }));

    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });
    afterEach(function() {
      clock.restore();
    });


    it('should build a list of patients during initialization', function(done) {
      $controller('rt106DemoRadiologyController', { $scope: $scope });
      $httpBackend.flush();

      // does the flush() ensure completion of asynchronous?
      expect($scope.patients).to.be.an('array').to.have.length(2);
      expect($scope.patients).to.all.have.property('id');
      expect($scope.patients).to.all.have.property('patientName');
      expect($scope.patients).to.all.have.property('birthDate');
      expect($scope.patients).to.all.have.property('gender');

      done();
    });

    it ('should build a list of analytics during initialization', function(done) {
      $controller('rt106DemoRadiologyController', { $scope: $scope });
      clock.tick(1000); // scanning for analytics controlled by a timer
      $httpBackend.flush();

      // does the flush() ensure completion of asynchronous?
      expect($scope.algorithms).to.be.an('array');
      expect($scope.algorithms).to.all.have.property('name');
      expect($scope.algorithms).to.all.have.property('enabled');
      expect($scope.algorithms).to.all.have.property('parameters');
      expect($scope.algorithms).to.all.have.property('results');
      expect($scope.algorithms).to.all.have.property('display');
      expect($scope.algorithms).to.all.have.property('classification');

      done();
    });

    // add other tests here for things that should be available after initialization of the controller
  });

  describe('patient list navigation', function() {
    // remove these log lines for real tests
    // var $log;
    // beforeEach(inject(function(_$log_){ $log = _$log_;  }));
    // afterEach(inject(function(){ console.log($log.log.logs);  }));

    it ('click patient should fill in the studies for a patient in the list', function(done) {
      $controller('rt106DemoRadiologyController', { $scope: $scope });
      $httpBackend.flush();

      expect($scope.patients[0]).to.have.property('studies').to.be.an('array').to.be.empty;
      $scope.clickPatient($scope.patients[0], true);
      $httpBackend.flush();
      expect($scope.patients[0]).to.have.property('studies').to.be.an('array').to.not.be.empty;

      done();
    });

    it ('click patient a second time should not change the study list for a patient in the list', function(done) {
      $controller('rt106DemoRadiologyController', { $scope: $scope });
      $httpBackend.flush();

      expect($scope.patients[0]).to.have.property('studies').to.be.an('array').to.be.empty;
      $scope.clickPatient($scope.patients[0], true);
      $httpBackend.flush();
      expect($scope.patients[0]).to.have.property('studies').to.be.an('array').to.have.lengthOf(1);

      // call a second time
      $scope.clickPatient($scope.patients[0], true);
      $httpBackend.flush();
      expect($scope.patients[0]).to.have.property('studies').to.be.an('array').to.have.lengthOf(1);

      done();
    });

    it ('click study should fill in the series for a study for a patient in the list', function(done) {
      $controller('rt106DemoRadiologyController', { $scope: $scope });
      $httpBackend.flush();

      $scope.clickPatient($scope.patients[0], true);
      $httpBackend.flush();
      expect($scope.patients[0].studies[0]).to.have.property('series').to.be.an('array').to.be.empty;
      $scope.clickStudy($scope.patients[0], $scope.patients[0].studies[0], true);
      $httpBackend.flush();
      expect($scope.patients[0].studies[0]).to.have.property('series').to.be.an('array').to.have.lengthOf(1);

      done();
    });

    it ('click study a second time should not change the series list for a study for a patient in the list', function(done) {
      $controller('rt106DemoRadiologyController', { $scope: $scope });
      $httpBackend.flush();

      $scope.clickPatient($scope.patients[0], true);
      $httpBackend.flush();
      expect($scope.patients[0].studies[0]).to.have.property('series').to.be.an('array').to.be.empty;
      $scope.clickStudy($scope.patients[0], $scope.patients[0].studies[0], true);
      $httpBackend.flush();
      expect($scope.patients[0].studies[0]).to.have.property('series').to.be.an('array').to.have.lengthOf(1);

      // call a second time, shouldn't modify the length of the series list
      $scope.clickStudy($scope.patients[0], $scope.patients[0].studies[0], true);
      $httpBackend.flush();
      expect($scope.patients[0].studies[0]).to.have.property('series').to.be.an('array').to.have.lengthOf(1);

      done();
    });

    // inject the HTML fixture for image viewers
    var directiveElement;
    beforeEach(function() {
      var fixture = '<div id="fixture"><div class ="col-lg-6 col-md-12 rt106-component"><div id="viewers" config-viewers number-of-viewers="6" viewer-width="600px" viewer-height="600px"></div></div></div>';

      var element = angular.element(fixture);
      directiveElement = $compile(element)($scope);
      $('body').append(directiveElement);
      $scope.$apply();
    });

    // remove the html fixture from the DOM
    afterEach(function() {
      //document.body.removeChild(document.getElementById('fixture'));
    });

    afterEach(function () {
      //$httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('config-viewers directive creates 6 image viewers', function() {
      $rootScope.$apply();
      expect(document.getElementById('imageWrapper1')).to.not.be.null;
      expect(document.getElementById('imageWrapper2')).to.not.be.null;
      expect(document.getElementById('imageWrapper3')).to.not.be.null;
      expect(document.getElementById('imageWrapper4')).to.not.be.null;
      expect(document.getElementById('imageWrapper5')).to.not.be.null;
      expect(document.getElementById('imageWrapper6')).to.not.be.null;
    });

    it ('click series triggers a display for a series for a study for a patient in the list', function(done) {
      $controller('rt106DemoRadiologyController', { $scope: $scope });
      $httpBackend.flush();

      $scope.clickPatient($scope.patients[0], true);
      $httpBackend.flush();
      expect($scope.patients[0].studies[0]).to.have.property('series').to.be.an('array').to.be.empty;
      $scope.clickStudy($scope.patients[0], $scope.patients[0].studies[0], true);
      $httpBackend.flush();
      expect($scope.patients[0].studies[0]).to.have.property('series').to.be.an('array').to.not.be.empty;

      //var p =
      $scope.clickSeries($scope.patients[0], $scope.patients[0].studies[0], $scope.patients[0].studies[0].series[0],
        [[[true]]], 0,0,0)
          .then(function(result) {
            // some expect clause here

            done();
          })
          .catch(function(error) {
            // clickSeries will ultimately error out as we are not serving real images
            expect(error).to.be.a('string');

            done();
          });
      // clickSeries uses a bunch of promises and http calls. Flush those so the test completes. This test code may need to be update when the clickSeries code is modified.
      setTimeout(function() {
        $rootScope.$apply();
        setTimeout(function(){
          $httpBackend.flush();
          setTimeout(function(){
            $rootScope.$apply();
          }, 300);
        });
      });
    });

  });
});
