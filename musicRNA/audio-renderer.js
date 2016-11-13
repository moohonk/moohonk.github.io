/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 * For licensing see moohonk.github.io/musicRNA/LICENSE
 */
function AudioRenderer() 
{
  "use strict";
  var TAU = Math.PI * 2;
  
  //Config (independent) variables
  var LOGBASE       = 32;   // The logbase used
  var MAX_INDEX     = 850;  // The maximum index to look at in the frequency list
  var LOWERBOUND    = 8;    // The value that BASE depends on
  var REFLECT_NUM   = 0.25; // Precentage of the mapping to be on a reversed log scale
  var BASE_DOT_SIZE = 1.0;  // The default dot radius
  var BASE_ALPHA    = 0.09; // The base transparency for each dot
  var VOLUME_THRESH = 0.675;// The lowest volume level for which we actually display something
  
  //Dependent variables
  
  // Pretty self-explanatory
  var LOG_BASE  = Math.log(LOGBASE   );
  
  // Shifts the mapping up on the log scale (compressing the frequencies) so it's easier to look at
  var SHRINK    = Math.log(LOWERBOUND) / LOG_BASE; 
  
  // The absolute maximum y-value a point can be mapped to
  var maxLogVal = Math.log(128       ) / LOG_BASE; 
  
  // The index before which the mapping is reflected
  var MID_INDEX = (LOWERBOUND * Math.pow(128, REFLECT_NUM)); 
  
  // The maximum height a frequency can be mapped to
  var upperLog  = (Math.log(    MAX_INDEX) / LOG_BASE - SHRINK) / maxLogVal; 
  
  // The minimum height a frequency can be mapped to
  // Even though we're dealing with all of these crazy logs, they cancel in this.
  var lowerLog  = 1/7 - REFLECT_NUM; 
  
  // The height of the graph, used to scale things to nice values.
  var normalizedHeight = (Math.log(2 * MAX_INDEX) / LOG_BASE - SHRINK) / maxLogVal - REFLECT_NUM;

  var canvas = document.getElementById('render-area');
  var ctx = canvas.getContext('2d');
  var hasDrawnBackground = false;
  var width   = 0;
  var height  = 0;
  var imageWidth  = 0;
  var imageHeight = 0;
  var numTimesDrawnBackground = 0;
  
  // The percent of the screen we should leave for the border
  var borderPercentX = 0.03125;
  var borderPercentY = 0.25;
  var yStart = 0;
  
  //The object that stores EVERYTHING.
  // This is passed to the high-res renderer so it can render things in high res.
  var renderData = {
    width: 0,
    height: 0,
    values: [],
    //maxWid: canvas.offsetWidth  * (1 - 2 * borderPercentX),
    //maxHgt: canvas.offsetHeight * (1 - 2 * borderPercentY),
    bPX: borderPercentX,
    bPY: borderPercentY
  };

  function drawBackground() {
    ctx.globalCompositeOperation = "source-over";
    console.log("Clearing before background");
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    //Make a slightly gray background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);
    //Have the drawing area be a darker color (in this case black)
    ctx.fillStyle = '#000';
    console.log("imageWid:\t" + imageWidth + "\tImageHeight:\t" + imageHeight);
    ctx.fillRect(borderPercentX * width, borderPercentY * height, imageWidth, imageHeight);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, borderPercentX * width, height);
    hasDrawnBackground = true;
    ctx.globalCompositeOperation = "lighter";
    numTimesDrawnBackground++;
    console.log("we've drawn the background " + numTimesDrawnBackground + " times.");
  }
  this.drawBackground = function(){
    drawBackground();
  }
  function onResize() 
  {
    width  = canvas.offsetWidth;
    height = canvas.offsetHeight;

    //Store the width and height everywhere
    canvas.width      = width;
    canvas.height     = height;
    renderData.width  = width;
    renderData.height = height;
    
    //Calculate the width and height of where we will actually be drawing
    imageWidth  = width  * (1 - 2 * borderPercentX);
    imageHeight = height * (1 - 2 * borderPercentY);
    
    //For to helping with coordinate calculation
    yStart = imageHeight + height * borderPercentY ;

    //renderData.maxWid = canvas.offsetWidth  * (1 - 2 * borderPercentX);
    //renderData.maxHgt = canvas.offsetHeight * (1 - 2 * borderPercentY);

    ctx.globalCompositeOperation = "lighter";
    hasDrawnBackground = false; 
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(val, min));
  }
  
  this.clear = function() {
    ctx.clearRect(0, 0, width, height);
    hasDrawnBackground = false;
    renderData.values.length = 0;
    console.log("Clear");
    //drawBackground();
  };

  this.render = function(audioData, normalizedPosition) 
  {
    if(!hasDrawnBackground)
    {
      console.log("Has Not Drawn Background");
      drawBackground();
    }
    var lnDataDist = 0;
    var normVol    = 0;
    var volume     = 0;
    var color      = 0;
    var size       = 0;
    
    var rectX = width * borderPercentX + imageWidth * normalizedPosition;
    var rectY = 0.0;
    var stuffHappened = false;
    
    if (normalizedPosition <= 1)
    {
      for (var a =  1024; a >= 0; a--) 
      {
        // Normalize volume
        volume = audioData[a] / 255;
        
        // Volume threshhold
        if (volume < VOLUME_THRESH)
          continue;
        
        // Map frequency to hue
        color = Math.round(a * 360 / 1024);

        // Map the point's y coordinate onto a log scale
        lnDataDist = Math.log(a) / LOG_BASE - SHRINK;
        rectY = yStart - imageHeight * lnDataDist / maxLogVal;
        
        // Check to see if we should use a flipped log scale to map this point
        if (a < MID_INDEX)
        {
          // Move the beginning point to effect easier reflection
          rectY = yStart - 2 * REFLECT_NUM * imageHeight;
          
          // Set the index used in position calculations 
          //  to be the index reflected along y = MID_INDEX
          var newInd = 2 * MID_INDEX - a;

          lnDataDist = (Math.log(newInd) / LOG_BASE - SHRINK); 

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

        // Size computation
        //size = (volume+0.125) * (volume+0.125) * BASE_DOT_SIZE + Math.random() * 2;
        //size *= 0.56;
        
        
        size = Math.pow(volume + 0.125, 2) * BASE_DOT_SIZE;
        
        //Make some of the circles very big
        /*
        if (Math.random() > 0.999) {
          size *= (audioData[a] * 0.2) * Math.random();
          volume *= Math.random() * 0.2;
        }
        */
    
        var renderVals = {
          /*
          The transparency depends on this complicated expression. 
          Basically, it takes the volume, translates the lowest value 
           so it is at 1, subtracts 0.1 from that, and squares it.
          Having the alpha depend on volume^2 helps to reduce the visual
           impact of noise on the overall appearance, and focuses attention
           onto the louder parts (which should matter more than the quieter parts)
          */
          alpha: Math.pow(volume + (1-VOLUME_THRESH - 0.1), 2) * BASE_ALPHA,
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
