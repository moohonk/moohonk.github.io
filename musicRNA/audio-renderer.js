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
  var MAX_INDEX       = 850  ; // The maximum index to look at in the frequency list
  var BASE_DOT_SIZE   = 1.0  ; // The default dot radius
  var BASE_ALPHA      = 0.09 ; // The base transparency for each dot
  var VOLUME_THRESH   = 0.675; // The lowest volume level for which we actually display something
  var VOLUME_THRESH_TIMES_255 = 255 * VOLUME_THRESH;
  var PROGRESS_WIDTH  = 1    ;
  var PROGRESS_HEIGHT = 4    ;
  var new_dot_size    = 1.0  ;
  var new_alpha       = 0.09 ;
  var minBound        = 0.3  ;
  var maxBound        = 0.85 ;
  var c               = 0.74 ;
  var UUY =      borderPercentY  * height - MAX_DOT_SIZE; // Upper progress bar y-coord
  var LUY = (1 - borderPercentY) * height + MAX_DOT_SIZE;             // Lower progress bar y-coord

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
  var frameCount  = 0;
  var amplitude   = 0;
  var prevXCoord  = 0;
  var prevSongTime = 0;
  var previousX   = -1;

  //var totalTime   = 0.0;
  var xIntens     = 0;
  var times = [0, 0, 0, 0, 0];
  
  var totalAudioPoints = 0; // The total number of data points ever
  var survivingPoints  = 0; // The number of points that got past the volume culling
  var totalVolume      = 0; // The sum of all the volumes ever
  var culledVolume     = 0; // The sum of the volumes that got past the culling

  var SHOULD_DISPLAY_STUFF = false;
  var SHOULD_CONSOLE_DEBUG = false;
  var should_redraw_prog   = false;

  var xSt, ySt;
  var prevWid = 0;
  var prevHgt = 0;

  function linReg(x){
    var retVal = 0;
    //retVal = 60.467179501 * x + 0.598067347081808 + 0.1;

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

  this.clearCanvas = function(){
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
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
    bPY: borderPercentY,
    waveforms: []
  };

  // Called whenever the screen changes size or a new file is uploaded
  function drawBackground() {
    totalAudioPoints = 0;
    survivingPoints  = 0;
    totalVolume      = 0;
    culledVolume     = 0;

    // Reset the transparency, otherwise the screen will be really dark
    ctx.globalAlpha = 1.0;
    console.log(imageWidth);

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

    console.log("did a thing");
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
    
    UUY = borderPercentY * height - MAX_DOT_SIZE;// - PROGRESS_HEIGHT; // Upper progress bar y-coord
    LUY = (1 - borderPercentY) * height + MAX_DOT_SIZE;             // Lower progress bar y-coord

    if (previousX == -1)
      previousX = borderPercentX * width;

    if (prevHgt == 0 || prevWid == 0)
    {
      prevWid = width;
      prevHgt = height;
      hasDrawnBackground = false;
    }
    if (width != prevWid || height != prevHgt)
    {
      //ctx.setTransform(width / prevWid, 0, 0, height / prevHgt, 0, 0);
    }
    prevHgt = height;
    prevWid = width;

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
    xSt = width * borderPercentX;

    ctx.globalCompositeOperation = "lighter";
    hasDrawnBackground = false; 

    mSlope = (c-1) / mid;

    new_dot_size = BASE_DOT_SIZE * imageWidth / 1440;
    console.log("The Base Dot Size is " + new_dot_size);

    // We need to redraw the progress bars next frame
    should_redraw_prog = true;
    
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(val, min));
  }
  
  // Clears / resets the canvas
  // Called by other .js files
  this.clear = function() 
  {
    ctx.clearRect(0, 0, width, height);
    hasDrawnBackground = false;
    renderData.values.length = 0;
    if(SHOULD_CONSOLE_DEBUG)
      console.log("Clear");
  };

  function drawWaveform(songTime, xPosition)
  {
    var currentX       = Math.floor(xPosition - PROGRESS_WIDTH);

    // The time length of the current waveform chunk
    var chunkLength    = songTime - prevSongTime;

    // The average intensity of the audio in the current chunk
    // The total amplitude is divided by:
    // - the time length (seconds) of the current chunk
    // - the number of frequency samples in each slice of audio
    // - the number of audio slices per second
    // - the maximum value a single frequency chunk can have
    var intensity      = amplitude / (chunkLength * MAX_INDEX * 60 * 255);

    // The height (in pixels) of the current waveform slice
    var waveformHeight = intensity * borderPercentY * height;
    
    // The precision we are working with is in fractions of pixels
    // The canvas doesn't really like fractions of pixels -- it likes to round things off
    // This roundoff normally makes a pattern of tiny spaces between slices 
    // to combat this, we want to expand the width of each waveform slice a tiny bit, so it looks prettier
    // The amount to increase the width of waveform bar heights so that the waveform looks solid
    var expandAmount = 0;
    
    // Draw the next chunk of the waveform
    ctx.fillStyle = '#444';
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    var leftXCoord = previousX - expandAmount;
    var rightXCoord = currentX;
    //           top left X coordinate   | top left Y coord    | width of the rectangle             | height 
    ctx.fillRect(previousX - expandAmount, UUY - waveformHeight, currentX - previousX + expandAmount, waveformHeight);
    ctx.fillRect(previousX - expandAmount, LUY                 , currentX - previousX + expandAmount, waveformHeight);

    ctx.globalCompositeOperation = "lighter";
    var waveVals = {
      normPosition: (leftXCoord - borderPercentX * width) / ((1 - 2 * borderPercentX) * width),
      chunkWidth: (rightXCoord - leftXCoord) / ((1 - 2 * borderPercentX) * width),
      waveHeight: intensity
    };
    
    renderData.waveforms.push(waveVals);

    // Upkeep things 
    prevSongTime = songTime;
    previousX    = currentX;
    amplitude    = 0;

  }

  function drawCircle(x, y, color, size, alpha)
  {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'hsl(' + color + ', 80%, 50%)';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU, false);
    ctx.closePath();
    ctx.fill();
  }

  // Called for each slice of the audio that needs displaying
  this.render = function(audioData, audioTime, audioDuration) 
  {
    frameCount = frameCount + 1;
    var normalizedPosition = audioTime / audioDuration;
    //var startTime = performance.now();
    //var t;
    if(!hasDrawnBackground)
    {
      console.log("herpy derp drawing a background");
      if(SHOULD_CONSOLE_DEBUG)
        console.log("Has Not Drawn Background");
      drawBackground();
    }

    // Just some variables
    var volume     = 0;
    var color      = 0;
    var size       = 0;
    
    // Calculate the coordinates for each dot
    // The X can be specified here because it changes with time (and not frequency)
    var rectX = width * borderPercentX + imageWidth * normalizedPosition;
    var rectY = 0.0;
    
    var absX = 0, absY = 0;
    absX = normalizedPosition;
    // Has the song ended yet?
    if (normalizedPosition <= 1)
    {
      // Make sure that drawing points on top of other points 
      //  will make the overall color brighter.
      // Antialiasing and all that.
      ctx.globalCompositeOperation = 'lighter';

      for (var a = MAX_INDEX; a >= 0; a--) 
      {    

        // Normalize volume to a value 
        volume = audioData[a];

        // Record how much volume this frequency range has
        amplitude += volume;

        // Volume threshhold
        // If the volume is below a certain value, display nothing for that point.
        if (volume < VOLUME_THRESH_TIMES_255)
          continue;
        
        // Only normalize the volume if it's going to be important
        volume = volume / 255;

        // Map frequency to hue
        // Why 1024 and not MAX_INDEX? Because I said so, that's why.
        //  Also, this way the colors only go up to purplish-blue and not into pinks.
        //  Because I want it to look like audio frequency maps to light frequency.
        color = Math.round(a * 360 / 1024);
        rectY = height * borderPercentY;

        // Use linear scaling if the index is below a certain point (because the log gets ugly)
        // If the index is above that point, its okay to use a log
        if (a <= mid)
          absY = mSlope * a + 1;
        else
          absY = (c - 1) * Math.log(a / MAX_INDEX);
      
        rectY += absY * imageHeight;

        // Size computation
        size = Math.pow(volume + 0.125, 2) * new_dot_size;

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
          alpha: Math.pow(volume + (1-VOLUME_THRESH - 0.1), 2) * new_alpha,
          color: color,
          aX: absX,
          aY: absY,
          size: size
        };

        // Draw the point on the canvas
        drawCircle(rectX, rectY, color, size, renderVals.alpha);

        // Store the info for this point
        renderData.values.push(renderVals);
      }

      // Draw the progress bar / waveform
      if(frameCount % 6 == 0)
        drawWaveform(audioTime, rectX);
    }
  };

  // Various functionality for changing parameters based on the current song
  this.beDynamic = function(pData, audioDuration, sampleRate, dataSize)
  {
    //this.resetFrameCount();
    //prevWavX = borderPercentX*width;

    // The longer the song, the more dots will overlap (because they need to fit more dots into the same space)
    // This makes longer songs seem brighter by default, and shorter songs seem dimmer by comparison. 
    // Here, we modify the transparency of each dot so that dots are more meaningful in short songs 
    //  and less meaningful in longer songs.
    if (audioDuration > 240)
      new_alpha = BASE_ALPHA * 240 / audioDuration;

    if (audioDuration < 90)
      new_alpha = BASE_ALPHA * 90 / audioDuration;
    console.log("new alpha : " + new_alpha);

    // Nicely format the length of the song and display it in the console
    var mins = Math.floor(audioDuration / 60);
    var secs = Math.round(audioDuration % 60);
    var stng = secs + "s";
    if (secs < 10) stng = "0" + stng;
    stng = mins + "m" + stng;
    console.log(stng);


    var divConst = (dataSize / 2) * sampleRate;
    var x   = pData / divConst;
    var xs  = (x * 10000) + "e-4";
    console.log("timesCalled: " + timesCalled);
    if (timesCalled == 0)
    {
      console.log("Average Intensity: ");
      console.log(xs);
    }
    xIntens = x;

    // Determine what the threshold should be for this song's volume level
    if (displayMode)
    {
      VOLUME_THRESH = linReg(x);
      VOLUME_THRESH_TIMES_255 = VOLUME_THRESH * 255;
    }

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
        VOLUME_THRESH = Math.round( Math.pow(10, 15) * VOLUME_THRESH ) / Math.pow(10, 15);
      }
      else // Threshold needs to be lower
      {
        // Adjust the bounds for the next iteration
        maxBound = VOLUME_THRESH;
        // Binary Searchy
        VOLUME_THRESH = (VOLUME_THRESH + minBound) / 2;
        VOLUME_THRESH = Math.round( Math.pow(10, 15) * VOLUME_THRESH ) / Math.pow(10, 15);
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
  // Resets the amount of times DisplayAudioStats has been called so things will work right for dropping a new file in
  this.resetTimesCalled = function(){
    timesCalled = 0;
  };

  this.resetFrameCount = function(){
    frameCount = 0;
  };

  window.addEventListener('resize', onResize, false);
  window.addEventListener('load', function() {
    onResize();
  }, false);
}
