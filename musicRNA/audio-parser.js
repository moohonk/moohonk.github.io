/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 * For licensing see moohonk.github.io/musicRNA/LICENSE
 */
window.AudioContext =
  window.webkitAudioContext ||
  window.mozAudioContext ||
  window.msAudioContext ||
  window.oAudioContext ||
  window.AudioContext;

function AudioParser(dataSize, onAudioDataDecoded) {

  "use strict";

  var SHOULD_DISPLAY_STUFF = false;
  var SHOULD_CONSOLE_DEBUG = true;
  var shouldCollectPData   = true;
  this.setConsole = function(bool){
    SHOULD_CONSOLE_DEBUG = bool;
  };
  this.setDisplay = function(bool){
    SHOULD_DISPLAY_STUFF = bool;
  };

  var offlineMult = 4;
  var number = 44100;
  var audioContext = new AudioContext();
  var analyser     = audioContext.createAnalyser();
  var gainNode     = audioContext.createGain();
  
  var aBuffer = new Uint8Array(2048);
  var bBuffer = new Uint8Array(2048);
  var cBuffer = new Uint8Array(2048);
  var pData   = 0;
  var temp = new Uint8Array(2048);
  var startTime = 0;
  var pDataBuffer = new Uint8Array(dataSize * offlineMult);

  var offlineCtx = new OfflineAudioContext(2,1,number);
  var analyser2 = offlineCtx.createAnalyser();
  
  // analyser2.smoothingTimeConstant = 0.2;
  // analyser2.fftSize = dataSize;
  
  this.offlineSampleRate = number;
  this.sampleRate = audioContext.sampleRate;  

  var sourceNode           = null;
  var audioRenderer        = null;
  var offlineSourceNode    = null;
  var audioDecodedCallback = null;
  var timePlaybackStarted  = 0;
  var ArrayBuffer;

  analyser.smoothingTimeConstant = 0.2;
  analyser.fftSize               = dataSize;
  gainNode.gain.value            = 0.5;
  
  audioDecodedCallback = onAudioDataDecoded;

  function time(){
    return (performance.now() - startTime);
  }

  function myFunc(buffer) {

    offlineCtx = new OfflineAudioContext(2,number*20,number);
    analyser2 = offlineCtx.createAnalyser();
    analyser2.smoothingTimeConstant = 0.2;
    analyser2.fftSize = dataSize * offlineMult;
    var gainNode2 = offlineCtx.createGain();
    gainNode2.gain.value = 0.5;

    if(SHOULD_CONSOLE_DEBUG)
      console.log("myFunc " + time());
    //console.log(buffer);
    if (offlineSourceNode) {
      if (offlineSourceNode.playbackState === offlineSourceNode.PLAYING_STATE)
        offlineSourceNode.stop();

      offlineSourceNode = null;
    }

    // Make a new source
    offlineSourceNode = offlineCtx.createBufferSource();
    offlineSourceNode.loop = false;

    offlineSourceNode.connect(gainNode2);
    gainNode2.connect(analyser2);
    analyser2.connect(offlineCtx.destination);

    
    // Set it up and play it
    offlineSourceNode.buffer = buffer;
    offlineSourceNode.start();
    var time1 = performance.now();
    
    // Start gathering the data into the pre data list
    // requestAnimFrame(collectPreprocessData);
    var sum = 0;
    analyser2.getByteFrequencyData(bBuffer);

    for (var i = 0; i < dataSize * offlineMult / 2; i++)
      sum += bBuffer[i];
    if(SHOULD_CONSOLE_DEBUG)
      console.log("Hi " + sum);


    //console.log("bBuffer");
    //console.log(bBuffer);
    offlineCtx.startRendering().then(function(abuffer) {
      if(SHOULD_CONSOLE_DEBUG)
        console.log("time: " + time());
      var time2 = performance.now();
      shouldCollectPData = false;
      //requestAnimFrame(collectPreprocessData);

      
      if(SHOULD_CONSOLE_DEBUG){
        console.log("pData: " + pData);
        console.log("Doing the audio took " + (time2 - time1) + " milliseconds.");}
      analyser2.getByteFrequencyData(cBuffer);
      var sum = 0;
      for (var i = 0; i < dataSize * offlineMult / 2; i++)
        sum += cBuffer[i];
      if(SHOULD_CONSOLE_DEBUG)
        console.log("onCompleteSum " + sum);

      // console.log("cBuffer");
      // console.log(cBuffer);
      //analyser2.getByteFrequencyData(aBuffer);
      // console.log(aBuffer);
      // offlineCtx.close();
    });
    

    // analyser2.getByteFrequencyData(aBuffer);
    window.setTimeout(function(){audioContext.decodeAudioData(ArrayBuffer, onDecodeData, onError);}, 100);
    temp = aBuffer;
  }

  // function collectPreprocessData()
  // {
  //   if(SHOULD_CONSOLE_DEBUG)
  //     console.log("cPData " + time());
  //   analyser2.getByteFrequencyData(bBuffer);
  //   var sum = 0;
  //   for (var i = 0; i < dataSize * offlineMult / 2; i++)
  //     sum += bBuffer[i];
  //   pData += sum;
  //   console.log(sum + '\t' + pData);
  //   if (shouldCollectPData)
  //     requestAnimFrame(collectPreprocessData);
  // }

  function onDecodeData (buffer) {
    if(SHOULD_CONSOLE_DEBUG)
      console.log("onDecodeData " + time());
    // Kill any existing audio
    if (sourceNode) {
      if (sourceNode.playbackState === sourceNode.PLAYING_STATE)
        if(SHOULD_DISPLAY_STUFF)
          sourceNode.stop();

      sourceNode = null;
    }

    // Make a new source
    if (!sourceNode) {

      sourceNode = audioContext.createBufferSource();
      sourceNode.loop = false;

      sourceNode.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(audioContext.destination);
    }

    // Set it up and play it
    sourceNode.buffer = buffer;
    if(SHOULD_DISPLAY_STUFF)
      sourceNode.start();

    timePlaybackStarted = Date.now();

    audioDecodedCallback(buffer);

  }

  function onError() {
    alert("Hmm, couldn't parse that file. Try something else?");
  }

  this.getAnalyserAudioData = function (arrayBuffer) {
    analyser.getByteFrequencyData(arrayBuffer);
  };

  this.getPreprocess = function(){
    return pData;
  };

  this.getPreprocessedData = function (arrayBuffer){
    if(SHOULD_CONSOLE_DEBUG)
      console.log("getpData " + time());

    analyser2.getByteFrequencyData(arrayBuffer);
  };
  

  this.preprocess = function(arrayBuffer){
    startTime = performance.now();
    ArrayBuffer = arrayBuffer;
    if(SHOULD_CONSOLE_DEBUG)
    {
      console.log("prePr " + time());
    }
    offlineCtx.decodeAudioData(arrayBuffer, myFunc      , onError);
  };

  this.parseArrayBuffer = function (arrayBuffer) {
    if(SHOULD_CONSOLE_DEBUG)
      console.log("pArBf " + time());
    //offlineCtx.decodeAudioData(arrayBuffer, myFunc      , onError);
    //audioContext.decodeAudioData(arrayBuffer, onDecodeData, onError);
  };

  this.getTime = function() {
    return (Date.now() - timePlaybackStarted) * 0.001;
  };

}
