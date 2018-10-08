(function() {

	graphViewer = new GraphViewer();
	// Instantiate the main JavaScript 
	regNald = new RegNald(graphViewer);

	

	//var geometry = new THREE.BufferGeometry( );
	//var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );
	// var positions = [ 0,  0,  0, 
	//                  10,  0,  0,
	//                   0,  0,  0, 
	//                   0, 10,  0,
	//                   0,  0,  0, 
	//                   0,  0, 10];
    //var colors = [.8, .8, .8, .8, .8, .8, .8, .8, .8, .8, .8, .8, .8, .8, .8, .8, .8, .8];
	

	// geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	// geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
	// geometry.computeBoundingSphere();

	// var mesh = new THREE.lineSegments(geometry, material);
	// scene.add(mesh);
	

	

// Select the tab given by 'id': 0 => data tab
//                               1 => options tab
	function select(id)
	{
		// Determine the IDs for the new selected and deselected tabs, respectively
		string1 = "tab" + id;
		string2 = "tab" + (id + 1) % 2;

		// Get the DOM elements
		selectedTab   = document.getElementById(string1);
		deselectedTab = document.getElementById(string2);

		// If the wrong tab is selected, swap the selection to the right tab
		if(selectedTab.classList.contains('deselected'))
		{
			selectedTab.classList  .remove('deselected');
			selectedTab.classList  .add   ('selected'  );
			deselectedTab.classList.remove('selected'  );
			deselectedTab.classList.add   ('deselected');
		}
	}

	

	// Find various useful HTML elements	
	var deleteAll   = document.getElementById("deleteAll");
	var tab0        = document.getElementById("tab0");
	var tab1        = document.getElementById("tab1");

	// Add event listeners to various elements in the HTML
	tab1       .addEventListener("click", function(){select(1)});
	tab0       .addEventListener("click", function(){select(0)});

	// When the 'delete' key is pressed, delete all selected vectors


})();