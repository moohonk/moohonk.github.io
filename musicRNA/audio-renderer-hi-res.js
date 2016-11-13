/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 * For licensing see moohonk.github.io/musicRNA/LICENSE
 */
function AudioRendererHiRes(size, onRenderedCallback) {
  "use strict";

  var generateProgressBar = document.getElementById('generate-bar');
  var TAU = Math.PI * 2;

  var width  = 1;
  var height = 1;

  switch (size) {
    case 1: // normal
      width  = 1920;
      height = 1280;
      break;

    case 2: // large
      width  = 9000;
      height = 6000;
      break;

    case 3: // enormous
      width  = 16000;
      height = 12000;
      break;
  }
  //Variables! 
  var onRendered = onRenderedCallback;
  var renderData = null;
  var canvas     = null;
  var ctx        = null;
  var scaledW = 0;
  var scaledH = 0;
  var xOffset = 0;
  var yOffset = 0;
  var SCALE   = 1;
  var STEP    = 2000;
  var start, end;
  var bPX  , bPY;

  this.render = function(newRenderData) {
    
    console.log("render has been called");
    
    var ratio = 1;
    renderData = newRenderData;

    bPX = renderData.bPX;
    bPY = renderData.bPY;
    
    //Make a canvas that will do what we want
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
    canvas.width  = width;
    canvas.height = height;

    //Find the ratios of this image's width / height to the originals
    var widScale = width  / renderData.width;
    var hgtScale = height / renderData.height;
    
    //The smaller ratio is the biggest we can scale up the image by 
    // while still preserving the original aspect ratio.
    SCALE = Math.min(widScale, hgtScale);

    scaledW = renderData.width  * SCALE;
    scaledH = renderData.height * SCALE;
    
    /*
    If the scaled dimensions are smaller than the actual image dimensions, 
     we want to center the image so that the interesting stuff is in the middle.
    */
    if (scaledW < width){
      var diff = width * (1 - 2 * bPX) - scaledW;
      diff = width - scaledW;
      xOffset = diff / 2;
    }
    if (scaledH < height){
      var diff = height * (1 - 2 * bPY) - scaledH;
      diff = height - scaledH;
      yOffset = diff/2;
    }
    //Fill the background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);
    
    //Make a slightly darker rectangle encapsulating the good stuff
    ctx.fillStyle = '#000';
    ctx.fillRect(scaledW *  bPX + xOffset, scaledH *  bPY + yOffset , 
                 scaledW * (bPX * -2 + 1), scaledH * (bPY * -2 + 1));
    ctx.globalCompositeOperation = "lighter";
    
    //Start plopping the data into the image
    start = 0;
    end = Math.min(end + STEP, renderData.values.length);
    requestAnimFrame(renderPortion);

  };

  function renderPortion() {
    console.log("renderPortion has been called");
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
      console.log("rendering stuff");
      //A single point
      renderVals = renderData.values[i];
      
      //Transform the coords so they are in the right spot on the bigger image
      rectX = SCALE * renderVals.x + xOffset;
      rectY = SCALE * renderVals.y + yOffset;
      
      //Actually draw the dot
      ctx.globalAlpha = renderVals.alpha;
      ctx.fillStyle = 'hsl(' + renderVals.color + ', 80%, 50%)';
      ctx.beginPath();
      ctx.arc(rectX, rectY, renderVals.size * SCALE, 0, TAU, false);
      ctx.closePath();
      ctx.fill();
    }
    //Increment the progress bar
    generateProgressBar.style.width =
        ((end / renderData.values.length) * 100).toFixed(1) + '%';

    start = end;
    end = Math.min(end + STEP, renderData.values.length);

    requestAnimFrame(renderPortion);
  }
}
