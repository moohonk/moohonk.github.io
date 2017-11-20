/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 * For licensing see moohonk.github.io/musicRNA/LICENSE
 */
function AudioRenderer(theMusicRNA) 
{
  "use strict";
  var TAU = Math.PI * 2;
  
  var MusicRNA = theMusicRNA;

  // Booleans
  var displayMode  = true; //Display mode forgoes iterative testing of the song
  var useThreshold = true; //Just in case I want to look at something with no threshold
  var useLinear    = true; //Switch to linear scaling of freqs near the bottom

  // Constants
  var MAX_INDEX     = 850  ; // The maximum index to look at in the frequency list
  var BASE_DOT_SIZE = 1.0  ; // The default dot radius
  var BASE_ALPHA    = 0.09 ; // The base transparency for each dot
  var VOLUME_THRESH = 0.675; // The lowest volume level for which we actually display something
  var minBound      = 0.3  ;
  var maxBound      = 0.85 ;
  var c             = 0.74 ;

  var mid = 850 * Math.exp(c/(c-1));
  var mSlope;

  // The percent of the screen we should leave for the border
  var borderPercentX = 0.03125;
  var borderPercentY = 0.25;
  
  //Dependent constants
  
  //The absolute maximum radius a dot can have
  var MAX_DOT_SIZE = Math.pow(1.125, 2) * BASE_DOT_SIZE;

  // Variables

  var canvas = document.getElementById('render-area');
  var ctx = canvas.getContext('2d');
  var hasDrawnBackground = false;
  var imageWidth  = 0;
  var imageHeight = 0;
  var yStart      = 0;
  var xOffset     = 0;
  var yOffset     = 0;
  var height      = 0;
  var width       = 0;
  var timesCalled = 0;
  var totalTime = 0.0;
  var xIntens   = 0;
  var times = [0, 0, 0, 0, 0];
  
  var totalAudioPoints = 0; // The total number of data points ever
  var survivingPoints  = 0; // The number of points that got past the volume culling
  var totalVolume      = 0; // The sum of all the volumes ever
  var culledVolume     = 0; // The sum of the volumes that got past the culling

  var SHOULD_DISPLAY_STUFF = false;
  var SHOULD_CONSOLE_DEBUG = false;

  function linReg(x){
    var retVal = 0;
    retVal = 60.467179501 * x + 0.598067347081808 + 0.1;

    // Cubic seemed to be the best way to go, so I did it.
    retVal =  -797508447.939692          * Math.pow(x, 3);
    retVal +=    1480587.7038664         * Math.pow(x, 2);
    retVal +=       -507.228872599461    * x;
    retVal +=          0.670058081186047    ;
    //retVal = 0;
    if (!useThreshold)
      return 0;
    if (!displayMode)
      return 0.675;
    return retVal;
  }

  this.setDisplay = function(bool){
    SHOULD_DISPLAY_STUFF = bool;
  };

  this.setConsole = function(bool){
    SHOULD_CONSOLE_DEBUG = bool;
  };
  
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

    // Redraw ALL the points
    // This might need to be taken out for performance reasons 
    // (i.e. if someone just keeps resizing the screen or something)
  }

  // Returns the largest image width possible while keeping the specified width-to-height ratio
  function getNewWidth(canvasWidth, canvasHeight, widHgtRatio)
  {

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



    //*************************************************************************************
    //**    For enforcing one aspect ratio on resize (not currently fully implemented)   **
    //*************************************************************************************
    var whRatio = 0;
    var newWid = width;
    var newHgt = height;
    var widFromHgt = whRatio * height;
    if (widFromHgt < width) 
      newWid = widFromHgt;
    else
      newHgt = width / whRatio;

    // Calculate offsets
    xOffset = (width  - newWid) / 2;
    yOffset = (height - newHgt) / 2;

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

    mSlope = (c-1) * imageHeight / mid;
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
    if(SHOULD_CONSOLE_DEBUG)
      console.log("Clear");
  };

  // Called for each slice of the audio that needs displaying
  this.render = function(audioData, normalizedPosition) 
  {
    var startTime = performance.now();
    var t;
    if(!hasDrawnBackground)
    {
      if(SHOULD_CONSOLE_DEBUG)
        console.log("Has Not Drawn Background");
      drawBackground();
    }
    // Just some variables
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

        t = performance.now();

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

        rectY = height * borderPercentY;
        if (a <= mid) // Use linear scaling if the index is below a certain point (because the log gets ugly)
          rectY += mSlope * a + imageHeight;
        else          // If the index is above that point, its okay to use a log
          rectY += imageHeight * (c - 1) * Math.log(a / MAX_INDEX);

        // Size computation
        size = Math.pow(volume + 0.125, 2) * BASE_DOT_SIZE;
        
        times[0] += performance.now() - t;
        t = performance.now();

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
        times[1] += performance.now() - t;
        t = performance.now();
        
        // Draw the point on the canvas
        ctx.globalAlpha = renderVals.alpha;
        ctx.fillStyle = 'hsl(' + renderVals.color + ', 80%, 50%)';
        ctx.beginPath();
        ctx.arc(rectX, rectY, renderVals.size, 0, TAU, false);
        ctx.closePath();
        ctx.fill();

        // Store the info for this point
        renderData.values.push(renderVals);
        
        times[2] += performance.now() - t;
      }
    totalTime += performance.now() - startTime;
    }
    
  };
  // Hopefully, this will be called on an array containing all of the audio data in the song.
  // Assumming that works, it will modify the starting constants to give the song a better picture.

  //this.beDynamic = function(fullAudioData, audioDuration, sampleRate){
  this.beDynamic = function(pData, audioDuration, sampleRate, dataSize)
  {
    var divConst = (dataSize / 2) * sampleRate;// audioDuration * sampleRate;
    /*
    var sum = 0;
    for(var i = 0; i < 1024; i++)
      sum += fullAudioData[i];
    //console.log(fullAudioData);
    console.log(sum);
    */
    //if(SHOULD_CONSOLE_DEBUG)
    var mins = Math.floor(audioDuration / 60);
    var secs = Math.round(audioDuration % 60);
    var stng = secs + "s";
    if (secs < 10) stng = "0" + stng;
    stng = mins + "m" + stng;
    console.log(stng + " ", sampleRate);

    var x   = pData / divConst;
    var xs  = (x * 10000) + "e-4";
    if (timesCalled == 0)
    {
      console.log("Average Intensity: ");
      console.log(xs);
    }
    xIntens = x;
    // The equation for the threshold as determined by experimentation
    if (displayMode)
      VOLUME_THRESH = linReg(x);

    //m = -0.1 * THRESH_SCALAR * VOLUME_THRESH / (MAX_INDEX - X_INTERCEPT);
    //b =  2   * THRESH_SCALAR * VOLUME_THRESH / (MAX_INDEX - X_INTERCEPT);

    console.log("The dynamic threshold is " + VOLUME_THRESH);
  };

  function binarySearch(actual, expected, error) {
    if (expected - error <= actual && actual <= expected + error)
    {
      console.log(xIntens);
      console.log("We did it.");
      console.log("#########################");
      MusicRNA.stop();
    }
    else {
      if (actual > expected) // Threshold needs to be higher
      {
        // Adjust the bounds for the next iteration
        minBound = VOLUME_THRESH;
        // Binary Search! The thing we should do here
        VOLUME_THRESH = (VOLUME_THRESH + maxBound) / 2;
        // This is the best way I've found to truncate numbers in JavaScript. Idonlikeit.
        VOLUME_THRESH = Math.round(Math.pow(10, 15) * VOLUME_THRESH) / Math.pow(10, 15);
      }
      else // Threshold needs to be lower
      {
        // Adjust the bounds for the next iteration
        maxBound = VOLUME_THRESH;
        // Binary Searchy
        VOLUME_THRESH = (VOLUME_THRESH + minBound) / 2;
        VOLUME_THRESH = Math.round(Math.pow(10, 15) * VOLUME_THRESH) / Math.pow(10, 15);
      }
      console.log("Next: " + VOLUME_THRESH);
    }
    if (displayMode)
      MusicRNA.stop();
  }

  this.displayAudioStats = function(duration, sampleRate) {
    timesCalled++;
    var divConst = 850 * duration * sampleRate; // The dividing constant
    var avgInt   = totalVolume  / divConst;
    var culInt   = culledVolume / divConst;

    console.log("avgInt ", avgInt);
    console.log("thresh ", VOLUME_THRESH);
    console.log("culInt ", culInt);


    avgInt = Math.round(1000000000  * avgInt) / 100000; // The average intensity is normally on the order of 10^(-4).
    culInt = Math.round(10000000000 * culInt) / 100000; // The culled intensity should be on the order of 10^(-5).


    var intWindow = 0.035; // Error margins for the intensity
    var target    = 2.150;
    if (!displayMode)
      binarySearch(culInt, target, intWindow);
    else
      MusicRNA.stop();
  };
  this.getRenderData = function() {
    return renderData;
  };

  window.addEventListener('resize', onResize, false);
  window.addEventListener('load', function() {
    onResize();
  }, false);
}
