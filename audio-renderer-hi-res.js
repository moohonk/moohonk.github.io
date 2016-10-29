/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 * For licensing see http://lab.aerotwist.com/canvas/music-dna/LICENSE
 */

function AudioRendererHiRes(size, onRenderedCallback) {
  "use strict";

  var generateProgressBar = document.getElementById('generate-bar');
  var STEP = 2000;
  var TAU = Math.PI * 2;

  var width = 1;
  var height = 1;

  switch (size) {
    case 1: // normal
      width = 1920;
      height = 1280;
      break;

    case 2: // large
      width = 9000;
      height = 6000;
      break;

    case 3: // enormous
      width = 16000;
      height = 12000;
      break;
  }

  var renderData = null;
  var start = 0;
  var end = 0;
  var onRendered = onRenderedCallback;
  var canvas = null;
  var ctx = null;
  //var midX = width * 0.5;
  //var midY = height * 0.5;
  var bPX = 0.125;
  var bPY = 0.0;
  var imageWidth = 0;
  var imageHeight = 0;
  var scaledW = 0;
  var scaledH = 0;
  var SCALE = 1;
  var xOffset = 0;
  var yOffset = 0;

  this.render = function(newRenderData) {

    var ratio = 1;
    var maxRenderDataSize = newRenderData.radius * 2;
    var minRenderDimensions = Math.min(width, height);

    renderData = newRenderData;

    bPX = renderData.bPX;
    bPY = renderData.bPY;
    
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');

    canvas.width  = width;
    canvas.height = height;

    imageWidth  = width  * (1 - 2 * bPX);
    imageHeight = height * (1 - 2 * bPY);

    //Find the aspect ratio of the original image
    var aspectRatio = renderData.maxWid / renderData.maxHgt;

    //Find the ratios of this image's max drawable width / height to the originals
    var widScale = imageWidth  / renderData.maxWid;
    var hgtScale = imageHeight / renderData.maxHgt;

    //The smaller ratio is the biggest we can scale up the image by 
    // while still preserving the original aspect ratio.
    SCALE = Math.min(widScale, hgtScale);
    console.log("scale:" + SCALE);
    imageWidth  = renderData.maxWid * SCALE;
    imageHeight = renderData.maxHgt * SCALE;

    scaledW = renderData.width  * SCALE;
    scaledH = renderData.height * SCALE;
    if (scaledW < width  * (1 - 2 * bPX))
    {
      //If the scaled width is less than what the width
      // would be without any aspect ratio preserving, 
      // calculate the difference between these values 
      // and set the xOffset to be half this difference.
      var diff = width * (1 - 2 * bPX) - scaledW;
      xOffset = diff / 2;
    }

    if (scaledH < height * (1 - 2 * bPY))
    {
      var diff = height * (1 - 2 * bPY) - scaledH;
      yOffset = diff / 2;
    }
    //console.log("scaled:\t" + scaledW + "\t" + scaledH);


    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#111';
    ctx.fillRect(width * bPX, height * bPY, width * (1 - 2 * bPX), height * (1 - 2 * bPY));
    ctx.globalCompositeOperation = "lighter";

    // We want to keep things roughly in proportion here,
    // so we should scale up as much as we can... but no more, we don't
    // want to be greedy. People would talk.

    //ratio = minRenderDimensions / maxRenderDataSize;

    //ctx.translate(midX, midY);
    //ctx.scale(ratio, ratio);

    start = 0;
    end = Math.min(end + STEP, renderData.values.length);
    requestAnimFrame(renderPortion);

  };

  function renderPortion() {

    var renderVals;

    // If we aren't going to paint anything else
    // bake out an image and send it back
    if (end - start === 0) {
      onRendered(canvas.toDataURL("image/png"));
      canvas = null;
      ctx = null;
      return;
    }
    var rectX, rectY;
    for (var i = start; i < end; i++) {

      renderVals = renderData.values[i];
      //Most Recent RectX + Y
      //rectX =                scaledW * bPX  + imageWidth  * renderVals.x + xOffset;
      //rectY = (imageHeight + scaledH * bPY) - imageHeight * renderVals.y + yOffset;
      rectX = SCALE * renderVals.x + xOffset;
      rectY = SCALE * renderVals.y + yOffset;


      //rectX = width  * (         borderPercent / 2 + (1 -     borderPercent) * renderVals.x);
      //rectY = height * ((1 - 2 * borderPercent)    - (1 - 4 * borderPercent) * renderVals.y);

      ctx.globalAlpha = renderVals.alpha;
      ctx.fillStyle = 'hsl(' + renderVals.color + ', 80%, 50%)';
      //ctx.fillStyle = 'hsl(' + renderVals.color + ', 80%, 100%)';
      ctx.beginPath();
      ctx.arc(rectX, rectY, renderVals.size, 0, TAU, false);
      ctx.closePath();
      ctx.fill();
    }
    //console.log("XY:\t" + rectX + "\t" + rectY);
    generateProgressBar.style.width =
        ((end / renderData.values.length) * 100).toFixed(1) + '%';

    start = end;
    end = Math.min(end + STEP, renderData.values.length);

    requestAnimFrame(renderPortion);
  }
}
