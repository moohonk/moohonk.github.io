/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 * For licensing see http://lab.aerotwist.com/canvas/music-dna/LICENSE
 */

function AudioRenderer() 
{
  "use strict";
  var TAU = Math.PI * 2;
  var LOGBASE       = 32;   // The logbase used
  var MAX_INDEX     = 850;  // The maximum index to look at in the frequency list
  var LOWERBOUND    = 8;    // The value that BASE depends on
  var REFLECT_NUM   = 0.50; // Precentage of the mapping to be on a reversed log scale
  var BASE_DOT_SIZE = 1;    // The default dot radius
  var LOG_MAX   = Math.log(LOGBASE   );
  // Shifts the mapping up on the log scale so it's easier to look at
  var BASE      = Math.log(LOWERBOUND) / LOG_MAX; 
  // The absolute maximum y-value a point can be mapped to
  var maxLogVal = Math.log(128       ) / LOG_MAX; 
  // The index before which the mapping is reflected
  var MID_INDEX = (LOWERBOUND * Math.pow(128, REFLECT_NUM)); 
  // The maximum height a frequency can be mapped to
  var upperLog  = (Math.log(    MAX_INDEX) / LOG_MAX - BASE) / maxLogVal; 
  // The minimum height a frequency can be mapped to
  // Even though we're dealing with all of these crazy logs, they cancel out when solving for this.
  var lowerLog  = 1/7 - REFLECT_NUM; 
  // The height of the graph, used to scale it to nice values.
  var normalizedHeight = (Math.log(2 * MAX_INDEX) / LOG_MAX - BASE) / maxLogVal - REFLECT_NUM;
  console.log("normHeight:\t" + normalizedHeight);
  var SHOULD_DRAW_STUFF = false;
  var canvas = document.getElementById('render-area');
  var ctx = canvas.getContext('2d');
  var maxDist = 0;
  var maxSize = 0;
  var prevMax = 0;
  var width  = 0;
  var height = 0;
  var imageWidth  = 0;
  var imageHeight = 0;
  var borderPercentX = 0.125;
  var borderPercentY = 0.25;
  var yStart = 0;
  var renderData = {
    width: 0,
    height: 0,
    values: [],
    maxWid: canvas.offsetWidth  * (1 - 2 * borderPercentX),
    maxHgt: canvas.offsetHeight * (1 - 4 * borderPercentX),
    bPX: 0.125,
    bPY: 0.25
  };

  function onResize() 
  {
    width  = canvas.offsetWidth;
    height = canvas.offsetHeight;

    canvas.width  = width;
    canvas.height = height;

    renderData.width  = width;
    renderData.height = height;
    
    imageWidth  = width  * (1 - 2 * borderPercentX);
    imageHeight = height * (1 - 2 * borderPercentY);
    yStart = imageHeight + height * borderPercentY ;

    renderData.maxWid = canvas.offsetWidth  * (1 - 2 * borderPercentX);
    renderData.maxHgt = canvas.offsetHeight * (1 - 4 * borderPercentX);

    ctx.globalCompositeOperation = "lighter";

  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(val, min));
  }

  this.clear = function() {
    ctx.clearRect(0, 0, width, height);
    renderData.values.length = 0;
  };

  this.render = function(audioData, normalizedPosition) 
  {
    var lnDataDist = 0;
    var volume     = 0;
    var color      = 0;
    var size       = 0;
    
    var rectX = width * borderPercentX + imageWidth * normalizedPosition;
    var rectY = 0.0;
    var stuffHappened = false;
    
    if (normalizedPosition <= 1)
    {
      for (var a =  850; a >= 0; a--) 
      {
        // Normalize volume
        volume = audioData[a] / 255;
        
        // Volume threshhold
        if (volume < 0.675)
          continue;
        
        // Map frequency to hue
        color = Math.round(a * 360 / 1024);

        // Map the point's y coordinate onto a log scale
        lnDataDist = Math.log(a) / LOG_MAX - BASE;
        rectY = yStart - imageHeight * lnDataDist / maxLogVal;
        
        // Check to see if we should use a flipped log scale to map this point
        if (a < MID_INDEX)
        {
          // Move the beginning point to effect easier reflection
          rectY = yStart - 2 * REFLECT_NUM * imageHeight;
          
          // Set the index used in position calculations 
          //  to be the index reflected along y = MID_INDEX
          var newInd = 2 * MID_INDEX - a;

          lnDataDist = (Math.log(newInd) / LOG_MAX - BASE); 

          // move away from the beginning point
          rectY += imageHeight * lnDataDist / maxLogVal;
        }
        
      // Scaling Stuff
        // Translate all y Coords for easier scaling
        rectY -= (yStart - imageHeight * upperLog);

        // Do some scaling
        rectY /= normalizedHeight;

        // Untranslate the y coords into their final form
        rectY += height * borderPercentY;
        
        if(rectY > maxDist)
        {
          maxDist = rectY; 
        }
        // Size computation
        size = (volume+0.125) * (volume+0.125) * BASE_DOT_SIZE + Math.random() * 2;
        size *= 0.56;
        
        //Make some of the circles very big
        if (Math.random() > 0.995) {
          size *= (audioData[a] * 0.2) * Math.random();
          volume *= Math.random() * 0.25;
        }

        var renderVals = {
          alpha: volume * volume * 0.09,
          color: color,
          x: rectX,
          y: rectY,
          size: size
        };
        
        // Draw the point on the canvas
        ctx.globalAlpha = renderVals.alpha;
        ctx.fillStyle = 'hsl(' + renderVals.color + ', 80%, 50%)';
        ctx.beginPath();
        ctx.arc(rectX, rectY, renderVals.size, 0, TAU, false);
        ctx.closePath();
        ctx.fill();

        renderData.values.push(renderVals);
      }
      if(prevMax != maxDist)
      {
        prevMax = maxDist;
        console.log("minDist:\t" + maxDist);
      }
    }
  };

  this.getRenderData = function() {
    return renderData;
  };

  window.addEventListener('resize', onResize, false);
  window.addEventListener('load', function() {
    onResize();
  }, false);
}
