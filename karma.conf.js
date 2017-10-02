// Karma configuration
// Generated on Thu Aug 10 2017 11:21:00 GMT-0400 (EDT)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'sinon', 'chai-things', 'chai', 'jquery-3.2.1'],

    client: {
      //captureConsole: true,
      // mocha: {
      //   timeout : 2000 // mocha default is 2 seconds
      // }
    },

    // list of files / patterns to load in the browser
    files: [
      'public/bower_components/angular/angular.js',
      'public/bower_components/angular-mocks/angular-mocks.js',
      'public/bower_components/angular-ui-grid/ui-grid.js',
      'public/bower_components/ng-scrollbar/dist/ng-scrollbar.js',
      'public/bower_components/cornerstone/dist/cornerstone.js',
      'public/bower_components/cornerstoneTools/dist/cornerstoneTools.js',
      'public/bower_components/cornerstoneMath/dist/cornerstoneMath.js',
      'public/bower_components/dicomParser/dist/dicomParser.js',
      'rt106-app/js/rt106.js',
      'rt106-app/services/utilityFns.js',
      'public/controllers/rt106DemoRadiologyController.js',
      'rt106-app/directives/configViewers.js',
      'rt106-app/services/cohortFactory.js',
      'rt106-app/services/analyticsFactory.js',
      'rt106-app/services/dynamicDisplayService.js',
      'rt106-app/services/dynamicControlService.js',
      'rt106-app/services/executionService.js',
      'rt106-app/services/alarmService.js',
      'rt106-app/js/imageViewers.js',
      'rt106-app/js/cornerstoneLayers.js',
      'rt106-app/js/overlayTools.js',
      'rt106-app/third-party/cornerstoneHTTPDICOMImageLoader.js',
      'rt106-app/third-party/cornerstoneWADOImageLoader.js',
      'rt106-app/config.js',
      'test/rt106-app/rt106-appUnitTest.js'
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'rt106-app/!(third-party)/**/*.js': ['coverage'],
      'public/!(bower_components)/**/*.js': ['coverage'],
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['verbose', 'coverage'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_DISABLE,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadless'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
