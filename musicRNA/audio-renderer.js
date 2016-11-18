/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 * For licensing see moohonk.github.io/musicRNA/LICENSE
 */
function AudioRenderer() 
{
  "use strict";
  var TAU = Math.PI * 2;
  
  // Constants
  var LOGBASE       = 32;   // The logbase used
  var MAX_INDEX     = 850;  // The maximum index to look at in the frequency list
  var LOWERBOUND    = 8;    // The value that BASE depends on
  var REFLECT_NUM   = 0.25; // Precentage of the mapping to be on a reversed log scale
  var BASE_DOT_SIZE = 1.0;  // The default dot radius
  var BASE_ALPHA    = 0.09; // The base transparency for each dot
  var VOLUME_THRESH = 0.675;// The lowest volume level for which we actually display something

  // The percent of the screen we should leave for the border
  var borderPercentX = 0.03125;
  var borderPercentY = 0.25;
  
  //Dependent constants
  
  //The absolute maximum radius a dot can have
  var MAX_DOT_SIZE = Math.pow(1.125, 2) * BASE_DOT_SIZE;
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

  // Variables

  var canvas = document.getElementById('render-area');
  var ctx = canvas.getContext('2d');
  var hasDrawnBackground = false;
  var imageWidth  = 0;
  var imageHeight = 0;
  var yStart      = 0;
  var height      = 0;
  var width       = 0;
  var timesCalled = 0;
  
  var volumeArray = Array(850);
  for (var i = 0; i < 850; i++)
    volumeArray[i] = 0;
  var numNonZeros = 0;
  
  var totalAudioPoints = 0; // The total number of data points ever
  var survivingPoints  = 0; // The number of points that got past the volume culling
  var totalVolume      = 0; // The sum of all the volumes ever
  var culledVolume     = 0; // The sum of the volumes that got past the culling
  
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

  // Called whenever the screen changes size or a new file is uploaded
  function drawBackground() {
    totalAudioPoints = 0;
    survivingPoints  = 0;
    totalVolume      = 0;
    culledVolume     = 0;
    // Reset the transparency, otherwise the screen will be really dark
    ctx.globalAlpha = 1.0;

    // So we can draw items over things without the things affecting the items
    ctx.globalCompositeOperation = "source-over";
    
    // Make a slightly gray background 
    //  (and paint it over everything drawn previously)
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    // Have the drawing area be a darker color (in this case black)
    //  because contrast
    //  I'm a programmer, not a graphic designer, okay? Get off my back.
    ctx.fillStyle = '#000';
    ctx.fillRect(borderPercentX * width - MAX_DOT_SIZE, borderPercentY * height - MAX_DOT_SIZE, 
                 imageWidth     +     2 * MAX_DOT_SIZE, imageHeight    +      2 * MAX_DOT_SIZE);

    // We have, indeed, drawn the background
    hasDrawnBackground = true;

    // Let the things affect the items once more 
    //  (hypothetical situation continued from ^^ up there)
    ctx.globalCompositeOperation = "lighter";    
  }

  // Called whenever the screen changes size
  function onResize() 
  {
    // What are the new width and height?
    width  = canvas.offsetWidth;
    height = canvas.offsetHeight;

    // Interesting tidbit: these lines actually reset EVERYTHING about the canvas.
    //   It's like making an entirely new canvas in the same place as the old one.
    canvas.width      = width;
    canvas.height     = height;

    // Store the width and height so that the hi-res renderer knows
    renderData.width  = width;
    renderData.height = height;
    
    // Calculate the width and height of where we will actually be drawing
    imageWidth  = width  * (1 - 2 * borderPercentX);
    imageHeight = height * (1 - 2 * borderPercentY);
    
    // For to helping with coordinate calculation
    yStart = imageHeight + height * borderPercentY ;

    ctx.globalCompositeOperation = "lighter";
    hasDrawnBackground = false; 
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(val, min));
  }
  
  // Clears / resets the canvas
  // Called by other scripts
  this.clear = function() {
    ctx.clearRect(0, 0, width, height);
    hasDrawnBackground = false;
    renderData.values.length = 0;
    console.log("Clear");
  };

  // Called for each slice of the audio that needs displaying
  this.render = function(audioData, normalizedPosition) 
  {
    if(!hasDrawnBackground)
    {
      console.log("Has Not Drawn Background");
      drawBackground();
    }
    // Just some variables
    var lnDataDist = 0;
    var normVol    = 0;
    var volume     = 0;
    var color      = 0;
    var size       = 0;
    
    // Coordinates for each dot
    // The X can be specified here because it changes with time (and not frequency)
    var rectX = width * borderPercentX + imageWidth * normalizedPosition;
    var rectY = 0.0;

    // Nothing's happened . . . yet
    var stuffHappened = false;
    
    // Has the song ended yet?
    if (normalizedPosition <= 1)
    {
      // Make sure that drawing points on top of other points 
      //  will make the overall color brighter.
      // Antialiasing and all that.
      ctx.globalCompositeOperation = 'lighter';
      for (var a = MAX_INDEX; a >= 0; a--) 
      {          
        // Add the current volumes to the totals
        volumeArray[a] += (audioData[a] / 255);
        // Normalize volume
        volume = audioData[a] / 255;
        
        // Just some analytics. Pay no mind.
        totalAudioPoints++;
        totalVolume += volume;
        
        // Volume threshhold
        // If the volume is below a certain value, display nothing for that point.
        // Yes, this does mean that really quiet songs won't have as many points
        // But it keeps louder / more complicated songs from being too incomprehensible.
        if (volume < VOLUME_THRESH)
          continue;
        
        // More analytics.
        survivingPoints++;
        culledVolume += volume;
        
        // Map frequency to hue
        // Why 1024 and not MAX_INDEX? Because I said so, that's why.
        //  Also, this way the colors only go up to purplish-blue and not into pinks.
        //  Because I want it to look like audio frequency maps to light frequency.
        color = Math.round(a * 360 / 1024);

        // Map the point's y coordinate onto a log scale
        lnDataDist = Math.log(a) / LOG_BASE - SHRINK;
        rectY = yStart - imageHeight * lnDataDist / maxLogVal;
        
        // Check to see if we should use a flipped log scale to map this point
        if (a < MID_INDEX)
        {
          // Move the beginning point to effect easier reflection
          // Trust me with this stuff; I spent a good couple days doing nothing but logs.
          rectY = yStart - 2 * REFLECT_NUM * imageHeight;
          
          // Set the index used in position calculations 
          //  to be the index reflected along y = MID_INDEX
          var newInd = 2 * MID_INDEX - a;

          // The distance from this point to the beginning point
          lnDataDist = (Math.log(newInd) / LOG_BASE - SHRINK); 

          // move away from the beginning point
          rectY += imageHeight * lnDataDist / maxLogVal;
          //                                ^ Make sure you normalize it tho
        }
        
        // Scaling Stuff

        // Translate all y Coords for easier scaling
        rectY -= (yStart - imageHeight * upperLog);

        // Do some scaling
        rectY /= normalizedHeight;

        // Untranslate the y coords into their final form
        rectY += height * borderPercentY;

        // Size computation
        size = Math.pow(volume + 0.125, 2) * BASE_DOT_SIZE;
        
        // Make a JSON object with everything the hi-res renderer needs to draw this point
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

        // Store the info for this point
        renderData.values.push(renderVals);
      }
      timesCalled++;
    }
    
  };
  this.displayAudioStats = function(duration) {
    var nonZeroTotal = 0;
    var numNonZeros  = 0;
    console.log(volumeArray);
    for (var i = 0; i < 850; i++)
    {
      if (volumeArray[i] != 0)
      {
        numNonZeros++;
        nonZeroTotal += (volumeArray[i]);
      }
    }
    console.log("total: " + nonZeroTotal + "  number: " + numNonZeros);
    console.log("Average intensity:\t" + nonZeroTotal / (numNonZeros * duration));
      
  };
  this.getRenderData = function() {
    return renderData;
  };

  window.addEventListener('resize', onResize, false);
  window.addEventListener('load', function() {
    onResize();
  }, false);
}
