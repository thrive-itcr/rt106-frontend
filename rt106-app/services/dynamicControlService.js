// Copyright (c) General Electric Company, 2017.  All rights reserved.

/*
 * NOTE:  This is not structured as a proper AngularJS service, because it is called by imageViewers.js, which is also
 *        not a proper AngularJS component.
 */


function clearDynamicControls() {
  // Remove any existing opacity sliders.
  $('.opacity-slider').remove();
  $('.dynamic-label').remove();
  $('.dynamic-color-picker').remove();
  $('.dynamic-span').remove();
}

function getSpan(inputID) {
  return $('<span>', {
    class: 'dynamic-span',
    id: inputID,
    style: 'display:table;vertical-align:top;padding:2px 2px 0px 0px'
  });
}

function getLabel(label) {
  return $('<label>', {
    text: label,
    class: 'dynamic-label',
    style: 'vertical-align:top;padding:10px 20px 0px 0px'
  });
}

function getOpacitySlider(element, opacityValue) {
  return $('<input>', {
    type: 'range',
    min: 0,
    max: 1,
    value: opacityValue,
    step: 0.01,
    class: 'opacity-slider',
    'data-toggle': 'tooltip',
    'data-trigger': 'hover',
    'data-animation': false,
    title: function() {
      return 'Opacity: ' + parseFloat($(this).val()).toFixed(2);
    },
    style: function () {
      var styleStringBegin = 'display:inline-block;vertical-align:top;width:';
      var sliderWidth = element.clientWidth * 0.5;
      var styleStringFull = styleStringBegin.concat(sliderWidth.toString(), 'px;padding:10px 0px 0px');
      return styleStringFull;
    }
    // style: 'display:inline-block;width:200px;padding-top:10px'
  }).on('input', function() {
    var valString = parseFloat($(this).val()).toFixed(2);
    $(this).tooltip('dispose').attr('title', 'Opacity: ' + valString).tooltip('show');
    cornerstoneLayers.setOpacity(element, $(this).val());
  });
}

function getColorInput(element, colorInit, stackId) {
  return $('<input>', {
    type: 'color',
    value: overlayTools.toHex(colorInit),
    class: 'dynamic-color-picker',
    style: 'vertical-align:top;padding:10px 0px 20px'
  }).on('input', function() {
    var image = cornerstone.getImage(element);
    image.render = overlayTools.getRenderOverlayImage($(this).val());
    cornerstone.updateImage(element, true);
    // call setStackColor
    imageViewers.setStackColor(stackId, $(this).val());
  });
}



function addCustomControls(domElement, displayElement, displayStructElement, stackId, color, opacityValue) {
  if (!$.isEmptyObject(displayStructElement)) {
    if (displayStructElement.hasOwnProperty('controls')) {
      // Opacity Slider
      if (displayStructElement.controls.hasOwnProperty('opacity')) {
        // insert to the ImageViewerControls area
        $(domElement + " " + ".ImageViewerControls").append(getSpan('spanOpacity'));
        $(domElement + " " + "#spanOpacity").append(getLabel(displayStructElement.controls.opacity));
        $(domElement + " " + "#spanOpacity").append(getOpacitySlider(displayElement, opacityValue));
      }
      // Color Picker
      if (displayStructElement.controls.hasOwnProperty('color')) {
        // insert to the ImageViewerControls area
        $(domElement + " " + ".ImageViewerControls").append(getSpan('spanColorPicker'));
        $(domElement + " " + "#spanColorPicker").append(getLabel(displayStructElement.controls.color));
        $(domElement + " " + "#spanColorPicker").append(getColorInput(displayElement, color, stackId));
      }
    }
  }
}
