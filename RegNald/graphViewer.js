function GraphViewer()
{
	var positions = [];
	var indices = [];
	var colors = [];
	var sizes  = [];
	var lineCoords = [];


	this.minPoint = -5;
	this.maxPoint = 10;

	// Init the 3D canvas
	// three.js magic code
	var scene, camera, renderer, geometry, material, points, lines, line;
	var regression, regLinePoints;	
	// The index of the camera control button currently being clicked
	var heldButtonIndex = -1;

// The angles we wish we could see the graph at Right Now
	var targetXRotation = Math.PI/4;
	var targetYRotation = -Math.PI/4;

// We don't want someone zooming out too far (or too close)
	var MINIMUM_ZOOM = 1;
	var MAXIMUM_ZOOM = 100;

// the zoom level we wish we could see the graph at Right Now
	var targetZoom = 30;

	var DEFAULT_ZOOM = 30;

// Are we currently zooming in or out?
	var isZooming = false;

// Amount the graph can zoom in or out in one frame
	var ZOOM_INCREMENT = 0.2;

// Are we currently rotating?
	var xRotating = false;
	var yRotating = false;

// The amount the graph can rotate in one frame
	var MIN_ROTATION_ANGLE  = .04;

// Amount to increment viewing angles by each time the graph is rotated
	var ANGLE_STEP = Math.PI/24;

// Maximum vertical angle the graph can be rotated to
//  (to stop people from seeing the graph upside down)
	var MAX_PHI =  Math.PI / 2 - ANGLE_STEP;

// Information about the axis labels
// IDs of the labels are of the form ( "g" + labelTexts[i] )
	var labelTexts  = ["X", "Y", "Z"];
	var labelCoords = [];


	// TODO: find out how to format points differently based on their selection state

// +==============================================================+
// |                        FUNCTIONS                             |
// +==============================================================+
	function init(){
		// Instantiate all the things
		scene         = new THREE.Scene();
		renderer      = new THREE.WebGLRenderer();
		lines         = new THREE.BufferGeometry();
		geometry      = new THREE.BufferGeometry();
		material      = new THREE.PointsMaterial({});
		regLinePoints = new THREE.BufferGeometry();

		lineCoords = [0, 0, 0, 0, 0, 0];

		// Make the camera
		camera = new THREE.PerspectiveCamera(45, (window.innerWidth*.7) / (window.innerHeight-112), 0.1, 1000);
		// Might switch to an orthographic camera later on
		// camera = new OrthographicCamera()

		// Set the size of the canvas
		renderer.setSize((window.innerWidth*.7), (window.innerHeight-112));

		// Put the canvas onto the webpage
		document.getElementById("viewWindow").appendChild(renderer.domElement);

		// If the window size changes+, we want to adapt
		window.onresize = function(){
			renderer.setSize((window.innerWidth*.7), (window.innerHeight-112));
			camera.aspect = (window.innerWidth*.7) / (window.innerHeight-112);
			camera.updateProjectionMatrix();
		};

		// Add the information about the graph points to the graph point plotter
		geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.addAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
		geometry.addAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
		geometry.computeBoundingSphere();

		// Points are a thing we want to render ON the screen
		mesh   = new THREE.Points(geometry, material);
		points = new THREE.Object3D();
		points.add(mesh);
		scene.add(points);

		// Default maximum x, y, z value is 10
		adjustAxes(10);

		// Render the axes we just adjusted
		var material2 = new THREE.LineBasicMaterial({color: 0xaaaaaa});
		line = new THREE.Line(lines, material);
		scene.add(line);

		// Information about the regression line
		regLinePoints.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		regLinePoints.addAttribute('size', new THREE.Float32BufferAttribute([3, 3], 1));
		var lineRegMat = new THREE.LineBasicMaterial({
			color:0x77aaff,
			linewidth:2 // Apparently, Windows platforms ignore this and make it 1
		});

		// Render the regression line
		regression = new THREE.Line(regLinePoints, lineRegMat);
		scene.add(regression);

		// Give everything some rotation so it doesn't look 2D from the start
		line.rotation.x       =  Math.PI/4;
		line.rotation.y       = -Math.PI/4;
		points.rotation.x     =  Math.PI/4;
		points.rotation.y     = -Math.PI/4;
		regression.rotation.x =  Math.PI/4;
		regression.rotation.y = -Math.PI/4;

		// Height of the camera above the graph
		camera.position.z = targetZoom;

		// Put the labels in their starting locations
		

//============================================================================================
		// Set up listeners

		// Get useful elements from the HTML
		var zoomIn      = document.getElementById("zoomIn"     );
		var zoomOut     = document.getElementById("zoomOut"    );
		var upButton    = document.getElementById("upButton"   );
		var downButton  = document.getElementById("downButton" );
		var leftButton  = document.getElementById("leftButton" );
		var rightButton = document.getElementById("rightButton");


		var xInput = document.getElementById("xInput");
		var yInput = document.getElementById("yInput");
		var zInput = document.getElementById("zInput");

		// If the user releases a mouse button, they're not clicking on a button anymore
		window.addEventListener("mouseup", function(){heldButtonIndex = -1;
		});

		// Camera rotation button events
		upButton.addEventListener("mousedown", function(){
				
				heldButtonIndex = 0;
				holdButton();
			});
		downButton.addEventListener("mousedown", function(){
				heldButtonIndex = 1;
				holdButton();
			});
		leftButton.addEventListener("mousedown", function(){
				heldButtonIndex = 2;
				holdButton();
			});
		rightButton.addEventListener("mousedown", function(){
				heldButtonIndex = 3;
				holdButton();
			});
		zoomIn.addEventListener("mousedown", function(){
			heldButtonIndex = 4;
			holdButton();
		});
		zoomOut.addEventListener("mousedown", function(){
			heldButtonIndex = 5;
			holdButton();
		});

		// Arrow key events
		window.onkeydown = function(e){
			e = e || window.event;
			// If we've selected any text field, we don't want to rotate the graph with the arrow keys
			if(!(document.activeElement === xInput || document.activeElement == yInput || document.activeElement === zInput))
				if(heldButtonIndex == -1){
					switch(e.key){
						case "Up":
						case "ArrowUp":
							heldButtonIndex = 0;
							holdButton();
							break;
						case "Down":
						case "ArrowDown":
							heldButtonIndex = 1;
							holdButton();
							break;
						case "Left":
						case "ArrowLeft":
							heldButtonIndex = 2;
							holdButton();
							break;
						case "Right":
						case "ArrowRight":
							heldButtonIndex = 3;
							holdButton();
							break;
					}
				}
		};
		window.onkeyup = function(e){
			e = e || window.event;
			heldButtonIndex = -1;
		};

		//updateLabelLocations(-targetXRotation, targetYRotation);

		
		// Start updating the canvas
		animate();
		turnUp();
	}
	
	// Interprets what to continually do based on what button is being pressed
	function holdButton()
	{
		switch(heldButtonIndex){
			case -1: return;
			case 0: // Up button being held
				turnUp();
				break;
			case 1: // Down button being held
				turnDown();
				break;
			case 2: // Left button being held
				turnRight();
				break;
			case 3: // Right button being held
				turnLeft();
				break;
			case 4: // Zoom-In button being pressed
				zoomIn();
				break;
			case 5: // Zoom-Out button being pressed
				zoomOut();
				break;
		}
		// As long as a button is being held, we want to interpret that button
		requestAnimationFrame(holdButton);
	}

	// Zooms the camera in if we're not already zooming 
	function zoomIn(){
		console.log(targetZoom);
		if(!isZooming)
		{
			targetZoom -= ZOOM_INCREMENT;
			if(targetZoom < MINIMUM_ZOOM)
				targetZoom = MINIMUM_ZOOM;
		}
	}

	// Zooms the camera out if we're not already zooming
	function zoomOut(){
		if(!isZooming)
		{
			targetZoom += ZOOM_INCREMENT;
			if(targetZoom > MAXIMUM_ZOOM)
				targetZoom = MAXIMUM_ZOOM;
		}
	}

	// If the camera has a possibility of being unable to see a point, zoom out until it can be seen
	//  This might be the most complicated thing on this website
	//  Might be able to use the bounding sphere from geometry.computeBoundingSphere()
	function zoomToAccomodate(){return;}

	function adjustAxes(newLength){
		this.minPoint = -.5 * newLength;
		this.maxPoint = newLength;
		lineCoords = [];
		lineCoords.push(      newLength, 0, 0);
		lineCoords.push(-.5 * newLength, 0, 0);
		lineCoords.push(0, 0,               0);
		lineCoords.push(0,       newLength, 0);
		lineCoords.push(0, -.5 * newLength, 0);
		lineCoords.push(0, 0,               0);
		lineCoords.push(0, 0,       newLength);
		lineCoords.push(0, 0, -.5 * newLength);
		lines.removeAttribute('position');
		lines.addAttribute('position', new THREE.Float32BufferAttribute(lineCoords, 3));

		// Coordinates are switched around because they are switched around in the 3D graph
		labelCoords[0] = new THREE.Vector3(newLength * 1.1, 0, 0);
		labelCoords[1] = new THREE.Vector3(0, 0, newLength * 1.1);
		labelCoords[2] = new THREE.Vector3(0, -newLength * 1.1, 0);
		updateLabelLocations(-targetXRotation, targetYRotation);

	}

	// Update the on-screen coordinates of each graph label
	// If the label would be outside of the canvas, set its position to be (-1000, -1000)
	function updateLabelLocations(rotX, rotY){

		camera.updateProjectionMatrix();
		
		// Get the width and height of the canvas
		var dim = renderer.getDrawingBufferSize();

       	var rot = new THREE.Euler(-points.rotation.x, points.rotation.y);

		// Loop over all of the labels
		for(var i = 0; i < labelTexts.length; i++)
		{
			var newPos = labelCoords[i].clone();
			newPos.applyEuler(rot);
			newPos = newPos.project(camera);
			var x = (dim.width  / 2) * (1 + newPos.x);
			var y = (dim.height / 2) * (1 + newPos.y);
			document.getElementById("g" + labelTexts[i]).style = "padding-left:" + x + "px; padding-top:" + y + "px;";
			// var x = 
		}
	}

	// Add a point to the plot
	this.addPoint = function(x, y, z){
		// Add the attributes of the new point to the info lists
		// The plot has the X and Y axes switched, so switch them back
		positions.push(x, z, y);
		colors.push(255, 255, 255);
		sizes.push(3);

		// Reset the geometry's attributes
		//  Not entirely sure how well this performs, but it shouldn't be too bad.
		geometry.removeAttribute('position'   );
		geometry.removeAttribute('customColor');
		geometry.removeAttribute('size'       );
		geometry.addAttribute('position'   , new THREE.Float32BufferAttribute(positions, 3));
		geometry.addAttribute('customColor', new THREE.Float32BufferAttribute(colors   , 3));
		geometry.addAttribute('size'       , new THREE.Float32BufferAttribute(sizes    , 1));

		// Find out the new bounding sphere
		geometry.computeBoundingSphere();
		zoomToAccomodate();
	}

	// Remove the point at index 'index' from the array of points
	//  NOTE: index refers to the position of the point in the dataList, 
	//   not the indices of the actual coordinates
	//  The indices of the coordinates are (index * 3), (index * 3 + 1), (index * 3 + 2)
	this.removePoint = function(index){

		// Excise the data corresponding to 'index' from the data lists
		positions.splice(index * 3, 3);
		colors   .splice(index * 3, 3);
		sizes    .splice(index    , 1);

		// Reset the information for the point renderer
		geometry.removeAttribute('position'   );
		geometry.removeAttribute('customColor');
		geometry.removeAttribute('size'       );
		geometry.addAttribute('position'   , new THREE.Float32BufferAttribute(positions, 3));
		geometry.addAttribute('customColor', new THREE.Float32BufferAttribute(colors   , 3));
		geometry.addAttribute('size'       , new THREE.Float32BufferAttribute(sizes    , 1));

		// Find the boundary of the points
		geometry.computeBoundingSphere();
	}

// Set the coordinates of the specified point to the new ones
	this.updatePoint = function(index, x1, y1, z1){

		positions[3 * index    ] = x1;
		positions[3 * index + 1] = z1;
		positions[3 * index + 2] = y1;
		geometry.removeAttribute('position');
		geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.computeBoundingSphere();
		zoomToAccomodate();
	}

	this.updatePointSelection = function(index, isSelected){
		// TODO: find out how to format points differently based on their selection state
		return;
	}

	this.makeLine = function(x0, y0, z0, x1, y1, z1)
	{
		pointsList = [x0, z0, y0, x1, z1, y1];
		// regLinePoints.removeAttribute("position");
		regLinePoints.addAttribute("position", new THREE.Float32BufferAttribute(pointsList, 3));
		// regLinePoints.computeBoundingSphere();

	}

	function animate() {

		requestAnimationFrame( animate );
		rotateObjects();
		zoomCamera();
		//if(isZooming || xRotating || yRotating)
		updateLabelLocations(-points.rotation.x, points.rotation.y);
		render();
		// stats.update();
	}
	
	function zoomCamera(){
		isZooming = false;
		if(Math.abs(camera.position.z - targetZoom) > 2 * ZOOM_INCREMENT)
		{
			isZooming = true;
			if(camera.position.z > targetZoom)
				camera.position.z -= ZOOM_INCREMENT;
			else
				camera.position.z += ZOOM_INCREMENT;
		}
		else{
			camera.position.z = targetZoom;
		}
		
	}
	
	function rotateObjects(){
		var dx = 0;
		var dy = 0;
		xRotating = false;
		yRotating = false;

		// Check to see if the current Phi angle doesn't equal the target angle
		if (Math.abs(points.rotation.x - targetXRotation) > MIN_ROTATION_ANGLE)
		{
			xRotating = true;
			dx = MIN_ROTATION_ANGLE;
			if (points.rotation.x > targetXRotation)
				dx = -MIN_ROTATION_ANGLE;
		}
		else
		{
			line      .rotation.x = targetXRotation;
			points    .rotation.x = targetXRotation;
			regression.rotation.x = targetXRotation;
		}

		// Check to see if the current Theta angle doesn't equal the target angle
		if(Math.abs(points.rotation.y - targetYRotation) > MIN_ROTATION_ANGLE)
		{
			yRotating = true;
			dy = MIN_ROTATION_ANGLE;
			if (points.rotation.y > targetYRotation)
				dy = -MIN_ROTATION_ANGLE;
		}
		else
		{
			line      .rotation.y = targetYRotation;
			points    .rotation.y = targetYRotation;
			regression.rotation.y = targetYRotation;
		}

		

		if (xRotating || yRotating) 

		// Rotate all the objects that are in this scene
		line      .rotation.x += dx;
		line      .rotation.y += dy;
		points    .rotation.x += dx;
		points    .rotation.y += dy;
		regression.rotation.x += dx;
		regression.rotation.y += dy;
	}

	function render() {
		renderer.render( scene, camera );
	}

	function turnLeft(){if(!yRotating)targetYRotation -= ANGLE_STEP;}
	function turnRight(){if(!yRotating)targetYRotation += ANGLE_STEP;}
	function turnUp()
	{
		if(!xRotating){
			targetXRotation += ANGLE_STEP / 2;
			if (targetXRotation > MAX_PHI)
				targetXRotation = MAX_PHI;
		}
	}
	function turnDown()
	{
		if(!xRotating)
		{
			targetXRotation -= ANGLE_STEP / 2;
			if (targetXRotation < -MAX_PHI)
				targetXRotation = -MAX_PHI;
		}
	}
	init();
}