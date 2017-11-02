
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['angular', '../module'], factory);
    } else {
        // Browser globals
        root.rt106DemoRadiologyController = factory(angular, angular.module('rt106'));
    }
}(this, function(angular, mod) {

    'use strict';

    mod.controller('rt106DemoRadiologyController', ['$scope', '$http', '$location', '$log','cohortFactory', 'analyticsFactory', 'dynamicDisplayService', 'executionService', 'alarmService', 'utilityFns', 'Rt106_SERVER_URL', function($scope, $http, $location, $log, cohortFactory, analyticsFactory, dynamicDisplayService, executionService, alarmService, utilityFns, Rt106_SERVER_URL) {

        /*
         * $scope variables
         */
        $scope.patients       = [];
        $scope.selectedPatient = {};
        $scope.selectedSeries = [];
        $scope.algorithms     = [];
        $scope.selectedAlgo   = [];
        $scope.executionList  = [];


        /*
         * For testing and debugging.
         */
        function printInfo() {
            console.log("$scope.patients is " + JSON.stringify($scope.patients));
            console.log("$scope.executionList is " + JSON.stringify($scope.executionList));
        }
        setTimeout(printInfo, 10000);


        /*
         * Initialization.
         */

        // Initialize the list of patients.
        cohortFactory.getPatients().then(function(patients) {
            for (var i = 0; i < patients.length; ++i) {
                $scope.patients.push(patients[i]);
                $scope.patients[i].studies = [];
            }
        })
        .catch(function(reason){
            console.log('Failed to load patients. ' + reason);
            alarmService.displayAlert('Failed to load patients');
        });

        // Initialize the list of algorithms and scan periodically for changes in the list.
        var scanForAnalytics = function() {
            analyticsFactory.getAnalytics().then(function(analytics) {
                utilityFns.mergeAnalyticsLists($scope.algorithms, analytics, $scope.selectedAlgo);
                utilityFns.updateScroll($scope);
                setTimeout(scanForAnalytics, 5000);
            });
        }
        setTimeout(scanForAnalytics, 1000);

        // Set up for running algorithms.
        executionService.initExecution();

        // Start polling for execution results.
        function pollExecList() {
            executionService.pollExecList($scope.executionList, $scope).then(function () {
                setTimeout(pollExecList, 1000);
            });
        }
        setTimeout(pollExecList, 1000);

        // Periodically make sure that scrollbars are in the right state.
        setInterval(function() { utilityFns.updateScroll($scope); }, 1000);

        // Cycle tabs on startup to stabilize the display.
        function showPatients() {
            $('#patientTab a[href="#patients"]').tab('show');
        }
        function showDetails() {
            $('#patientTab a[href="#patientdetails"]').tab('show');
        }
        function refreshBootstrap() {
            setTimeout(showDetails, 3000);
            setTimeout(showPatients,3500);
        }
        refreshBootstrap();

        // Dynamic size changes for screen regions.
        // The 'fullheight' and 'height' arguments should be a string of the form '40px'.
        // 'fullheight' should be a bit larger than 'height'.
        function changeTopRowHeight(fullheight, height) {
            document.getElementById('toprow').style.maxHeight = fullheight;
            document.getElementById('patientsection').style.minHeight = height;
            document.getElementById('detailsection').style.minHeight = height;
            document.getElementById('patientsection').style.maxHeight = height;
            document.getElementById('detailsection').style.maxHeight = height;
        }

        function topRowTall() {
            changeTopRowHeight('1500px', '1250px');
        }
        function topRowShort() {
            changeTopRowHeight('1000px', '750px');
        }
        topRowShort();

        /*
         * Handlers for user actions in the user interface.
         */

        // A patient is clicked.
        $scope.clickPatient = function(patient, highlightPatient) {
            if(!highlightPatient){
                $scope.selectedPatient = {};
                return;
            }
            var patientIdx = utilityFns.getObjectIndexByValue($scope.patients, 'id', patient.id);
            var studyIds = [];
            for(var i = 0; i < $scope.patients[patientIdx].studies.length; ++i){
                if(!studyIds.includes($scope.patients[patientIdx].studies[i].id)){
                    studyIds.push($scope.patients[patientIdx].studies[i].id);
                }
            }
            cohortFactory.getStudies(patient).then(function(studies) {
                for (var i = 0; i < studies.length; ++i) {
                    if(!studyIds.includes(studies[i].id)){
                        $scope.patients[patientIdx].studies.push(studies[i]);
                        $scope.patients[patientIdx].studies[i].series = [];
                    }
                }
                $scope.selectedPatient = $scope.patients[patientIdx];
            })
                .catch(function(reason){
                    console.log('Failed to load study due to ' + reason);
                    alarmService.displayAlert('Failed to load studies for ' + patient.id);
                });
            utilityFns.updateScroll($scope);
            showDetails();
        }
        $scope.clickPatient2 = function(patient, highlightPatientArray, patientIndex) {
            $scope.clickPatient(patient, highlightPatientArray[patientIndex]);
            // Unhighlight any other selected patients.
            for (var patientHighlight = 0; patientHighlight < highlightPatientArray.length; patientHighlight++) {
                if (patientHighlight != patientIndex) {
                    highlightPatientArray[patientHighlight] = false;
                }
            }
            //console.log("$scope.patients is " + JSON.stringify($scope.patients));
        }

        // A study is clicked.
        $scope.clickStudy = function(patient, study, highlightStudy) {
            if(!highlightStudy){
                return;
            }
            var patientIdx = utilityFns.getObjectIndexByValue($scope.patients, 'id', patient.id);
            var studyIdx = utilityFns.getObjectIndexByValue($scope.patients[patientIdx].studies, 'id', study.id);
            var seriesIds = [];
            for(var i = 0; i < $scope.patients[patientIdx].studies[studyIdx].series.length; ++i){
                if(!seriesIds.includes($scope.patients[patientIdx].studies[studyIdx].series[i].id)){
                    seriesIds.push($scope.patients[patientIdx].studies[studyIdx].series[i].id);
                }
            }
            cohortFactory.getSeries(patient, study).then(function(series) {
                //$log.log('series in response:', series);
                //console.log("Returned from cohortFactory.getSeries(): " + JSON.stringify(series));
                for (var i = 0; i < series.length; ++i) {
                    if(!seriesIds.includes(series[i].id)){
                        series[i].timeStamp = cohortFactory.getSeriesTimeStamp(series[i], $scope.executionList);
                        series[i].derivedFrom = cohortFactory.getSeriesDerivedFrom(series[i], $scope.executionList);
                        if (series[i].derivedFrom != null) {
                            console.log("returned from cohortFactory.getSeriesDerivedFrom with derivedFrom == " + series[i].derivedFrom);
                        }
                        $scope.patients[patientIdx].studies[studyIdx].series.push(series[i]);
                    }
                }
                // Sort the series for the current patient/study.
                $scope.patients[patientIdx].studies[studyIdx].series = $scope.patients[patientIdx].studies[studyIdx].series.sort(function(a, b) {
                    var pString = "primary";
                    var uString = "unknown";
                    if (a.timeStamp === pString && b.timeStamp === pString)
                        return 0;
                    else if (a.timeStamp === pString)
                        return -1;
                    else if (b.timeStamp === pString)
                        return 1;
                    else if (a.timeStamp === uString && b.timeString === uString)
                        return 0;
                    else if (a.timeStamp === uString)
                        return 1;
                    else if (b.timeStamp === uString)
                        return -1;
                    else // two timestamps
                        return a.timeStamp-b.timeStamp;
                });
                console.log("After calling getSeries(), the series structure is " + JSON.stringify($scope.patients[patientIdx].studies[studyIdx].series));
            })
                .catch(function(reason){
                    console.log('Failed to load series due to ' + reason);
                    alarmService.displayAlert('Failed to load series for ' + study.id);
                });
            utilityFns.updateScroll($scope);
        }
        $scope.clickStudy2 = function(study, highlightStudy) {
            var patient = $scope.selectedPatient;
            $scope.clickStudy(patient, study, highlightStudy);
            // Keep tab activated.
            $('#patientTab a[href="patientdetails"]').tab('show');
            //console.log("$scope.patients is " + JSON.stringify($scope.patients));
        }

        // A series is clicked. phz note: patient and study can be removed from the inputs
        $scope.clickSeries = function(patient, study, series, seriesHighlighted) {
            if (seriesHighlighted) {
                //console.log("$scope.clickSeries, series is: " + JSON.stringify(series));
                var accessPath = series['path'];
                var imageFormat = "http:";
                $scope.imageLayout = dynamicDisplayService.setDisplayShape("1,1");
                dynamicDisplayService.displayInCell(imageFormat, accessPath, {}, 0, 0, $scope.imageLayout, 'rgb(255,255,255)', 1.0);
                $scope.selectedSeries[0] = accessPath;
            } else { // !highlightSeries
                $scope.selectedSeries = [];
            }
        }
        $scope.clickSeries1 = function(patient, study, series, highlightSeriesArray, patientIndex, studyIndex, seriesIndex) {
            var seriesHighlighted = highlightSeriesArray[patientIndex][studyIndex][seriesIndex];
            $scope.clickSeries(patient, study, series, seriesHighlighted);
            // Clear other highlighted series.
            for (var patientHighlight = 0; patientHighlight < highlightSeriesArray.length; patientHighlight++) {
                for (var studyHighlight in highlightSeriesArray[patientHighlight]) {
                    for (var seriesHighlight in highlightSeriesArray[patientHighlight][studyHighlight]) {
                        if (patientHighlight != patientIndex || studyHighlight != studyIndex || seriesHighlight != seriesIndex) {
                            highlightSeriesArray[patientHighlight][studyHighlight][seriesHighlight] = false;
                        }
                    }
                }
            }
        }
        $scope.clickSeries2 = function(study, series, highlightSeriesArray, seriesIndex) {
            var patient = $scope.selectedPatient;
            $scope.clickSeries(patient, study, series, highlightSeriesArray[seriesIndex]);
            // clear other highlighted series.
            for (var seriesHighlight = 0; seriesHighlight < highlightSeriesArray.length; seriesHighlight++) {
                if (seriesHighlight != seriesIndex) {
                    highlightSeriesArray[seriesHighlight] = false;
                }
            }
            // Keep tab activated.
            $('#patientTab a[href="patientdetails"]').tab('show');
            //("$scope.patients is " + JSON.stringify($scope.patients));
        }

        // An algorithm is clicked.
        $scope.clickAlgo = function(algo, expandAlgo) {
            utilityFns.updateScroll($scope);
            if (expandAlgo) {
                $scope.selectedAlgo.push(algo.name);
                // Get the parameters for the selected algorithm.
                var algoIndex = utilityFns.getObjectIndexByValue($scope.algorithms, 'name', algo.name);
                $scope.selectedParameters = $scope.algorithms[algoIndex].parameters;
            } else { // !expandAlgo
                var index = $scope.selectedAlgo.indexOf(algo.name);
                if (index > -1)
                    $scope.selectedAlgo.splice(index, 1);
            }
        }

        // The Execute button is clicked.
        $scope.requestAlgoRun = function() {
            executionService.autofillRadiologyParameters($scope.selectedParameters, $scope.selectedSeries).then(function() {
              executionService.requestAlgoRun($scope.selectedParameters, $scope.selectedAlgo[0]);
            });
        }

        // A result (item in the execution history) is clicked.
        $scope.clickResult = function(execItem, expandResult) {
            utilityFns.updateScroll($scope);
            if (expandResult) {
                topRowTall();
                $scope.selectedExecution = execItem;
                // Get the analytic's ID in $scope.algorithms.
                var index = utilityFns.getObjectIndexByValue($scope.algorithms, 'name', execItem.analyticName);
                // Get the display structure for that analytic.
                var displayStruct = $scope.algorithms[index].display;
                // Grid-shape of the display structure is within displayStruct
                $scope.imageLayout = dynamicDisplayService.displayResult(execItem, displayStruct, $scope.detections);
            } else {
                topRowShort();
                // Clear the bottom viewer.  There are two that are used in different configurations.
                var viewer = imageViewers.stackViewers[4];
                imageViewers.clearStackElements(viewer);
                document.getElementById('imageWrapper5').style.display = 'none';

                var viewer = imageViewers.stackViewers[1];
                imageViewers.clearStackElements(viewer);
                document.getElementById('imageWrapper2').style.display = 'none';
            }
        }

    }]);
}));
