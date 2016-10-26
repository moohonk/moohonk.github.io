/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 * For licensing see http://lab.aerotwist.com/canvas/music-dna/LICENSE
 */

function AudioRenderer() {
  "use strict";
  var LOGBASE = 32;
  var LOWERBOUND = 8;
  var LOG_MAX = Math.log(207);
  LOG_MAX = Math.log(LOGBASE);
  var REFLECT_NUM = 0.25; // Percent of the image to reflect

  
  var MAX_DOT_SIZE = 1;
  var BASE = Math.log(LOWERBOUND) / LOG_MAX;
  var maxLogVal = Math.log(2037/LOWERBOUND) / LOG_MAX;
  maxLogVal     = Math.log(128            ) / LOG_MAX;
  var MID_INDEX = (LOWERBOUND * Math.pow(128, REFLECT_NUM)); // The index displayed in the middle of the frequency graph

  var REFLECT_SCALAR = REFLECT_NUM / ((Math.log(2 * MID_INDEX) / LOG_MAX - BASE) / maxLogVal - REFLECT_NUM); //The number to multiply the y-diff by in the reflected portion to have stuff line up
  console.log(REFLECT_SCALAR);
  var TAU = Math.PI * 2;

  var SHOULD_DRAW_GUIDELINES = false;
  var canvas = document.getElementById('render-area');
  var ctx = canvas.getContext('2d');
  var maxDist = 0;
  var maxSize = 0;
  var flag = 0;
  var prevMax = 0;
  var width = 0;
  var height = 0;
  var outerRadius = 0;
  var borderPercentX = 0.125;
  var borderPercentY = 0.25;
  var renderData = {
    width: 0,
    height: 0,
    values: [],
    radius: 0,
    maxWid: canvas.offsetWidth  * (1 - 2 * borderPercentX),
    maxHgt: canvas.offsetHeight * (1 - 4 * borderPercentX),
    bPX: 0.125,
    bPY: 0.25
  };

  function onResize() {
    width  = canvas.offsetWidth;
    height = canvas.offsetHeight;
    outerRadius = Math.min(width, height) * 0.49;

    canvas.width  = width;
    canvas.height = height;

    renderData.width  = width;
    renderData.height = height;
    renderData.radius = outerRadius;

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

  this.render = function(audioData, normalizedPosition) {

    var angle = Math.PI - normalizedPosition * TAU;
    var color = 0;
    var lnDataDistance = 0;
    var distance = 0;
    var size = 0;
    var volume = 0;
    var power = 0;

    var imageWidth  = width  * (1 - 2 * borderPercentX);
    var imageHeight = height * (1 - 2 * borderPercentY);
    var yStart = imageHeight + height * borderPercentY ;
    var rectX = width * borderPercentX + imageWidth * normalizedPosition;
    var rectY = 0.0;
    var stuffHappened = false;
    
    if (normalizedPosition <= 1)
    {
      /*
      var x = Math.sin(angle);
      var y = Math.cos(angle);
      var midX = width * 0.5;
      var midY = height * 0.5;
      */
      // There is so much number hackery in here.
      // Number fishing is HOW YOU WIN AT LIFE.
      //for (var a = 1023; a >= 8; a--) {


      for (var a =  850; a >= 0; a--) {
        volume = audioData[a] / 255;

        if (volume < 0.675)
          continue;

        //color = normalizedPosition - 0.12 + Math.random() * 0.24;

        color = (a / 1024);
        color = Math.round(color * 360);

        //lnDataDistance = (Math.log(a - 2.81) / LOG_MAX) - BASE;
        //lnDataDistance = (Math.log(a - 11  ) / LOG_MAX) - BASE;

        lnDataDistance = Math.log(a) / LOG_MAX - BASE;
        rectY = yStart - imageHeight * (lnDataDistance / maxLogVal);
        if (a < MID_INDEX)
        {
          // Move the start to the middle
          rectY = yStart - .5 * imageHeight;

          //rectY = yStart - REFLECT_NUM * imageHeight;
          // Set the index used in position calculations 
          //  to be the index reflected along y = MID_INDEX
          var newInd = a + 2 * (MID_INDEX - a);

          lnDataDistance = (Math.log(newInd) / LOG_MAX - BASE) / maxLogVal; 

          // move away from the middle
          rectY += imageHeight * ((lnDataDistance - REFLECT_NUM) * REFLECT_SCALAR + REFLECT_NUM);
        }
        /*
        distance = a / 850 * imageHeight;
        rectY = yStart - distance;
        */

        //Make the dot's distance from the center vary exponentially with frequency
        //distance = lnDataDistance * outerRadius;


        //maxDist = Math.max(maxDist,  (lnDataDistance / maxLogVal));

        //Make the dot's distance from the center vary linearly with frequency
        //distance = (a / audioData.length) * outerRadius;
        size = volume * MAX_DOT_SIZE + Math.random() * 2;
        size = (volume+0.125) * (volume+0.125) * MAX_DOT_SIZE + Math.random() * 2;
        size *= 0.56;
        //Make some of the circles very big
        //Action: deactivate, see if abolutely essential (probs not)
        /*if (Math.random() > 0.995) {
          size *= (audioData[a] * 0.2) * Math.random();
          volume *= Math.random() * 0.25;
        }*/

        var renderVals = {
          //alpha: volume * 0.09,
          alpha: volume * volume * 0.09,
          color: color,
          //x: normalizedPosition,
          x: rectX,
          //y: lnDataDistance / maxLogVal,
          y: rectY,
          size: size
        };

        ctx.globalAlpha = renderVals.alpha;
        if (flag < a && volume > 0.675)
        {
          ctx.fillStyle = 'hsl(' + renderVals.color + ', 80%, 50%)';
          flag = a;
          ctx.globalAlpha = 0.1;
          maxDist = a;

          ctx.beginPath();
          ctx.arc(rectX, rectY, 5, 0, TAU, false);
          ctx.closePath();
          ctx.fill();

        }
        else
        {
          ctx.fillStyle = 'hsl(' + renderVals.color + ', 80%, 50%)';
          maxSize = Math.max(maxSize, renderVals.size);
        }
        //ctx.fillStyle = 'hsl(' + renderVals.color + ', 80%, 100%)';
        ctx.beginPath();
        /*ctx.arc(
          midX + renderVals.x,
          midY + renderVals.y,
          renderVals.size, 0, TAU, false);*/

  // Make the DNA thing a biiiig rectangle

        ctx.arc(rectX, rectY, renderVals.size, 0, TAU, false);
        ctx.closePath();
        ctx.fill();
        stuffHappened = true;
        renderData.values.push(renderVals);
      }
      if(prevMax != maxDist)
        {
          prevMax = maxDist;
          console.log("maxDist:\t" + maxDist + '\tmaxSize:\t' + maxSize);
        }
      if(stuffHappened && SHOULD_DRAW_GUIDELINES)
      {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'hsl(200, 100%, 100%)';
        ctx.beginPath();
        ctx.arc(rectX, yStart - .25*imageHeight, 0.5, 0, TAU, false);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rectX, yStart, 0.5, 0, TAU, false);
        ctx.closePath();
        ctx.fill();
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
