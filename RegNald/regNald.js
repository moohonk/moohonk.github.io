function RegNald(graphViewer)
{
// Width and height of the window
var width  = 0;
var height = 0;

// Editing history list
	
// List of IDs
// The index of an ID is the same as that of its data (in the data list)
	var IDList = [];

// The ID that will be given to the next vector entered in
	var nextID = 0;

// List of data
//                  (x, y, z)
	var dataList = [];

// The list of lower and upper bounds for generating random points
	var upper = graphViewer.maxPoint;
	var lower = graphViewer.minPoint;
	console.log(upper);
	console.log(lower);
	var bounds = [upper, lower,
				  upper, lower,
				  upper, lower]

// List of the current 'isSelected' state of each row
	var selected = [];
	var numSelected = 0;

	var lastEdit = null;

// The container of all the data rows in the GUI table
	var tableWindow = document.getElementById("tableWindow");

// Elements that need regNald functions bound to them
	var selectAll   = document.getElementById("selectAll");
	var randButton  = document.getElementById("randomButton");
	var applyButton = document.getElementById("applyButton");
	var undoButton  = document.getElementById("undoButton");
	var redoButton  = document.getElementById("redoButton");
	var xInput      = document.getElementById("xInput");
	var yInput      = document.getElementById("yInput");
	var zInput      = document.getElementById("zInput");
	var dataWindow  = document.getElementById("window2");

	dataWindow.style = "height: " + window.innerHeight - 245.475;
	window.addEventListener("resize", onResize);
	onResize();
// Add some listeners
	selectAll  .addEventListener("click", function(){toggleSelectAll()});
	applyButton.addEventListener("click", function(){addEntry()});
	undoButton .addEventListener("click", function(){undo()});
	redoButton .addEventListener("click", function(){redo()});
	randButton .addEventListener("click", function(){addRandomPoint();})

// The doubly-linked list structure for the editing history
// Each node stores the actions needed to produce the current dataList state given the previous dataList state
// Each node contains:
//  - A code corresponding to the editing action 
//  - The ID of the data being edited
//  - The coordinate values of the data
function Node(editCode, id, x, y, z, xP = 0, yP = 0, zP = 0) {
  this.editCode = editCode;
  this.id = id;
  this.x  = x;
  this.y  = y;
  this.z  = z;
  this.xP = xP;
  this.yP = yP;
  this.zP = zP;
  this.previous = null;
  this.next = null;
}

lastEdit = new Node(-1, 0, 0, 0, 0);
// +==============================================================+
// |                        FUNCTIONS                             |
// +==============================================================+

function onResize()
{
	width = window.innerWidth;
	height = window.innerHeight;
	// Fix the data div's height so the editing UI doesn't overflow
	document.getElementById("tableWindow").style = "max-height: " + (height - 279.68);
}

// Add a new data point using the values currently in the editing window
// If one (and only one) row is selected, edit the values of that row instead
	function addEntry()
	{
		// Get the values of x, y, and z from the editing window
		var x = Number(xInput.value);
		var y = Number(yInput.value);
		var z = Number(zInput.value);

		// If only one entry in the list is selected, we should edit that entry
		if(numSelected == 1)
		{
			var sI = selected.indexOf(true);

			// Store this edit in the edit history
			addEditToHistory(2, IDList[sI], x, y, z, dataList[sI][0], dataList[sI][1], dataList[sI][2]);

			// Edit the entry
			editEntry(sI, x, y, z);

			// Deselect the table row
			toggleSelected(IDList[sI]);
			return;
		}
		// Store this edit in the edit history
		addEditToHistory(1, nextID, x, y, z);
		insertData(nextID++, x, y, z)
		
	}

	function insertData(id, x, y, z){

		// Add a new row in the table window
		addVectorToHTML(id, x, y, z);

		// Add a 3D vector to the 3D window
		startRenderingVector(id, x, y, z);

		// Add this entry to the data list
		addDataToArray(id, x, y, z);
	}

// Change the x, y, z values of the entry with ID 'id' to these new ones
	function editEntry(id, x, y, z)
	{
		console.log("editing");

		// Find the index of the entry whose ID is 'id'
		var i = IDList.indexOf(id);
		console.log("i: ", i);

		// Do nothing if we don't have a vector with ID 'id'
		if(i < 0) return;

		console.log("weve gotten past the one thing that could conceivably stop us");
		dataList[i] = [x, y, z];
		console.log(dataList[i])

		var xLabel = document.getElementById("x" + id);
		var yLabel = document.getElementById("y" + id);
		var zLabel = document.getElementById("z" + id);

		xLabel.innerHTML = x;
		yLabel.innerHTML = y;
		zLabel.innerHTML = z;

		// Update the 3D rendering of this vector to reflect the edits
		graphViewer.updatePoint(i, x, y, z);
		lineReg();
	}

// Add an entry to the list of tuples
	function addDataToArray(id, x, y, z)
	{
		// Create a tuple containing all relevant information
		var newTuple = [x, y, z, false]; // (vectors start out unselected)

		// Add the new tuple to our list of data
		dataList.push(newTuple);

		// Add the ID to our list of IDs
		IDList.push(id);

		// Update the linear Regression
		lineReg();

	}

	function truncateTableNumbers()
	{
		// Determine how many pixels are available for each coordinate column

		// Divide pixels available by MAX_PIXELS_PER_DIGIT, the maximum amount of pixels that a digit can take up
		//  (To be determined through experimentation)

		// Loop through all of the data in the list
		// |	Don't round the data in the list, but set the content of the table items 
		// |	 to be the data rounded to however many digits we can have
	}

// Add a row to the HTML list
	function addVectorToHTML(id, x, y, z)
	{
		// var elementType = ["div", "div", "div", "div", "div", "div", "div", "button", "div"];

		// Make all the new DOM elements
		var row = document.createElement("div"   );
		var s0  = document.createElement("div"   );
		var s1  = document.createElement("div"   );
		var s2  = document.createElement("div"   );
		var x0  = document.createElement("div"   );
		var y0  = document.createElement("div"   );
		var z0  = document.createElement("div"   );
		var d0  = document.createElement("button");
		//var ss          = document.createElement("div");

		// Add classes to the new DOM elements
		row.classList.add("vector"         );
		row.classList.add("deselected"     );
		s0 .classList.add("selectIndicator");
		s1 .classList.add("leftSpacing"    );
		s2 .classList.add("selectContainer");
		x0 .classList.add("coordLabel"     );
		y0 .classList.add("coordLabel"     );
		z0 .classList.add("coordLabel"     );
		d0 .classList.add("deleteButton"   );

		// Set IDs
		row.id = "vector" + id;
		x0 .id = "x"      + id;
		y0 .id = "y"      + id;
		z0 .id = "z"      + id;
		s0 .id = "s"      + id;
/*
TODO: 
	determine how many pixels 
*/
		// Add text
		x0.innerHTML = x;
		y0.innerHTML = y;
		z0.innerHTML = z;
		d0.innerHTML = "x";

		// When the delete button is clicked, 
		//  we want to delete this row in the table
		d0.addEventListener("click", function()
		{
			addEditToHistory(0, id);
			removeVectorFromHTML(id);
			removeIDFromArray(id);
		});

		// If the user clicks on a vector, we want to toggle that vector's selection
		row.addEventListener("click", function(){toggleSelected(id)});

		// Put everything in the new table row
		row.appendChild(s1);
		s2 .appendChild(s0);
		row.appendChild(s2);
		row.appendChild(x0);
		row.appendChild(y0);
		row.appendChild(z0);
		row.appendChild(d0);

		// Put the new table row into the table
		tableWindow.appendChild(row);
	}

// Remove the entry with ID 'id' from the list of tuples
	function removeIDFromArray(id)
	{
		// find the index of the entry we want
		var index = IDList.indexOf(id);

		// Do nothing if we don't have a vector with ID 'id'
		if(index < 0) return;

		// Store a record of this delete action in the history list

		// Excise the entry from the lists
		IDList.splice(index, 1);
		dataList.splice(index, 1);

		// Update the linear regression
		lineReg();
	}

// Remove the row with ID 'id' from the HTML list 
	function removeVectorFromHTML(id)
	{
		// find the index of the entry we want
		var index = IDList.indexOf(id);

		// Do nothing if we don't have a vector with ID 'id'
		if(index < 0) return;

		// If we can't see it in the table, we shouldn't be able to see it on the graph
		stopRenderingVector(id);

		// Find the row that we want to get rid of
		var row = document.getElementById("vector" + id);

		// Remove the row from the table
		tableWindow.removeChild(row);
	}

// update the HTML appearance of the row with ID 'id'
	function updateVectorSelectionAppearance(id)
	{
		// Find the row in the table corresponding to this ID
		var row = document.getElementById("vector" + id);
		var sI = document.getElementById("s" + id);
		console.log(sI);

		// Remove all the classes the row currently has
		row.className = "vector";
		sI.className = "selectIndicator";

		// Get the index of the vector with ID 'id'
		var index = IDList.indexOf(id);

		// Do nothing if we don't have a vector with ID 'id'
		if(index < 0) return;

		// Add the corresponding subclass to the row
		if(selected[index])
		{
			row.classList.add("selected");
			sI.classList.add("selected");
		}
		graphViewer.updatePointSelection(index, selected[index]);
	}

// Make the row with ID 'id' selected
	function selectData(id)
	{
		// Get the index of the vector with ID 'id'
		var index = IDList.indexOf(id);

		// Do nothing if we don't have a vector with ID 'id'
		if(index < 0) return;

		// This method will only do something if this vector is deselected
		if(!selected[index])
		{
			// Find the row in the table corresponding to this ID
			var row = document.getElementById("vector" + id);
			var sI = document.getElementById("s" + id);

			// It is selected
			row.classList.add("selected");
			sI.classList.add("selected");

			// Select the data
			selected[index] = true;

			// We have one more selected item
			numSelected++;			
		}
	}

// Select all of the rows
	function selectAll()
	{
		for (var i = 0; i < IDList.length; i++)
			selectData(IDList[i]);

		updateApplyButtonText();
	}

// If every entry is selected, deselect all 
//  Otherwise, select all
	function toggleSelectAll()
	{
		var allEntriesSelected = true;

		// Go through the data list, looking for any value that is deselected
		for (var i = 0; i < dataList.length; i++)
		{
			// Is this entry deselected?
			if (!selected[index])
			{
				// We have proof that not all the entries are selected; we don't need to check more
				allEntriesSelected = false;
				break;
			}
		}

		// Did we find any deselected values?
		if (!allEntriesSelected)
		{
			// If so, we should select them
			for (var i = 0; i < IDList.length; i++)
				selectData(IDList[i]);
		}
		else
		{
			// If each row is selected, deselect them all
			for (var i = 0; i < IDList.length; i++)
				deselectData(IDList[i]);
		}

		updateApplyButtonText();
	}

// Deselect the row with ID 'id'
	function deselectData(id)
	{
		// Get the index of the vector with ID 'id'
		var index = IDList.indexOf(id);

		// Do nothing if we don't have a vector with ID 'id'
		if(index < 0) return;

		// This method will only do something if this vector is selected
		if(selected[index])
		{
			// Find the row in the table corresponding to this ID
			var row = document.getElementById("vector" + id);
			var sI = document.getElementById("s" + id);

			// The row isn't selected anymore
			row.classList.remove("selected");
			sI.classList.remove("selected");

			// Deselect the data
			selected[index] = false;

			// We have one less selected item
			numSelected--;
		}
	}

// Deselect all of the rows
	function deselectAll()
	{
		for(var i = 0; i < IDList.length; i++)
			deselectData(IDList[i]);

		updateApplyButtonText();
	}

// Toggle the 'selected' state of the row with ID 'id'
	function toggleSelected(id)
	{
		// Find the index of the vector with ID 'id'
		var index = IDList.indexOf(id);

		// Do nothing if we don't have a vector with ID 'id'
		if(index < 0) return;
		// Case 1: the data is selected
		if (selected[index])
			deselectData(id);
		// Case 2: the data is deselected
		else
		{
			selectData(id);
		}

		updateApplyButtonText();
	}

// Append an edit to the edit history
//  This will delete any edits further along the timeline than we are right now

// 'editCode' => 0 if we are trying to remove this data from our data list
//            => 1 if we are trying to add it
//            => 2 if we are editing the entry with ID 'id'
	function addEditToHistory(editCode, id, x = 0, y = 0, z = 0, xPrev = 0, yPrev = 0, zPrev = 0){
		console.log("edit added to history: (" + editCode + ", " + id + ", " + x + ", " + y + ", " + z + ", " + xPrev + ", " + yPrev + ", " + zPrev + ")");
		var newEditNode = new Node(editCode, id, x, y, z);

		// The history list is not empty
		lastEdit.next = newEditNode;
		newEditNode.previous = lastEdit;

		lastEdit = newEditNode;
	}


// Undos the last edit made to the data list (if one exists)
	function undo() {
		console.log("undoing");
		var editCode = lastEdit.editCode;
		var x = lastEdit.x;
		var y = lastEdit.y;
		var z = lastEdit.z;
		var id = lastEdit.id;
		console.log("undo(" + editCode + ", " + id + ", " + x + ", " + y + ", " + z + ")");
		if(editCode != -1)
		{
			switch (editCode){

				case 0: // We just removed some data

					// Put the data back in
					insertData(id, x, y, z);
					break;

				case 1: // We just added some data

					// Take the row out of the table
					removeVectorFromHTML(id);

					removeIDFromArray(id);
					// var index = IDList.indexOf(id);
					// console.log("index = " + index);
					// // Excise the entry from the lists
					// IDList.splice(index, 1);
					// console.log(IDList);
					// dataList.splice(index, 1);

					// stopRenderingVector(id);
					// var row = document.getElementById("vector" + id);

					// // Remove the row from the table
					// tableWindow.removeChild(row);

					break;

				case 2: // We just edited some data
					 var pX = lastEdit.xP;
					 var pY = lastEdit.yP;
					 var pZ = lastEdit.zP;

					 editEntry(id, pX, pY, pZ);
					 break;
			}
			lastEdit = lastEdit.previous;
		}

	}

// Redos the last edit made to the data list (if undone edits exist)
	function redo() {
		console.log("redoing");
		var nextEdit = lastEdit.next;
		if(nextEdit)
		{
			var editCode = nextEdit.editCode;
			var x = nextEdit.x;
			var y = nextEdit.y;
			var z = nextEdit.z;
			var id = nextEdit.id;
			switch(editCode){
				case 0: // We want to remove the data
					removeVectorFromHTML(id);
					removeIDFromArray(id);

					// var index = IDList.indexOf(id);
					// console.log("index = " + index);
					// // Excise the entry from the lists
					// IDList.splice(index, 1);
					// console.log(IDList);
					// dataList.splice(index, 1);

					// stopRenderingVector(id);
					// var row = document.getElementById("vector" + id);

					// // Remove the row from the table
					// tableWindow.removeChild(row);
					break;
				case 1: // We want to add the data
					insertData(id, x, y, z);
					break;
				case 2: // We want to edit the data
					editEntry(id, x, y, z);
					break;
			}
			lastEdit = nextEdit;
		}
	}

// Updates the 3D rendering vector with ID 'id'
	function update3DVectorPosition(id, newX, newY, newZ){
		var index = IDList.indexOf(id);
		graphViewer.updatePoint(index, newX, newY, newZ);
	}

// Stops rendering the vector with ID 'id'
	function stopRenderingVector(id){
		var index = IDList.indexOf(id);
		graphViewer.removePoint(index);
	}

// Starts rendering the vector with ID 'id'
	function startRenderingVector(id, x, y, z)
	{
		graphViewer.addPoint(x, y, z);
	}

	function sumIthColumn(i){
		var sum = 0;
		for(var x = 0; x < dataList.length; x++)
			sum = sum + dataList[x][i];
		return sum;
	}

	function sumIthColumnSquared(i){
		var sum = 0;
		for(var x = 0; x < dataList.length; x++)
			sum = sum + (dataList[x][i] * dataList[x][i]);
		return sum;
	}
// Linear Regression for a 3D line
// x = t; 
// y = y_0 + y_t * t
// z = z_0 + z_t * t

	function lineReg(tInd = 0)
	{
		console.log("regging the line");
		var yInd = (tInd + 1) % 3;
		var zInd = (tInd + 2) % 3;
		var a = sumIthColumn(tInd);
		var b = sumIthColumnSquared(tInd);
		var n = dataList.length;

		var y_0 = 0;
		var y_t = 0;
		var z_0 = 0;
		var z_t = 0;
		for(var i = 0; i < dataList.length; i++)
		{
			var zeroTerm = ( b - a * dataList[i][tInd]);
			var tTerm    = (-a + n * dataList[i][tInd]);
			y_0 = y_0 + zeroTerm * dataList[i][yInd];
			y_t = y_t + tTerm    * dataList[i][yInd];
			z_0 = z_0 + zeroTerm * dataList[i][zInd];
			z_t = z_t + tTerm    * dataList[i][zInd];
		}

		var divisor = b * n - a * a;
		y_0 = y_0 / divisor;
		y_t = y_t / divisor;
		z_0 = z_0 / divisor;
		z_t = z_t / divisor;

		// Find the min of the t values
		var tMin = graphViewer.minPoint;
		var tMax = graphViewer.maxPoint;
		for (var i = 1; i < dataList.length; i++)
		{
			if(dataList[i][tInd] > tMax) tMax = dataList[i][tInd];
			if(dataList[i][tInd] < tMin) tMin = dataList[i][tInd];
		}
		var y0 = y_0 + tMin * y_t;
		var z0 = z_0 + tMin * z_t;
		var y1 = y_0 + tMax * y_t;
		var z1 = z_0 + tMax * z_t;
		console.log(a, b, n);
		console.log(tMin, y0, z0, tMax, y1, z1);
		graphViewer.makeLine(tMin, y0, z0, tMax, y1, z1);
	}

	// Context-sensitive 'apply' button text
	// If one (and only one) row is selected, 
	//   change the apply button's text to reflect its new editing functionality
	function updateApplyButtonText(){
		console.log("numSelected:");
		console.log(numSelected);
		if (numSelected == 1)
			{
				applyButton.innerHTML = "Edit Data";
				var index = selected.indexOf(true);
				xInput.value = dataList[index][0];
				yInput.value = dataList[index][1];
				zInput.value = dataList[index][2];

			}
		else
			applyButton.innerHTML = "Add Data";
	}

	function addRandomPoint(){
		//Generate random coordinates within the bounds
		var coord = [0, 0, 0];
		var i = 0;
		var x = Math.round(Math.random() * (bounds[i++] - bounds[i]) + bounds[i++], 1);
		var y = Math.round(Math.random() * (bounds[i++] - bounds[i]) + bounds[i++], 1);
		var z = Math.round(Math.random() * (bounds[i++] - bounds[i]) + bounds[i++], 1);
		console.log(x, y, z);
		console.log(bounds);

		addEditToHistory(1, nextID, x, y, z);
		insertData(nextID++, x, y, z)

	}
}