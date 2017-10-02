// this module will work with RequireJS or as a browser global
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['tiff'], function(tiff) { factory(tiff, root.TIFFParser);});
  } else {
    // Browser globals
    root.tiffImageLoader = factory(root.Tiff, root.TIFFParser);
  }
}(this, function(Tiff, TIFFParser) {

(function(cornerstone, Tiff) {

    'use strict';

    //Tiff = require('tiff');

    function getTiffImage(imageId) {
        //var key = imageId.substr(7);
        var key = imageId.replace('tiff', 'http');  // This does not work.  We get redirected to the DICOM image loader.
        console.log("getTiffImage, imageId is " + imageId + " and key is " + key);
        var deferred = $.Deferred();

        var xhr = new XMLHttpRequest();
        xhr.open('GET', key);
        xhr.responseType = 'arraybuffer';
        xhr.onreadystatechange = function(e) {
            if(xhr.readyState == 4) {
                if(xhr.status == 200) {
                    Tiff.initialize({TOTAL_MEMORY: 268435456});
                    var tiff = new Tiff({buffer: xhr.response});
                    var pixelData = new Uint8ClampedArray(tiff.readRGBAImage());
                    var getPixelData = function() { return pixelData; };
                    var image = {
                        imageId: imageId,
                        minPixelValue : 0,
                        maxPixelValue : 255,
                        slope: 1.0,
                        intercept: 0,
                        windowCenter : 128,
                        windowWidth : 255,
                        render: cornerstone.renderColorImage,
                        getPixelData: getPixelData,
                        rows: tiff.height(),
                        columns: tiff.width(),
                        height: tiff.height(),
                        width: tiff.width(),
                        color: true,
                        columnPixelSpacing: 1,
                        rowPixelSpacing: 1,
                        sizeInBytes: tiff.width() * tiff.height() * 4
                    };
                    deferred.resolve(image);
                } else {
                    console.error("getTiffImage(), XMLHttpRequest() failed with status: " + xhr.status + " and text " + xhr.statusText);
                    deferred.reject({error: xhr.statusText});
                }
            }
        };
        xhr.send();
        return deferred;
    }

    cornerstone.registerImageLoader('tiff', getTiffImage);

    function getTiff16Image(imageId) {
        //var key = imageId.substr(9);
        var key = imageId.replace('tiff16', 'http');  // This does not work.  We get redirected to the DICOM image loader.
        var deferred = $.Deferred();
        var xhr = new XMLHttpRequest();
        xhr.open('GET', key);
        xhr.responseType = 'arraybuffer';
        xhr.onreadystatechange = function(e) {
            if(xhr.readyState == 4) {
                if(xhr.status == 200) {
                    var tiffParser = new TIFFParser();
                    var imageData = tiffParser.parseTIFF(xhr.response);
                    var getPixelData = function() { return imageData.pixelData; };
                    var image = {
                        imageId: imageId,
                        minPixelValue : 0,
                        maxPixelValue : 65535,
                        slope: 1.0,
                        intercept: 0,
                        windowCenter : 128,
                        windowWidth : 255,
                        render: cornerstone.renderColorImage,
                        getPixelData: getPixelData,
                        rows: imageData.height,
                        columns: imageData.width,
                        height: imageData.height,
                        width: imageData.width,
                        color: true,
                        columnPixelSpacing: 1,
                        rowPixelSpacing: 1,
                        sizeInBytes: imageData.width * imageData.height * 4 * 2
                    };
                    deferred.resolve(image);
                } else {
                    deferred.reject({error: xhr.statusText});
                }
            }
        };
        xhr.send();
        return deferred;
    }

    cornerstone.registerImageLoader('tiff16', getTiff16Image);
}(cornerstone, Tiff));
}));
