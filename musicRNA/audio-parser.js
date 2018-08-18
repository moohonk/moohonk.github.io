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

  var SHOULD_DISPLAY_STUFF = true;
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
  
  var tempBuffer = new Uint8Array(2048);
  var pData      = 0;
  var startTime  = 0;
  //var pDataBuffer = new Uint8Array(dataSize * offlineMult);

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
  var arraybuffer;
  //var arraybuffer2;

  analyser.smoothingTimeConstant = 0.2;
  analyser.fftSize               = dataSize;
  gainNode.gain.value            = 0.5;
  
  audioDecodedCallback = onAudioDataDecoded;

  function time(){
    return (performance.now() - startTime);
  }

  function copy(src)  {
    var dst = new ArrayBuffer(src.byteLength);
    new Uint8Array(dst).set(new Uint8Array(src));
    return dst;
  }
  function copyBuffer(buffer)
  {
      var bytes = new Uint8Array(buffer);
      var output = new ArrayBuffer(buffer.byteLength);
      var outputBytes = new Uint8Array(output);
      for (var i = 0; i < bytes.length; i++)
          outputBytes[i] = bytes[i];
      return output;
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

    // If the background source is currently playing, stop it
    if (offlineSourceNode) {
      if (offlineSourceNode.playbackState === offlineSourceNode.PLAYING_STATE)
        offlineSourceNode.stop();

      offlineSourceNode = null;
    }

    // Make a new source
    offlineSourceNode = offlineCtx.createBufferSource();
    offlineSourceNode.loop = false;
    if(SHOULD_CONSOLE_DEBUG)
      console.log("created offline source node");

    // Connect everything to everything
    offlineSourceNode.connect(gainNode2);
    gainNode2.connect(analyser2);
    analyser2.connect(offlineCtx.destination);

    if(SHOULD_CONSOLE_DEBUG)
      console.log("connected nodes");
    
    // Set it up and play it
    offlineSourceNode.buffer = buffer;
    offlineSourceNode.start();
    var time1 = performance.now();
    
    // Start gathering the data into the pre data list

    offlineCtx.startRendering().then(
      function(abuffer) 
      {
        var time2 = performance.now();
        shouldCollectPData = false;

        if(SHOULD_CONSOLE_DEBUG)
        {
          console.log("pData: " + pData);
          console.log("Doing the audio took " + (time2 - time1) + " milliseconds.");
        }

        analyser2.getByteFrequencyData(tempBuffer);
      });

    window.setTimeout(function()
      {
        if(SHOULD_CONSOLE_DEBUG)
          console.log("ArrayBuffer:", arraybuffer);
        audioContext.decodeAudioData(arraybuffer, 
          function(buffer){
            
            if(SHOULD_CONSOLE_DEBUG)
            {
              console.log("decData");
              console.log("onDecodeData " + time());
            }

            // Kill any existing audio
            if (sourceNode) 
            {
              if (sourceNode.playbackState === sourceNode.PLAYING_STATE)
                if(SHOULD_DISPLAY_STUFF)
                  sourceNode.stop();

              sourceNode = null;
            }

            // Make a new source
            if (!sourceNode) 
            {
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
        , onError);
      }, 150);

    function onDecodeData (buffer) {
        console.log("Data decoded");
      }
  }
  
  function onError() {
    alert("Hmm, couldn't parse that file. Try something else?");
  }

  this.getAnalyserAudioData = function (arrayBuffer) {
    if(SHOULD_CONSOLE_DEBUG)
      console.log("getAnalyserAudioData");
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
    
    arraybuffer = copy(arrayBuffer);
    if(SHOULD_CONSOLE_DEBUG)
    {
      console.log("preProcess " + time());
      console.log(arrayBuffer);
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

  this.resume = function() {
    audioContext.resume();
  }

}
