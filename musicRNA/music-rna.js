/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 * For licensing see moohonk.github.io/musicRNA/LICENSE
 */

function MusicRNA() {

  "use strict";

  var DATA_SIZE = 2048;
  var SAVE_SIZE = {
    normal:   'small',
    large:    'large',
    enormous: 'enormous'
  };
  

  var audioParser    = new AudioParser(DATA_SIZE, onAudioDataParsed);
  var audio_Renderer  = new AudioRenderer(this);
  this.audioRenderer = audio_Renderer;

  var SHOULD_DISPLAY_STUFF = true;
  var SHOULD_CONSOLE_DEBUG = false;
  audioParser  .setDisplay(SHOULD_DISPLAY_STUFF);
  audio_Renderer.setDisplay(SHOULD_DISPLAY_STUFF);
  audioParser  .setConsole(SHOULD_CONSOLE_DEBUG);
  audio_Renderer.setConsole(SHOULD_CONSOLE_DEBUG);

  var USING_BACK_BUTTON = false;

  var audioData      = new Uint8Array(DATA_SIZE);
  //var audioData2     = new Uint8Array(DATA_SIZE);
  var pData          = new Array(1024);
  var preProcessedData = new Float32Array(DATA_SIZE);
  var audioDuration  = 1;
  var audioTime      = 0;
  var prevAudioTime  = 0;
  //var currAudioTime  = 0;
  var audioPlaying   = false;
  var time_lower     = document.getElementById('time-lower');
  var time_upper     = document.getElementById('time-upper');
  var theFile        = null;
  var weShouldStop   = true;
  var fileName       = '';
  var songFileName   = '';
  var shouldRepeat   = true;
  var percents  = 5;
  var pcntArray = new Array(percents);
  for(var i = 0; i < percents; i++) pcntArray[i] = 0;
  

  var saveNormal       = document.getElementById('save-normal');
  var saveLarge        = document.getElementById('save-large');
  var saveEnormous     = document.getElementById('save-enormous');
  var saveAndDownload  = document.getElementById('save-and-download');
  var saveButtons      = document.getElementById('save-and-download-buttons');
  var generateProgress = document.getElementById('generate-progress');
  if (USING_BACK_BUTTON)
    var backButton       = document.getElementById('back-button');

  var getDownload        = document.getElementById('get-download');
  var hasDisplayedStats  = false;
  this.hasDisplayedStats = hasDisplayedStats;
  var numOfRenders   = 0;
  var timeForRenders = 0.0;

  function goBack(evt) {
    audio_Renderer.clearCanvas();
    var fileDropArea   = document.getElementById('file-drop-area');
    fileDropArea.classList.remove("dropped");
    //file drop .remove class ('dropped')
    fileName = "";
    var artist         = document.getElementById('artist'        );
    var track          = document.getElementById('track'         );
    artist.textContent = "";
    track.textContent = "";
    backButton.classList.remove("visible");
    saveAndDownload.classList.remove("visible");
  }

  function onBeginSave(evt) {
    if(SHOULD_CONSOLE_DEBUG)
        console.log("OnBeginSave");
    var size = 0;
    
    switch(evt.target) {
      case saveNormal:   size = 1; break;
      case saveLarge:    size = 2; break;
      case saveEnormous: size = 3; break;
    }
    requestAnimFrame(function() {
      var audioRendererHiRes = new AudioRendererHiRes(size, audioDuration, onRenderComplete);
      var audioRenderData    = audio_Renderer.getRenderData();

      saveButtons.classList.add('hidden');
      generateProgress.classList.add('visible');
      
      audioRendererHiRes.render(audioRenderData);
    });

  }

  function onRenderComplete(imageData) 
  {
    if(SHOULD_CONSOLE_DEBUG)
        console.log("onRenderComplete");
    audio_Renderer.displayAudioStats();
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

  function onSaveComplete() 
  {
    if(SHOULD_CONSOLE_DEBUG)
      console.log("onSaveComplete");
    saveButtons.classList.remove('hidden');
    getDownload.classList.remove('visible');
    generateProgress.classList.remove('visible');
  }

  this.stop = function ()
  {
    if(SHOULD_CONSOLE_DEBUG)
        console.log("Stop");
    console.log(songFileName);
    weShouldStop = true;
    //shouldRepeat = false;
  }

  function onFileRead(evt) 
  {
    if(SHOULD_CONSOLE_DEBUG)
      console.log("onFileRead");
    weShouldStop = false;
    //var temp = evt.target.result;
    audioParser.preprocess(evt.target.result);
    //resetAudioRenderer();

    //audioParser.parseArrayBuffer(temp);
    
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
    audioDuration  = buffer.duration;
    
    var sampleRate = audioParser.offlineSampleRate;

    // Collect the song data into a buffer
    audioParser.getPreprocessedData(audioData);//2);

    // Sum up everything in the buffer
    var pData = 0;
    for (var i = 0; i < 1024; i++)
      pData += audioData[i];//2[i];
    
    audio_Renderer.minBound      = 0.45;
    audio_Renderer.maxBound      = 0.85;
    audio_Renderer.VOLUME_THRESH = 0.675;
    
    // Calculate the optimal threshold for this song
    audio_Renderer.beDynamic(pData, audioDuration, sampleRate, DATA_SIZE * 4);
    if(SHOULD_DISPLAY_STUFF)
    {
      console.log("displaying stuff");
      audioPlaying = true;
      audio_Renderer.clear();
      weShouldStop = false;
      //shouldRepeat = false;
      requestAnimationFrame(updateAndRender);
    }
  }

  function parse(file) {
    if(SHOULD_CONSOLE_DEBUG)
      console.log("Parsing");
    songFileName = file.name;
    var fileReader = new FileReader();
    fileReader.addEventListener('loadend', onFileRead);
    if(SHOULD_CONSOLE_DEBUG)
      console.log("MusicRNA reading the file");
    fileReader.readAsArrayBuffer(file);
    for(var i = 0; i < percents; i++) pcntArray[i] = 0;
  };

  // Displays one frame of the song
  function updateAndRender() {

    if(weShouldStop)
    {
      return;
    }
    if(SHOULD_CONSOLE_DEBUG)
      console.log("updateAndRender");
    audioParser.resume();
    prevAudioTime = audioTime;
    audioTime = audioParser.getTime();

    // Are we listening to a song?
    if (audioPlaying) 
    {
      audioParser.getAnalyserAudioData(audioData);
      audio_Renderer.render(audioData, audioTime, audioDuration);
      var index = audioTime * percents / audioDuration;
      index = index - (index % 1);

      if(pcntArray[index] == 0)
      {
        console.log("audioTime = " + audioTime);
        console.log(100 * index / percents + "%");
        pcntArray[index] = 1;
      }

      // If we are done with the song
      if (audioTime >= audioDuration) 
      {
        saveAndDownload.classList.add('visible');
        if(USING_BACK_BUTTON)
          backButton.classList.add('visible');
        if (!hasDisplayedStats)
        {
          if(SHOULD_CONSOLE_DEBUG)
            console.log("The time is now " + audioTime);
          var sampleRate = audioParser.sampleRate;
          audio_Renderer.displayAudioStats(audioDuration, sampleRate);
          hasDisplayedStats = true;

          if (!weShouldStop)
            parse(theFile);
        }
      } 
      else 
      {
        if (hasDisplayedStats)
          hasDisplayedStats = false;
        // Make the progress bar longer 
        // Make sure we can't see the download menu
        //time_lower.style.width = (audioTime * 93.75).toFixed(2) + '%';
        //time_upper.style.width = (audioTime * 93.75).toFixed(2) + '%';
        saveAndDownload.classList.remove('visible');
      }
    }

    // Schedule the next frame
    //requestAnimFrame(updateAndRender);
    if(shouldRepeat)
    {
      requestAnimationFrame(updateAndRender);
    }
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

  saveNormal  .addEventListener('click', onBeginSave);
  saveLarge   .addEventListener('click', onBeginSave);
  saveEnormous.addEventListener('click', onBeginSave);
  if(USING_BACK_BUTTON)
    backButton  .addEventListener('click', goBack     );

  getDownload .addEventListener('click', onSaveComplete);

  if(SHOULD_DISPLAY_STUFF)
  {
    shouldRepeat = true;
    //requestAnimFrame(updateAndRender);
    requestAnimationFrame(updateAndRender);
  }
}
