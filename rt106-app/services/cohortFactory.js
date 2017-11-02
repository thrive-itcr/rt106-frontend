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

      /*
       * Get the timestamp for the given series if possible.
       * seriesStruct is the JSON structure the describes the specific series.
       * executionStruct is the JSON structure that describes all of the execution records.
       * In the future, this could instead be a database query to the execution database.
       * Only derived series are expected to have meaningful timestamps.
       * We assume that primary series do not have meaningful timestamps.
       * If no meaningful timestamp can be found, return 0.
       */
    function getSeriesTimeStamp(seriesStruct, executionStruct) {
        //console.log("***** TOP OF getSeriesTimeStamp() *****");
        //console.log("getSeriesTimeStamp(), seriesStruct is " + JSON.stringify(seriesStruct));
        //console.log("getSeriesTimeStamp(), executionStruct is " + JSON.stringify(executionStruct));
        if (seriesStruct.eid == "primary") {
            //console.log("***** RETURN 1 FROM getSeriesTimeStamp() *****");
            return 'primary';
        } else {
            var seriesPath = seriesStruct.path;
            // Look through the execution records to find a record where this series path was a result.
            for (var e=0; e<executionStruct.length; e++) {
                //console.log("Examining executionStruct " + JSON.stringify(executionStruct[e]));
                var executionDetails = executionStruct[e].details;
                for (var d=0; d<executionDetails.length; d++) {
                    var detail = executionDetails[d];
                    //console.log("Examining details: " + JSON.stringify(detail));
                    if (detail.source == "result" && detail.value == seriesPath) {
                        //console.log("Found match for series eid " + seriesStruct.eid);
                        //console.log("***** RETURN 2 FROM getSeriesTimeStamp() *****");
                        return executionStruct[e].requestTime;
                    } else {
                        //console.log("No match found for series eid " + seriesStruct.eid);
                    }
                }
            }
            //console.log("***** RETURN 3 FROM getSeriesTimeStamp() *****");
            return 'unknown';
        }
    }

      // Return the series that that the given series is derived from.
      // For primary series return null.
      // If the derived series cannot be determined return null.
      function getSeriesDerivedFrom(seriesStruct, executionStruct) {
          //console.log("***** TOP OF getSeriesDerivedFrom() *****");
          //console.log("getSeriesDerivedFrom(), seriesStruct is " + JSON.stringify(seriesStruct));
          //console.log("getSeriesDerivedFrom(), executionStruct is " + JSON.stringify(executionStruct));
          if (seriesStruct.eid == "primary") {
              //console.log("***** RETURN 1 FROM getSeriesDerivedFrom() *****");
              return null;
          } else {
              var seriesPath = seriesStruct.path;
              // Look through the execution records to find a record where this series path was a result.
              for (var e=0; e<executionStruct.length; e++) {
                  //console.log("Examining executionStruct " + JSON.stringify(executionStruct[e]));
                  var derivedFrom = null;
                  var matchFound = false;
                  var executionDetails = executionStruct[e].details;
                  for (var d=0; d<executionDetails.length; d++) {
                      var detail = executionDetails[d];
                      //console.log("Examining details: " + JSON.stringify(detail));
                      if (detail.source == "context" && detail.name == "inputSeries") {
                          derivedFrom = detail.value;
                      }
                      if (detail.source == "result" && detail.value == seriesPath) {
                          //console.log("Found match for series eid " + seriesStruct.eid);
                          //console.log("***** RETURN 2 FROM getSeriesDerivedFrom() *****");
                          matchFound = true;
                      } else {
                          //console.log("No match found for series eid " + seriesStruct.eid);
                      }
                  }
                  if (matchFound) {
                      console.log("getSeriesDerivedFrom, matchFound! -- seriesPath is " + seriesPath + ", derivedFrom is " + derivedFrom);
                      if (derivedFrom != null) {
                          console.log("getSeriesDerivedFrom returning " + derivedFrom);
                          return derivedFrom;
                      }
                  }
              }
              //console.log("***** RETURN 3 FROM getSeriesDerivedFrom() *****");
              return null;
          }
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
    factory.getSeriesTimeStamp = function(seriesStruct, executionStuct){
        return getSeriesTimeStamp(seriesStruct, executionStuct);
    }
      factory.getSeriesDerivedFrom = function(seriesStruct, executionStuct){
          return getSeriesDerivedFrom(seriesStruct, executionStuct);
      }

      return factory;
  }]);
}));
