if (typeof cornerstoneLayers === 'undefined') {
  var cornerstoneLayers = {};
}

(function(cornerstone, cornerstoneTools) {

  "use strict";

  var enabledFrames = [];

  function enableFrame(frame) {
    if (frame === undefined) {
      throw "enableFrame: parameter frame cannot be undefined";
    }
    var fr = {
      frame: frame,
      elements: [],
      synchronizer: new cornerstoneTools.Synchronizer("CornerstoneImageRendered", cornerstoneTools.panZoomSynchronizer),
      //synchronizer2: new cornerstoneTools.Synchronizer("CornerstoneImageRendered", cornerstoneTools.wwwcSynchronizer),
      synchronizer3: new cornerstoneTools.Synchronizer("CornerstoneImageRendered", cornerstoneTools.stackImageIndexSynchronizer)
    };
    enabledFrames.push(fr);
  }

  function getEnabledFrame(frame) {
    if (frame === undefined) {
      throw "getEnabledFrame: parameter frame cannot be undefined";
    }
    for (var i = 0; i < enabledFrames.length; i++) {
      if (enabledFrames[i].frame == frame) {
        return enabledFrames[i];
      }
    }
  }

  function addElement(frame) {
    var enabledFrame = getEnabledFrame(frame);
    var element = document.createElement('div');
    var isOverlay = (enabledFrame.elements.length > 0);
    element.className = "imageElement";
    element.style['position'] = 'absolute';
    element.style['width'] = frame.offsetWidth + 'px';
    element.style['height'] = frame.offsetHeight + 'px';
    element.style['top'] = '0px';
    element.style['left'] = '0px';
    element.oncontextmenu = 'return false';
    //element.style['z-index'] = enabledFrame.elements.length;

    if (isOverlay) {
      // enabledFrame.elements is not empty, at least one element exists
      element.style['pointer-events'] = 'none';
    } else {
      // this is the first element
      // create a div for all image layers that will be added
      var layers = document.createElement('div');
      layers.className = "imageLayers";
      layers.style['position'] = 'absolute';
      layers.style['width'] = frame.offsetWidth + 'px';
      layers.style['height'] = frame.offsetHeight + 'px';
      layers.style['top'] = '0px';
      layers.style['left'] = '0px';
      layers.oncontextmenu = 'return false';

      //var firstChildElement = enabledFrame.frame.firstChild;
      //enabledFrame.frame.insertBefore(layers, firstChildElement);
      //var firstChildElement = enabledFrame.frame.getElementsByClassName("sceneInImageViewer");
      // jQuery way to do
      $('#' + enabledFrame.frame.id + " " + ".ImageViewerScene")[0].prepend(layers);
    }

    // append element as a child element of imageLayers
    var imageLayers = enabledFrame.frame.getElementsByClassName('imageLayers')[0];
    imageLayers.appendChild(element);

    enabledFrame.elements.push(element);
    cornerstone.enable(element);
    return element;
  }

  function getLastElement(frame) {
    var enabledFrame = getEnabledFrame(frame);
    var lengthElements = enabledFrame.elements.length;
    var element = enabledFrame.elements[lengthElements - 1];
    return element;
  }

  function getImageElement(frame) {
    var enabledFrame = getEnabledFrame(frame);
    var imageElementCollection = enabledFrame.frame.getElementsByClassName("imageElement");
    var imageElement = imageElementCollection[0];
    return imageElement;
  }

  function loadImage(imageId) {
    //console.log("cornerStoneLayers.loadImage: " + imageId);
    var deferred = $.Deferred();
    cornerstone.loadAndCacheImage(imageId).then(function(image) {
      if (image.render === cornerstone.renderColorImage) {
        image.render = overlayTools.renderColorOverlayImage;
      } else if (image.render === cornerstone.renderGrayscaleImage) {
        image.render = overlayTools.getRenderOverlayImage('white');
      }
      deferred.resolve(image);
    }, function(error) {
      deferred.reject(error);
    });
    return deferred;
  }

  function displayImage(frame, element, image, viewport) {
    var enabledFrame = getEnabledFrame(frame);
    cornerstone.displayImage(element, image, viewport);
    if (element === enabledFrame.elements[0]) {
      enabledFrame.synchronizer.addSource(element);
    } else {
      enabledFrame.synchronizer.addTarget(element);
      $(enabledFrame.elements[0]).trigger("CornerstoneImageRendered", {});
    }
  }

  function setOpacity(element, opacity) {
    //console.log("cornerstoneLayers.setOpacity, element is " + element + ", opacity is " + opacity);
    var canvas = cornerstone.getEnabledElement(element).canvas;
    canvas.getContext('2d').globalAlpha = opacity;
    cornerstone.updateImage(element, false);
  }

  cornerstoneLayers.enableFrame = enableFrame;
  cornerstoneLayers.getEnabledFrame = getEnabledFrame;
  cornerstoneLayers.addElement = addElement;
  cornerstoneLayers.getLastElement = getLastElement;
  cornerstoneLayers.getImageElement = getImageElement;
  cornerstoneLayers.loadImage = loadImage;
  cornerstoneLayers.displayImage = displayImage;
  cornerstoneLayers.setOpacity = setOpacity;
}(cornerstone, cornerstoneTools));
