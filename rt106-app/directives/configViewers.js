// make this module work with RequireJS or as a browser global
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['angular', '../module'], factory);
  } else {
    // Browser globals
    root.configViewers = factory(angular, angular.module('rt106'));
  }
}(this, function(angular, mod) {

  'use strict';

  mod.directive('configViewers', ['$parse', function($parse){

    return {
      link: function( $scope, elem, attrs ) {
         elem.ready(function(){
           //console.log('configViewers: ', attrs);
           imageViewers.configure();

           //create image viewers first before using them
           var numberOfImageViewersToCreate = 6;
           if (attrs.numberOfViewers !== undefined && !Number.isNaN(attrs.numberOfViewers)) {
             numberOfImageViewersToCreate = Number(attrs.numberOfViewers);
           }
           for (var i = 0; i < numberOfImageViewersToCreate; i++) {
             var viewer = 'imageWrapper'+(imageViewers.imageViewers.length+1);
             imageViewers.createImageViewer('viewers', viewer);
             if (attrs.viewerWidth !== undefined) {
               $('#' + viewer).width(attrs.viewerWidth);
             }
             if (attrs.viewerHeight !== undefined) {
               $('#' + viewer).height(attrs.viewerHeight);
             }
           }
         })
       }
    }
  }]);

}));
