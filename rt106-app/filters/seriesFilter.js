// Copyright (c) General Electric Company, 2017.  All rights reserved.

(function () {
        var seriesFilter = function() {
        return function (seriesEid) {
            //console.log("seriesEid is " + seriesEid);
            if (seriesEid == "primary") {
                return seriesEid;
            } else {
                return "derived";
            }
        };
    }
    angular.module('rt106').filter('seriesFilter', seriesFilter);
}());

