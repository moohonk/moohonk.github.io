/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 * For licensing see moohonk.github.io/musicRNA/LICENSE
 */
window.requestAnimFrame =
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.requestAnimationFrame;

(function() {

  // The way these are lined up pleases me.
  var musicRNA       = new MusicRNA();
  var fileUploadForm = document.getElementById('file-chooser'  );
  var fileDropArea   = document.getElementById('file-drop-area');
  var fileInput      = document.getElementById('source-file'   );
  var artist         = document.getElementById('artist'        );
  var track          = document.getElementById('track'         );
  
  fileDropArea  .addEventListener('drop'     , dropFile, false);
  fileDropArea  .addEventListener('dragover' , cancel  , false);
  fileDropArea  .addEventListener('dragenter', cancel  , false);
  fileDropArea  .addEventListener('dragexit' , cancel  , false);
  fileUploadForm.addEventListener('submit'   , onSubmit, false);

  function onSubmit(evt) {
    console.log("On Submit");
    evt.preventDefault();
    evt.stopImmediatePropagation();

    if (fileInput.files.length)
      go(fileInput.files[0]);
  }

  function cancel(evt) {
    evt.preventDefault();
  }

  function dropFile(evt) {

    evt.stopPropagation();
    evt.preventDefault();
    console.log("File Dropped");
    var files = evt.dataTransfer.files;

    if (files.length) {
      go(files[0]);
    }
  }

  function go(file) {
    musicRNA.parse(file);
    fileDropArea.classList.add('dropped');
    console.log("Go");
    ID3.loadTags("filename.mp3", function() {

      // Determine the name and the author of this song
      var tags = ID3.getAllTags("filename.mp3"); 
      var artistName = tags.artist;
      var trackName  = tags.title;

      // If we can't find the song info, have some placeholders handy
      if (tags.artist)
        artist.textContent = tags.artist;
      else
        artistName = "Unknown Artist";
      
      if (tags.title)
        track.textContent = tags.title;
      else
        trackName = "Unknown Title";

      // Clean up the strings so periods don't mess with the image file name
      //  Seriously, you don't want that. It kind of makes it incomprehensible.
      artistName.replace("\.", "-");
      trackName .replace("\.", "-");

      // Set the filename to be '<artist name> - <track name>'  
      musicRNA.setName(artistName + ' - ' + trackName);
    }, {
      dataReader: FileAPIReader(file)
    });
  }

})();
