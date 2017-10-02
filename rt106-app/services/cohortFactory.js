// make this module work with RequireJS or as a browser global
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['angular', '../module'], factory);
  } else {
    // Browser globals
    root.cohortFactory = factory(angular, angular.module('rt106'));
  }
}(this, function(angular, mod) {

  'use strict';

  mod.factory('cohortFactory', ['$http', '$location', '$q', '$log', 'alarmService','utilityFns', 'Rt106_SERVER_URL', function($http, $location, $q, $log, alarmService, utilityFns, Rt106_SERVER_URL) {

    /*
     * Get the list of patients.
     */
    function getPatients(){
      var patientList = [];
      var deferred = $q.defer();

      $log.log("Getting the list of patients.");

      var req = {
        method: 'GET',
        url: Rt106_SERVER_URL + '/v1/datastore/patients',
      };
      $log.log('Request ', req);
      $log.log(req.url);

      $http(req)
        .then(function(result){
          $log.log("Successful return from getting patient list");
          $log.log('result ', result);
          patientList = result.data;
          patientList = patientList.sort(function(a, b) { // Sort based on patientName.
            var ta = (a.patientName === 'UNKNOWN' ? a.patientId : a.patientName);
            var tb = (b.patientName === 'UNKNOWN' ? b.patientId : b.patientName);
            if (ta < tb)
              return -1
            if (ta > tb)
              return 1;
            return 0;
          });
          deferred.resolve(patientList);
          $log.log('patientList:', patientList);
          //return patientList;
        }, function(err) {
          $log.error('/v1/datastore/patients returned an error.', err.data);
          alarmService.displayAlert('Error trying to get list of patients.');
          deferred.reject(['/v1/datastore/patients returned an error.', err.data]);
        })
        return deferred.promise;
    }

    /*
     * Get the list of studies.
     */
    function getStudies(patient){
      var studies = []; // Initialize the list of studies.
      var deferred = $q.defer();
      var newpatient;

      if (typeof(patient.patientName) === 'undefined') {
        // Some data sources may return detailed information about each patient.  If this is not the case, set a few key fields to default values.
        newpatient = {
          "name": patient.id,
          "gender": 'M/F',
          "DOB": 0,
          "studies": []
        }
      } else {
        newpatient = patient;
      }

      var req = {
        method: 'GET',
        url: Rt106_SERVER_URL + '/v1/datastore/patients/' + newpatient.id + '/imaging/studies',
      };

      $http(req)
        .then(function(result) {
          studies = result.data;
          var uniqueStudies = [];
          var studyIds = [];
          for (var i = 0; i < studies.length; ++i) {
              if(!studyIds.includes(studies[i].id)){
                  studyIds.push(studies[i].id);
                  uniqueStudies.push(studies[i]);
              }
          }
          deferred.resolve(uniqueStudies);
          //return studies;
          }, function(err) {
            $log.error('/v1/datastore/patients/' + newpatient.id + '/imaging/studies returned an error.', err.data);
            alarmService.displayAlert('Error trying to get list of studies for patient ' + newpatient.id);
            deferred.reject(['/v1/datastore/patients/' + newpatient.id + '/imaging/studies returned an error.', err.data]);
        });
        return deferred.promise;
    }

    /*
     * Get the series of images for a study.
     */
    function getSeries(patient, study){
      var series = [];
      var deferred = $q.defer();
      var req = {
        method: 'GET',
        url: Rt106_SERVER_URL + '/v1/datastore/patients/' + patient.id + '/imaging/studies/' + study.id + '/series',
      };

      $http(req)
        .then(function(result) {
          series = result.data;
          deferred.resolve(series);
          //return series;
          }, function(err) {
            $log.error('/v1/datastore/patients/' + patient.id + '/imaging/studies/' + study.id + '/series returned an error.', err.data);
            alarmService.displayAlert('Error trying to get list of series for patient ' + patient.id + ' and study ' + study.id);
            deferred.reject(['/v1/datastore/patients/' + patient.id + '/imaging/studies/' + study.id + '/series returned an error.', err.data]);
        });
        return deferred.promise;
    }

    var factory = {};
    factory.getPatients = function(){
        return getPatients();
    }
    factory.getStudies = function(patient){
        return getStudies(patient);
    }
    factory.getSeries = function(patient, study){
        return getSeries(patient, study);
    }

    return factory;
  }]);
}));
