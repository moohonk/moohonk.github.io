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

	var targetXRotation = Math.PI/4;
	var targetYRotation = -Math.PI/4;
	var xRotating = false;
	var yRotating = false;
	var MIN_ROTATION_ANGLE  = .04;
	var ANGLE_STEP = Math.PI/24;
	var MAX_PHI =  Math.PI / 2 - ANGLE_STEP;


	// TODO: find out how to format points differently based on their selection state

// +==============================================================+
// |                        FUNCTIONS                             |
// +==============================================================+
	function init(){




		// Instantiate all the things
		scene    = new THREE.Scene();
		renderer = new THREE.WebGLRenderer();
		lines    = new THREE.BufferGeometry();
		geometry = new THREE.BufferGeometry();
		material = new THREE.PointsMaterial({});
		regLinePoints = new THREE.BufferGeometry();

		lineCoords = [0, 0, 0, 0, 0, 0];

		// Make the camera
		camera = new THREE.PerspectiveCamera(45, (window.innerWidth*.7) / (window.innerHeight-112), 0.1, 1000);

		// Set the size of the canvas
		renderer.setSize((window.innerWidth*.7), (window.innerHeight-112));

		// Put the canvas onto the webpage
		document.getElementById("viewWindow").appendChild(renderer.domElement);
		window.onresize = function(){
			renderer.setSize((window.innerWidth*.7), (window.innerHeight-112));
			camera.aspect = (window.innerWidth*.7) / (window.innerHeight-112);
			camera.updateProjectionMatrix();
		};

		geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.addAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
		geometry.addAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
		geometry.computeBoundingSphere();

		mesh = new THREE.Points(geometry, material);
		points = new THREE.Object3D();
		points.add(mesh);
		scene.add(points);

		adjustAxes(10);
		
		var material2 = new THREE.LineBasicMaterial({color: 0xaaaaaa});
		line = new THREE.Line(lines, material);
		scene.add(line);

		regLinePoints.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		regLinePoints.addAttribute('size', new THREE.Float32BufferAttribute([3, 3], 1));
		var lineRegMat = new THREE.LineBasicMaterial({color:0x77aaff});
		regression = new THREE.Line(regLinePoints, lineRegMat);
		scene.add(regression);

		// Give everything some rotation so it doesn't look 2D from the start
		points.rotation.x     = Math.PI/4;
		points.rotation.y     = -Math.PI/4;
		line.rotation.x       = Math.PI/4;
		line.rotation.y       = -Math.PI/4;
		regression.rotation.x = Math.PI/4;
		regression.rotation.y = -Math.PI/4;

		// Zoom of the camera? I think
		camera.position.z = 30;

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

		window.addEventListener("mouseup", function(){heldButtonIndex = -1;});

		// Camera rotation button events
		upButton.addEventListener("mousedown", function(){
				heldButtonIndex = 0;
				holdRotate();
			});
		downButton.addEventListener("mousedown", function(){
				heldButtonIndex = 1;
				holdRotate();
			});
		leftButton.addEventListener("mousedown", function(){
				heldButtonIndex = 2;
				holdRotate();
			});
		rightButton.addEventListener("mousedown", function(){
				heldButtonIndex = 3;
				holdRotate();
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
							holdRotate();
							break;
						case "Down":
						case "ArrowDown":
							heldButtonIndex = 1;
							holdRotate();
							break;
						case "Left":
						case "ArrowLeft":
							heldButtonIndex = 2;
							holdRotate();
							break;
						case "Right":
						case "ArrowRight":
							heldButtonIndex = 3;
							holdRotate();
							break;
					}
				}
		};
		window.onkeyup = function(e){
			e = e || window.event;
			heldButtonIndex = -1;
		};


		// Start updating the canvas
		animate();
	}
	
	function holdRotate()
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
		}
		// As long as a camera rotation button is being held, we want to rotate the camera
		requestAnimationFrame(holdRotate);
	}
	// If the camera has a possibility of being unable to see a point, zoom out until it can be seen
	//  This might be the most complicated thing on this website
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

	}

	// Add a point to the plot
	this.addPoint = function(x, y, z){
		// Add the attributes of the new point to the info lists
		positions.push(x, y, z);
		colors.push(255, 255, 255);
		sizes.push(3);

		// Reset the geometry's attributes
		//  Not entirely sure how well this performs, but it shouldn't be too bad.
		geometry.removeAttribute('position');
		geometry.removeAttribute('customColor');
		geometry.removeAttribute('size');
		geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.addAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
		geometry.addAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

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
		positions[3 * index + 1] = y1;
		positions[3 * index + 2] = z1;
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
		pointsList = [x0, y0, z0, x1, y1, z1];
		// regLinePoints.removeAttribute("position");
		regLinePoints.addAttribute("position", new THREE.Float32BufferAttribute(pointsList, 3));
		// regLinePoints.computeBoundingSphere();

	}
	function animate() {

		requestAnimationFrame( animate );
		rotateObjects();

		render();
		// stats.update();

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

		// Check to see if the current Theta angle doesn't equal the target angle
		if(Math.abs(points.rotation.y - targetYRotation) > MIN_ROTATION_ANGLE)
		{
			yRotating = true;
			dy = MIN_ROTATION_ANGLE;
			if (points.rotation.y > targetYRotation)
				dy = -MIN_ROTATION_ANGLE;
		}

		// Rotate all the objects that are in this scene
		points.rotation.x += dx;
		points.rotation.y += dy;
		line  .rotation.x += dx;
		line  .rotation.y += dy;
		regression  .rotation.x += dx;
		regression  .rotation.y += dy;
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