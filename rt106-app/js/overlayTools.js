if (typeof overlayTools === "undefined") {
  var overlayTools = {};
}

/**
 * This module contains a function that copies and then modifies an image.
 */
(function(overlayTools) {

  "use strict";

  function processImage(image, imageProcessor, args) {
    var processedImage = {};
    for (var key in image) {
      if (key != 'getPixelData') {
        processedImage[key] = image[key];
      }
    }
    var pixelData = new Uint8Array(image.getPixelData());
    imageProcessor(processedImage, pixelData, args);
    return processedImage;
  }

  overlayTools.processImage = processImage;
}(overlayTools));

/**
 * This module contains functions to be used by processImage.
 */
(function(overlayTools) {

  "use strict";

  overlayTools.imageProcessors = {}

  function highlightColors(image, pixelData, args) {
    var colorList = args.colorList;
    var toColor = args.toColor;
    for (var i = 0; i < pixelData.length; i += 4) {
      if (pixelData[i + 3] > 0) {
        var keepOpaque = false;
        for (var j = 0; j < colorList.length; j++) {
          if (pixelData[i] == colorList[j][0] &&
            pixelData[i + 1] == colorList[j][1] &&
            pixelData[i + 2] == colorList[j][2]) {
            keepOpaque = true;
            break;
          }
        }
        if (!keepOpaque) {
          pixelData[i + 3] = 0;
        } else if (toColor) {
          pixelData[i] = toColor[0];
          pixelData[i + 1] = toColor[1];
          pixelData[i + 2] = toColor[2];
        }
      }
    }
    image.getPixelData = function() {
      return pixelData;
    };
  }

  function clearBackground(image, pixelData) {
    for (var i = 0; i < pixelData.length; i += 4) {
      if (pixelData[i] == 0 && pixelData[i + 1] == 0 && pixelData[i + 2] == 0) {
        pixelData[i] = 0;
        pixelData[i + 1] = 0;
        pixelData[i + 2] = 0;
        pixelData[i + 3] = 0;
      }
    }
    image.getPixelData = function() {
      return pixelData;
    };
  }

  function toBinaryImage(image, pixelData) {
    for (var i = 0; i < pixelData.length; i++) {
      if (pixelData[i] > 0 ) {
        pixelData[i] = 1;
      }
      else{
        pixelData[i] = 0;
      }
    }
    image.getPixelData = function() {
      return pixelData;
    };
  }

  function cannyEdgeDetection(image, pixelData) {
    var xFiler, yFiler;
    xFiler = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    yFiler = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    
    var newPixelData, newSizeInBytes;
    newSizeInBytes = image.width * image.height;
    newPixelData = new Uint8Array(newSizeInBytes);
    
    for (var x = 1; x < image.width-1; x++){
        for (var y = 1; y < image.height-1; y++){
            var ghs,gvs;
            ghs = 0;
            gvs = 0;
            for(var i = -1; i <= 1; i++){
                for (var j = -1; j <= 1; j++){
                    var index = (x+i)*image.width + (y+j);
                    ghs += yFiler[i+1][j+1] * pixelData[index];
                    gvs += xFiler[i+1][j+1] * pixelData[index];
                }
            }
            var p, pixelVal;
            p = x*image.width + y;
            pixelVal = Math.sqrt(ghs * ghs + gvs * gvs);
            if (pixelVal >= 0.5){
                newPixelData[p] = 255;
            }
            else{
                newPixelData[p] = 0;
            }
        }
    }
    
    image.getPixelData = function() {
      return newPixelData;
    }; 
  }
  
  function toMonochromaticOverlay(image, pixelData, color) {
    if (image.color) {
      // Convert RGBA into single channel. Then assign a render function
      // to color the single channel.
      var newPixelData;
      var newSizeInBytes;
      // need to deduce whether 8 bit RGBA or 16 bit RGBA
      if (image.sizeInBytes === image.width * image.height * 4) {
        newSizeInBytes = image.width * image.height;
        newPixelData = new Uint8Array(newSizeInBytes);
      } else {
        newSizeInBytes = image.width * image.height * 2;
        newPixelData = new Uint16Array(newSizeInBytes);
      }
      for (var i = 0; i < pixelData.length; i += 4) {
        newPixelData[i / 4] = pixelData[i]; // just sample the R channel
      }
      image.getPixelData = function() {
        return newPixelData;
      };
      image.color = false;
      image.sizeInBytes = newSizeInBytes;
      // input color is a string, three common color formats are accepted: HTML/CSS, Hex Code, Decimal Code
      var colorString = color;
      image.render = overlayTools.getRenderOverlayImage(colorString);
    } else {
      // Already monochrome.  Just set the render function to color with the prescribed color
      image.render = overlayTools.getRenderOverlayImage(colorString);
    }
  }

  overlayTools.imageProcessors.highlightColors = highlightColors;
  overlayTools.imageProcessors.clearBackground = clearBackground;
  overlayTools.imageProcessors.toMonochromaticOverlay = toMonochromaticOverlay;
  overlayTools.imageProcessors.toBinaryImage = toBinaryImage;
  overlayTools.imageProcessors.cannyEdgeDetection = cannyEdgeDetection;

}(overlayTools));

/**
 * This module contains functions to automatically set WW/WC.
 */
(function(overlayTools) {

  "use strict";

  function getScale(pixelData) {
    var iters = 100000;
    var vals = [];
    for (var i = 0; i < iters; i++) {
      var index = Math.floor(Math.random() * pixelData.length / 4);
      if (pixelData[4 * index] > 0) {
        vals.push(pixelData[4 * index]);
      }
    }
    vals.sort(function(a, b) {
      return a - b;
    });
    return vals[Math.floor(vals.length * 99 / 100)];
  }

  function scaleViewport(element) {
    var scale = getScale(cornerstone.getImage(element).getPixelData());
    var viewport = cornerstone.getViewport(element);
    viewport.voi = {
      'windowWidth': scale,
      'windowCenter': scale / 2
    };
    cornerstone.setViewport(element, viewport);
  }

  overlayTools.scaleViewport = scaleViewport;

}(overlayTools));

/**
 * This module converts (R,G,B) to hexadecimal.
 */
(function(overlayTools) {

  "use strict";

  function toHex(color) {
    var rgb = (color[0] << 16) + (color[1] << 8) + color[2];
    return '#' + (0x1000000 + rgb).toString(16).slice(1);
  }

  overlayTools.toHex = toHex;

}(overlayTools));

/**
 * This module defines a rendering function for monochromatic overlays that can vary in color.
 */
(function(cornerstone, overlayTools) {

  "use strict";

  var overlayRenderCanvas;
  var overlayRenderCanvasContext;
  var overlayRenderCanvasData;

  function initializeOverlayRenderCanvas(image, color) {
    // Resize the canvas
    overlayRenderCanvas.width = image.width;
    overlayRenderCanvas.height = image.height;

    // NOTE - we need to fill the render canvas with white pixels since we control the luminance
    // using the alpha channel to improve rendering performance.
    overlayRenderCanvasContext = overlayRenderCanvas.getContext('2d');
    overlayRenderCanvasContext.fillStyle = color;
    overlayRenderCanvasContext.fillRect(0, 0, overlayRenderCanvas.width, overlayRenderCanvas.height);
    overlayRenderCanvasData = overlayRenderCanvasContext.getImageData(0, 0, image.width, image.height);
  }

  function lutMatches(a, b) {
    // if undefined, they are equal
    if (!a && !b) {
      return true;
    }
    // if one is undefined, not equal
    if (!a || !b) {
      return false;
    }
    // check the unique ids
    return (a.id !== b.id)
  }

  function getLut(image, viewport, invalidated) {
    // if we have a cached lut and it has the right values, return it immediately
    if (image.lut !== undefined &&
      image.lut.windowCenter === viewport.voi.windowCenter &&
      image.lut.windowWidth === viewport.voi.windowWidth &&
      lutMatches(image.lut.modalityLUT, viewport.modalityLUT) &&
      lutMatches(image.lut.voiLUT, viewport.voiLUT) &&
      image.lut.invert === viewport.invert &&
      invalidated !== true) {
      return image.lut;
    }

    // In some versions of Cornerstone, cornerstone.generateLut sets image.lut.  In others, the lut structure is returned.
    // The lines below are intended to support both cases.
    var tempLut = cornerstone.generateLut(image, viewport.voi.windowWidth, viewport.voi.windowCenter, viewport.invert, viewport.modalityLUT, viewport.voiLUT);
    if (image.lut === undefined) {
      image.lut = tempLut;
    }
    image.lut.windowWidth = viewport.voi.windowWidth;
    image.lut.windowCenter = viewport.voi.windowCenter;
    image.lut.invert = viewport.invert;
    image.lut.voiLUT = viewport.voiLUT;
    image.lut.modalityLUT = viewport.modalityLUT;
    return image.lut;
  }

  function doesImageNeedToBeRendered(enabledElement, image) {
    if (image.imageId !== enabledElement.lastRenderedImageId ||
      !enabledElement.lastRenderedViewport ||
      enabledElement.lastRenderedViewport.windowCenter !== enabledElement.viewport.voi.windowCenter ||
      enabledElement.lastRenderedViewport.windowWidth !== enabledElement.viewport.voi.windowWidth ||
      enabledElement.lastRenderedViewport.invert !== enabledElement.viewport.invert ||
      enabledElement.lastRenderedViewport.rotation !== enabledElement.viewport.rotation ||
      enabledElement.lastRenderedViewport.hflip !== enabledElement.viewport.hflip ||
      enabledElement.lastRenderedViewport.vflip !== enabledElement.viewport.vflip ||
      enabledElement.lastRenderedViewport.modalityLUT !== enabledElement.viewport.modalityLUT ||
      enabledElement.lastRenderedViewport.voiLUT !== enabledElement.viewport.voiLUT
    ) {
      return true;
    }

    return false;
  }

  function getRenderCanvas(enabledElement, image, invalidated, color) {
    // apply the lut to the stored pixel data onto the render canvas
    if (doesImageNeedToBeRendered(enabledElement, image) === false && invalidated !== true) {
      return enabledElement.overlayRenderCanvas;
    }

    if (enabledElement.overlayRenderCanvas) {
      overlayRenderCanvas = enabledElement.overlayRenderCanvas;
      overlayRenderCanvasContext = enabledElement.overlayRenderCanvasContext;
      overlayRenderCanvasData = enabledElement.overlayRenderCanvasData;
    } else {
      overlayRenderCanvas = document.createElement('canvas');
    }
    // If our render canvas does not match the size of this image reset it
    // NOTE: This might be inefficient if we are updating multiple images of different
    // sizes frequently.
    if (overlayRenderCanvas.width !== image.width ||
      overlayRenderCanvas.height != image.height ||
      enabledElement.lastRenderedViewport.color !== color ||
      invalidated) {
      initializeOverlayRenderCanvas(image, color);
      enabledElement.overlayRenderCanvas = overlayRenderCanvas;
      enabledElement.overlayRenderCanvasContext = overlayRenderCanvasContext;
      enabledElement.overlayRenderCanvasData = overlayRenderCanvasData;
    }

    // get the lut to use
    var lut = getLut(image, enabledElement.viewport, invalidated);

    // overlay scale image - apply the lut and put the resulting image onto the render canvas
    cornerstone.storedPixelDataToCanvasImageData(image, lut, overlayRenderCanvasData.data);
    overlayRenderCanvasContext.putImageData(overlayRenderCanvasData, 0, 0);
    return overlayRenderCanvas;
  }

  /**
   * API function to draw a overlay image to a given enabledElement
   * @param enabledElement
   * @param invalidated - true if pixel data has been invaldiated and cached rendering should not be used
   */
  function renderOverlayImage(enabledElement, invalidated, color) {

    if (enabledElement === undefined) {
      throw "drawImage: enabledElement parameter must not be undefined";
    }
    var image = enabledElement.image;
    if (image === undefined) {
      throw "drawImage: image must be loaded before it can be drawn";
    }

    // get the canvas context and reset the transform
    var context = enabledElement.canvas.getContext('2d');
    context.setTransform(1, 0, 0, 1, 0, 0);

    // clear the canvas
    context.clearRect(0, 0, enabledElement.canvas.width, enabledElement.canvas.height);

    // turn off image smooth/interpolation if pixelReplication is set in the viewport
    if (enabledElement.viewport.pixelReplication === true) {
      context.imageSmoothingEnabled = false;
      context.mozImageSmoothingEnabled = false; // firefox doesn't support imageSmoothingEnabled yet
    } else {
      context.imageSmoothingEnabled = true;
      context.mozImageSmoothingEnabled = true;
    }

    // save the canvas context state and apply the viewport properties
    context.save();
    cornerstone.setToPixelCoordinateSystem(enabledElement, context);

    var renderCanvas = getRenderCanvas(enabledElement, image, invalidated, color);

    // Draw the render canvas half the image size (because we set origin to the middle of the canvas above)
    context.drawImage(renderCanvas, 0, 0, image.width, image.height, 0, 0, image.width, image.height);

    context.restore();

    enabledElement.lastRenderedImageId = image.imageId;
    enabledElement.lastRenderedViewport = {};
    enabledElement.lastRenderedViewport.windowCenter = enabledElement.viewport.voi.windowCenter;
    enabledElement.lastRenderedViewport.windowWidth = enabledElement.viewport.voi.windowWidth;
    enabledElement.lastRenderedViewport.invert = enabledElement.viewport.invert;
    enabledElement.lastRenderedViewport.rotation = enabledElement.viewport.rotation;
    enabledElement.lastRenderedViewport.hflip = enabledElement.viewport.hflip;
    enabledElement.lastRenderedViewport.vflip = enabledElement.viewport.vflip;
    enabledElement.lastRenderedViewport.modalityLUT = enabledElement.viewport.modalityLUT;
    enabledElement.lastRenderedViewport.voiLUT = enabledElement.viewport.voiLUT;
    enabledElement.lastRenderedViewport.color = color;
  }

  function getRenderOverlayImage(overlay) {
    return function(enabledElement, invalidated) {
      renderOverlayImage(enabledElement, invalidated, overlay);
    }
  }

  // Module exports
  overlayTools.getRenderOverlayImage = getRenderOverlayImage;

}(cornerstone, overlayTools));

/**
 * This module defines a rendering function for colored overlays.
 */
(function(cornerstone, overlayTools) {

  "use strict";

  function storedColorOverlayPixelDataToCanvasImageData(image, lut, canvasImageDataData) {
    var minPixelValue = image.minPixelValue;
    var canvasImageDataIndex = 0;
    var storedPixelDataIndex = 0;
    var numPixels = image.width * image.height * 4;
    var storedPixelData = image.getPixelData();
    var localLut = lut;
    var localCanvasImageDataData = canvasImageDataData;
    // NOTE: As of Nov 2014, most javascript engines have lower performance when indexing negative indexes.
    // We have a special code path for this case that improves performance.  Thanks to @jpambrun for this enhancement
    if (minPixelValue < 0) {
      while (storedPixelDataIndex < numPixels) {
        localCanvasImageDataData[canvasImageDataIndex++] = localLut[storedPixelData[storedPixelDataIndex++] + (-minPixelValue)]; // red
        localCanvasImageDataData[canvasImageDataIndex++] = localLut[storedPixelData[storedPixelDataIndex++] + (-minPixelValue)]; // green
        localCanvasImageDataData[canvasImageDataIndex++] = localLut[storedPixelData[storedPixelDataIndex++] + (-minPixelValue)]; // blue
        localCanvasImageDataData[canvasImageDataIndex++] = storedPixelData[storedPixelDataIndex++];
      }
    } else {
      while (storedPixelDataIndex < numPixels) {
        localCanvasImageDataData[canvasImageDataIndex++] = localLut[storedPixelData[storedPixelDataIndex++]]; // red
        localCanvasImageDataData[canvasImageDataIndex++] = localLut[storedPixelData[storedPixelDataIndex++]]; // green
        localCanvasImageDataData[canvasImageDataIndex++] = localLut[storedPixelData[storedPixelDataIndex++]]; // blue
        localCanvasImageDataData[canvasImageDataIndex++] = storedPixelData[storedPixelDataIndex++];
      }
    }
  }

  // Module exports
  cornerstone.internal.storedColorOverlayPixelDataToCanvasImageData = storedColorOverlayPixelDataToCanvasImageData;
  cornerstone.storedColorOverlayPixelDataToCanvasImageData = storedColorOverlayPixelDataToCanvasImageData;


  var colorOverlayRenderCanvas;
  var colorOverlayRenderCanvasContext;
  var colorOverlayRenderCanvasData;

  function initializeColorOverlayRenderCanvas(image) {
    // Resize the canvas
    colorOverlayRenderCanvas.width = image.width;
    colorOverlayRenderCanvas.height = image.height;

    // get the canvas data so we can write to it directly
    colorOverlayRenderCanvasContext = colorOverlayRenderCanvas.getContext('2d');
    colorOverlayRenderCanvasContext.fillStyle = 'white';
    colorOverlayRenderCanvasContext.fillRect(0, 0, colorOverlayRenderCanvas.width, colorOverlayRenderCanvas.height);
    colorOverlayRenderCanvasData = colorOverlayRenderCanvasContext.getImageData(0, 0, image.width, image.height);
  }


  function getLut(image, viewport) {
    // if we have a cached lut and it has the right values, return it immediately
    if (image.lut !== undefined &&
      image.lut.windowCenter === viewport.voi.windowCenter &&
      image.lut.windowWidth === viewport.voi.windowWidth &&
      image.lut.invert === viewport.invert) {
      return image.lut;
    }

    // Same version fix as in getLut() above.
    // lut is invalid or not present, regenerate it and cache it
    var tempLut = cornerstone.generateLut(image, viewport.voi.windowWidth, viewport.voi.windowCenter, viewport.invert);
    if (image.lut === undefined) {
      image.lut = tempLut;
    }
    image.lut.windowWidth = viewport.voi.windowWidth;
    image.lut.windowCenter = viewport.voi.windowCenter;
    image.lut.invert = viewport.invert;
    return image.lut;
  }

  function doesImageNeedToBeRendered(enabledElement, image) {
    if (image.imageId !== enabledElement.lastRenderedImageId ||
      !enabledElement.lastRenderedViewport ||
      enabledElement.lastRenderedViewport.windowCenter !== enabledElement.viewport.voi.windowCenter ||
      enabledElement.lastRenderedViewport.windowWidth !== enabledElement.viewport.voi.windowWidth ||
      enabledElement.lastRenderedViewport.invert !== enabledElement.viewport.invert ||
      enabledElement.lastRenderedViewport.rotation !== enabledElement.viewport.rotation ||
      enabledElement.lastRenderedViewport.hflip !== enabledElement.viewport.hflip ||
      enabledElement.lastRenderedViewport.vflip !== enabledElement.viewport.vflip
    ) {
      return true;
    }

    return false;
  }

  function getRenderCanvas(enabledElement, image, invalidated) {

    // The ww/wc is identity and not inverted - get a canvas with the image rendered into it for
    // fast drawing
    if (enabledElement.viewport.voi.windowWidth === 255 &&
      enabledElement.viewport.voi.windowCenter === 128 &&
      enabledElement.viewport.invert === false &&
      image.getCanvas &&
      image.getCanvas()
    ) {
      return image.getCanvas();
    }

    // apply the lut to the stored pixel data onto the render canvas
    if (doesImageNeedToBeRendered(enabledElement, image) === false && invalidated !== true) {
      return enabledElement.colorOverlayRenderCanvas;
    }

    if (enabledElement.colorOverlayRenderCanvas) {
      colorOverlayRenderCanvas = enabledElement.colorOverlayRenderCanvas;
      colorOverlayRenderCanvasContext = enabledElement.colorOverlayRenderCanvasContext;
      colorOverlayRenderCanvasData = enabledElement.colorOverlayRenderCanvasData;
    } else {
      colorOverlayRenderCanvas = document.createElement('canvas');
    }
    // If our render canvas does not match the size of this image reset it
    // NOTE: This might be inefficient if we are updating multiple images of different
    // sizes frequently.
    if (colorOverlayRenderCanvas.width !== image.width || colorOverlayRenderCanvas.height != image.height) {
      initializeColorOverlayRenderCanvas(image);
      enabledElement.colorOverlayRenderCanvas = colorOverlayRenderCanvas;
      enabledElement.colorOverlayRenderCanvasContext = colorOverlayRenderCanvasContext;
      enabledElement.colorOverlayRenderCanvasData = colorOverlayRenderCanvasData;
    }

    // get the lut to use
    var colorOverlayLut = getLut(image, enabledElement.viewport);

    // the colorOverlay image voi/invert has been modified - apply the lut to the underlying
    // pixel data and put it into the renderCanvas
    storedColorOverlayPixelDataToCanvasImageData(image, colorOverlayLut, colorOverlayRenderCanvasData.data);
    colorOverlayRenderCanvasContext.putImageData(colorOverlayRenderCanvasData, 0, 0);
    return colorOverlayRenderCanvas;
  }


  function renderColorOverlayImage(enabledElement, invalidated) {

    if (enabledElement === undefined) {
      throw "drawImage: enabledElement parameter must not be undefined";
    }
    var image = enabledElement.image;
    if (image === undefined) {
      throw "drawImage: image must be loaded before it can be drawn";
    }

    // get the canvas context and reset the transform
    var context = enabledElement.canvas.getContext('2d');
    context.setTransform(1, 0, 0, 1, 0, 0);

    // clear the canvas
    context.clearRect(0, 0, enabledElement.canvas.width, enabledElement.canvas.height);

    // turn off image smooth/interpolation if pixelReplication is set in the viewport
    if (enabledElement.viewport.pixelReplication === true) {
      context.imageSmoothingEnabled = false;
      context.mozImageSmoothingEnabled = false; // firefox doesn't support imageSmoothingEnabled yet
    } else {
      context.imageSmoothingEnabled = true;
      context.mozImageSmoothingEnabled = true;
    }

    // save the canvas context state and apply the viewport properties
    context.save();
    cornerstone.setToPixelCoordinateSystem(enabledElement, context);

    var renderCanvas = getRenderCanvas(enabledElement, image, invalidated);

    context.drawImage(renderCanvas, 0, 0, image.width, image.height, 0, 0, image.width, image.height);

    context.restore();

    enabledElement.lastRenderedImageId = image.imageId;
    enabledElement.lastRenderedViewport = {};
    enabledElement.lastRenderedViewport.windowCenter = enabledElement.viewport.voi.windowCenter;
    enabledElement.lastRenderedViewport.windowWidth = enabledElement.viewport.voi.windowWidth;
    enabledElement.lastRenderedViewport.invert = enabledElement.viewport.invert;
    enabledElement.lastRenderedViewport.rotation = enabledElement.viewport.rotation;
    enabledElement.lastRenderedViewport.hflip = enabledElement.viewport.hflip;
    enabledElement.lastRenderedViewport.vflip = enabledElement.viewport.vflip;
  }

  // Module exports
  overlayTools.renderColorOverlayImage = renderColorOverlayImage;
}(cornerstone, overlayTools));
