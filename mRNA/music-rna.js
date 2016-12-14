/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 * For licensing see moohonk.github.io/musicRNA/LICENSE
 */

function MusicRNA() {

  "use strict";

  var DATA_SIZE = 2048;
  var SAVE_SIZE = {
    normal: 'small',
    large: 'large',
    enormous: 'enormous'
  };
  

  var audioParser    = new AudioParser(DATA_SIZE, onAudioDataParsed);
  var audioRenderer  = new AudioRenderer(this);
  this.audioRenderer = audioRenderer;

  var SHOULD_DISPLAY_STUFF = true;
  var SHOULD_CONSOLE_DEBUG = false;
  audioParser  .setDisplay(SHOULD_DISPLAY_STUFF);
  audioRenderer.setDisplay(SHOULD_DISPLAY_STUFF);
  audioParser  .setConsole(SHOULD_CONSOLE_DEBUG);
  audioRenderer.setConsole(SHOULD_CONSOLE_DEBUG);

  var audioData      = new Uint8Array(DATA_SIZE);
  var audioData2     = new Uint8Array(DATA_SIZE);
  var pData  = new Array(1024);
  var preProcessedData = new Float32Array(DATA_SIZE);
  var audioDuration  = 1;
  var audioTime      = 0;
  var audioPlaying   = false;
  var time           = document.getElementById('time');
  var theFile = null;
  var weShouldStop = false;
  var fileName       = '';
  var songFileName = '';

  var percents = 5;
  var pcntArray = new Array(percents);
  for(var i = 0; i < percents; i++) pcntArray[i] = 0;
  

  var saveNormal       = document.getElementById('save-normal');
  var saveLarge        = document.getElementById('save-large');
  var saveEnormous     = document.getElementById('save-enormous');
  var saveAndDownload  = document.getElementById('save-and-download');
  var saveButtons      = document.getElementById('save-and-download-buttons');
  var generateProgress = document.getElementById('generate-progress');

  var getDownload        = document.getElementById('get-download');
  var hasDisplayedStats  = false;
  this.hasDisplayedStats = hasDisplayedStats;
  var numOfRenders = 0;
  var timeForRenders = 0.0;
  function onBeginSave(evt) {

    var size = 0;
    
    switch(evt.target) {
      case saveNormal: size = 1; break;
      case saveLarge: size = 2; break;
      case saveEnormous: size = 3; break;
    }
    requestAnimFrame(function() {
      var audioRendererHiRes = new AudioRendererHiRes(size, onRenderComplete);
      var audioRenderData = audioRenderer.getRenderData();

      saveButtons.classList.add('hidden');
      generateProgress.classList.add('visible');
      console.log("The button knows it's been pressed");
      audioRendererHiRes.render(audioRenderData);
    });

  }

  function onRenderComplete(imageData) {
    audioRenderer.displayAudioStats();
    imageData = imageData.replace(/^data:image\/png;base64,/, '');

    var imageBinaryString = atob(imageData);
    var imageBinaryData = new Uint8Array(imageBinaryString.length);

    // Feels like there should be a nicer way to do this :-/
    for (var i = 0; i < imageBinaryString.length; i++)
      imageBinaryData[i] = imageBinaryString.charCodeAt(i);

    var blob = new Blob([imageBinaryData.buffer],{'type': 'image/png'});

    getDownload.classList.add('visible');
    getDownload.href = window.URL.createObjectURL(blob);
    getDownload.download = fileName;
    

    generateProgress.classList.remove('visible');
  }

  function onSaveComplete() {
    if(SHOULD_CONSOLE_DEBUG)
      console.log("onSaveComplete");
    saveButtons.classList.remove('hidden');
    getDownload.classList.remove('visible');
    generateProgress.classList.remove('visible');
  }

  this.stop = function (){
    console.log(songFileName);
    weShouldStop = true;
  }

  function onFileRead(evt) {
    audioParser.preprocess(evt.target.result);
    if(SHOULD_CONSOLE_DEBUG)
      console.log("onFileRead");
    // Because otherwise the preprocessing might happen after this, 
    //  resulting in an observed average volume of 0
    // This would normally result in decreased visibility of the audio data.
    // window.setTimeout(audioParser.parseArrayBuffer(evt.target.result), 300);
    
  }

  // Called when we are finished parsing the latest song
  // Buffer is the parsed song
  function onAudioDataParsed(buffer) {
    if(SHOULD_CONSOLE_DEBUG)
    {
      console.log("Audio Data Parsed");
      console.log(audioParser.sampleRate);
    }
    audioDuration = buffer.duration;
    
    var sampleRate = audioParser.offlineSampleRate;

    // Collect the song data into a buffer
    audioParser.getPreprocessedData(audioData2);

    // Sum up everything in the buffer
    var pData = 0;
    for (var i = 0; i < 1024; i++)
      pData += audioData2[i];

    // Calculate the optimal threshold for this song
    audioRenderer.beDynamic(pData, audioDuration, sampleRate, DATA_SIZE * 4);
    if(SHOULD_DISPLAY_STUFF)
    {
      audioPlaying = true;
      audioRenderer.clear();
    }
  }

  function parse(file) {
    //console.log("Parsing");
    songFileName = file.name;
    var fileReader = new FileReader();
    fileReader.addEventListener('loadend', onFileRead);
    fileReader.readAsArrayBuffer(file);
    for(var i = 0; i < percents; i++) pcntArray[i] = 0;
  };

  // Displays one frame of the song
  function updateAndRender() {

    audioParser.getAnalyserAudioData(audioData);
    audioTime = audioParser.getTime() / audioDuration;

    // Are we listening to a song?
    if (audioPlaying) 
    {
      audioRenderer.render(audioData, audioTime);
      var index = audioTime * percents;
      index = index - (index % 1);

      if(pcntArray[index] == 0)
      {
        console.log(100 * index / percents + "%");
        pcntArray[index] = 1;
      }

      // If we are done with the song
      if (audioTime >= 1) 
      {
        saveAndDownload.classList.add('visible');
        if (!hasDisplayedStats)
        {
          console.log("The time is now " + audioTime);
          var sampleRate = audioParser.sampleRate;
          audioRenderer.displayAudioStats(audioDuration, sampleRate);
          hasDisplayedStats = true;
          if (!weShouldStop)
          {
            parse(theFile);
          }
        }
      } 
      else 
      {
        if (hasDisplayedStats)
        {
          hasDisplayedStats = false;
        }
        // Make the progress bar longer 
        // Make sure we can't see the download menu
        time.style.width = (audioTime * 100).toFixed(1) + '%';
        saveAndDownload.classList.remove('visible');
      }
    }

    // Schedule the next frame
    requestAnimFrame(updateAndRender);
  }

  this.setDisplayStats = function(boolean) {
    hasDisplayedStats = boolean;
  };
  this.setName = function (name) {
    fileName = name;
  };

  this.parse = function (file) {
    theFile = file;
    if(SHOULD_CONSOLE_DEBUG)
      console.log("parse");
    console.log("name: " + file.name);
    var fileReader = new FileReader();
    fileReader.addEventListener('loadend', onFileRead);
    fileReader.readAsArrayBuffer(file);
  };

  saveNormal.addEventListener('click', onBeginSave);
  saveLarge.addEventListener('click', onBeginSave);
  saveEnormous.addEventListener('click', onBeginSave);
  getDownload.addEventListener('click', onSaveComplete);

  if (SHOULD_DISPLAY_STUFF)
    requestAnimFrame(updateAndRender);
}
