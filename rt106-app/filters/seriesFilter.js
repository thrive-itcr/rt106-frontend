// Copyright (c) General Electric Company, 2017.  All rights reserved.

// make this module work with RequireJS or as a browser global
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['angular', '../module'], factory);
    } else {
        // Browser globals
        root.seriesFilter = factory(angular, angular.module('rt106'));
    }
}(this, function(angular, mod) {

    'use strict';

    mod.filter('seriesFilter', function () {
        return function(seriesEid) {
            if (seriesEid == "primary") {
                return "P";
            } else {
                return "D";
            }
        }
        });

}));

