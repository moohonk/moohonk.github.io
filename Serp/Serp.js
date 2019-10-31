function Serp(){
    // Width and height of the window
    var width  = 0;
    var height = 0;
    var cx = 0;
    var cy = 0;

    var count = 0;
    var shouldResize = true;
    var sizeChanged = true;
    var horizontal = true;

    var len = 512;
    var MAX_DEPTH = 9;
    var MIN_DEPTH = 0;

    // How far we should go into a horizontal or vertical aspect ratio before we shuffle the UI around
    var ASPECT_RATIO_TOLERANCE = 10;  

    var rule = [0, 0, 0];
    var currentDepth = 4;

    // Lists storing all necessary information to draw any one iteration 
    var URXCoords = [[0]];
    var URYCoords = [[0]];
    var rotList   = [[0]];
    var lenList   = [len];

    // Get all the stuff we want from the webpage

    // We'll draw the fractal here
    var canvas = document.getElementById("canvas");
    var c = canvas.getContext('2d');

    // The rule text fields
    var rule0 = document.getElementById("0Input");
    var rule1 = document.getElementById("1Input");
    var rule2 = document.getElementById("2Input");

    rule0.addEventListener("input", function(){processInput(0);});
    rule1.addEventListener("input", function(){processInput(1);});
    rule2.addEventListener("input", function(){processInput(2);});

    // The depth indicator
    var depthLabel = document.getElementById("currentDepth");

    // The depth modification buttons
    var incButt = document.getElementById("incDepth");
    var decButt = document.getElementById("decDepth");

    incButt.addEventListener("click", function(){changeDepth( 1);});
    decButt.addEventListener("click", function(){changeDepth(-1);});

    // Given the rotation of the parent square and the child square, 
    //  these lists give the offsets of the upper left corners of the child squares
    //var x0, y0, x1, y1, x2, y2;
    var x0 = [[ 0,  0,  1,  1],
          [ 2,  3,  3,  2],
          [ 1,  1,  0,  0],
          [-1, -2, -2, -1]];

    var y0 = [[-2, -3, -3, -2],
          [-1, -1,  0,  0],
          [ 1,  2,  2,  1],
          [ 0,  0, -1, -1]];

    var x1 = [[ 2,  2,  3,  3],
          [ 2,  3,  3,  2],
          [-1, -1, -2, -2],
          [-1, -2, -2, -1]];

    var y1 = [[-2, -3, -3, -2],
          [ 1,  1,  2,  2],
          [ 1,  2,  2,  1],
          [-2, -2, -3, -3]];

    // x2 is x0 
    // (row + 3) % 4
    // (col + 1) % 4
    var x2 = [[ 2,  2,  3,  3],
          [ 0,  1,  1,  0],
          [-1, -1, -2, -2],
          [ 1,  0,  0,  1]];

    var y2 = [[ 0, -1, -1,  0],
          [ 1,  1,  2,  2],
          [-1,  0,  0, -1],
          [-2, -2, -3, -3]];

    var l = len;
    for (var i = 1; i < MAX_DEPTH; i++)
    {
        l = l / 2;
        lenList[i] = l;
    }

    URXCoords[0] = [-lenList[0] / 2];
    URYCoords[0] = [-lenList[0] / 2];

    function animationFrame()
    {
        count = count + 1;
        // Check if the window size has changed
        if (count % 5 == 0)
            if (width != canvas.offsetWidth || height != canvas.offsetHeight)
                shouldResize = true;

        if(shouldResize)
        {
            onResize();
            shouldResize = false;
        }
        window.requestAnimationFrame(function(){animationFrame();});
    }
    
    function updateRule(newRule)
    {
        rule[0] = newRule[0];
        rule[1] = newRule[1];
        rule[2] = newRule[2];
        SierpIterUpTo(MAX_DEPTH);
        onResize();
    }

    // Add [d] to [currentDepth], while keeping [currentDepth] within bounds
    // Update the displayed depth, and redraw the fractal
    function changeDepth(d)
    {
        // Increment and clamp currentDepth within [MIN_DEPTH, MAX_DEPTH]
        currentDepth = currentDepth + d;
        if (currentDepth > MAX_DEPTH) currentDepth = 1 * MAX_DEPTH;
        if (currentDepth < MIN_DEPTH) currentDepth = 1 * MIN_DEPTH;
        
        // Change the displayed depth
        depthLabel.textContent = "" + currentDepth;

        // redraw the fractal
        drawUpTo(currentDepth);
    }

    // Called when the user clicks on a subsquare
    //  Changes the current rule and redraws the fractal
    function selectSubsquare(quadrant, subsquare)
    {
        // If we clicked on an already-selected subsquare, 
        //  we don't need to calculate anything
        if (rule[quadrant-1] == subsquare)
            return;
        
        console.log("quadrant: " + quadrant + ", subsquare: " + subsquare);
        // Deselect all subsquares in the quadrant
        for (var i = 0; i < 4; i++)
        {
            var sub = document.getElementById("q" + quadrant + "-" + i);
            // console.log("q" + quadrant + "-" + i);
            sub.classList.remove("selected");
        }

        // Select the subsquare we just clicked
        var id = "q" + (quadrant) + "-" + subsquare%4;
        console.log(id);
        document.getElementById(id).classList.add("selected");

        // Update the rule
        rule[quadrant-1] = subsquare;

        // Update the value of the input element that was changed
        document.getElementById((quadrant-1) + "Input").value = subsquare;

        updateRule(rule);
    }

    function createRuleButton(i, j)
    {
        var order = [3, 1, 2];

        // The parent
        var quadrant = document.getElementById("q" + (i+1));

        // Create a new rule div
        var subsquare = document.createElement("div");
        subsquare.classList.add("rule");
        subsquare.id = "q" + order[i] + "-" + j;

        // If this subsquare is the first in this quadrant, select it initially
        if(j == 0)
            subsquare.classList.add("selected");

        // When the user clicks on a subsquare, it should become selected
        subsquare.addEventListener("click", function(){selectSubsquare(order[i], j)});
        
        quadrant.appendChild(subsquare);
    }

    // Create the rule UI
    function createRuleButtons()
    {
        for (var i = 0; i < 3; i++)
            for (var j = 0; j < 4; j++)
                createRuleButton(i, j);
    }

    // Called whenever the window changes size
    function onResize()
    {
        /**
         * TODO: if the window width is less than the window height (not canvas width and height),
         *  change the style of the menu options to be more mobile-friendly:
         * +---------------+
         * |     Title     |
         * +---------------+
         * |               |
         * |               |
         * | fractal here  |
         * |               |
         * |               |
         * |               |
         * +---------------|
         * |  Rule | Depth |
         * | +-+-+ |       |
         * | | |+| |     + |
         * | +-+-+ |dep    |
         * | |+|+| |    -- |
         * | +-+-+ |       |
         * +---------------+
         * 
         * objectives:
         * 1. make fractal take up the entire width of the screen, but not the entire height
         * 2. make the rule and depth separate from the title
         * 3. make the rule and depth float to the bottom of the screen
         * 4. make the rule and depth display side-by-side
         * 5. make the depth display with the label to the left and the buttons to the right
         * 6. make the title display above everything and take up the entire width of the screen
         * 
         * methods:
         *    define the [right] width percentage in HTML, enabling JS editing
         *      when width < height, [right] width = 100%
         * 
         *    [upperDepthUI]: (DONE)
         *      when width > height, remove any HTML-defined styling
         *      when width < height, display = grid
         * 
         *    create a div [lowerUI] below the canvas in [right]
         *      hide when width > height
         *      layout = flex
         *    create variables referencing [rule] and [depth]
         *    when width < height, remove [rule] and [depth] from [window1] 
         *      place into [lowerUI]
         *    [lowerUI] 
         *      absolute position
         *    make [left] invisible
         *    make [right] take up the entire screen width
        **/
        var titleDiv = document.getElementById("titleContainer");
        var ruleUI   = document.getElementById("rule");
        var title    = document.getElementById("title");
        var depthUI  = document.getElementById("depth");
        var window1  = document.getElementById("window1");
        var topRight = document.getElementById("topRight");
        var btmRight = document.getElementById("btmRight");
        var left     = document.getElementById("left");
        var right    = document.getElementById("right");
        var ruleInput = document.getElementById("ruleInputContainer");
        var uDUI = document.getElementById("upperDepthUI");
        // If the window's width is less than its height, we want to shuffle the UI around a bit
        if(horizontal && (window.innerWidth < window.innerHeight + ASPECT_RATIO_TOLERANCE))
        {
            // We are now vertical
            horizontal = false;

            // Shift the title div into position above the canvas
            titleDiv.removeChild(title);
            topRight.appendChild(title);

            // Shift the UI into position below the canvas
            window1.removeChild(ruleUI);
            window1.removeChild(depthUI);

            btmRight.appendChild(ruleUI);
            btmRight.appendChild(depthUI);

            // Style changes
            left.style = "display:none;";
            right.style = "width:100%";
            //btmRight.style = "height:299px;";
            ruleInput.style = "width:200px; display:none;";

            uDUI.classList.add("bigFont");

            canvas.height = window.innerHeight - 5 - topRight.offsetHeight - btmRight.offsetHeight;

            uDUI.style = "display:grid";

        }

        // TODO: define a tolerance so that slightly resizing an almost-square window doesn't result in weird flickering
        if(!horizontal && (window.innerWidth > window.innerHeight + ASPECT_RATIO_TOLERANCE))
        {
            // We are now horizontal
            horizontal = true;

            topRight.removeChild(title);
            titleDiv.appendChild(title);

            btmRight.removeChild(ruleUI);
            btmRight.removeChild(depthUI);

            window1.appendChild(ruleUI);
            window1.appendChild(depthUI);

            // Revert style changes
            left.style = "";
            right.style = "";
            //btmRight.style = "";
            ruleInput.style = "width:200px;";

            if(uDUI.classList.contains("bigFont"))
                uDUI.classList.remove("bigFont");

            uDUI.style = "";
        }


        width  = canvas.offsetWidth; // - (canvas.offsetWidth  % 512);
        height = canvas.offsetHeight;// - (canvas.offsetHeight % 512);

        canvas.width = width;
        canvas.height = height;

        // Truncate the width and height so we can have a midpoint with integer coordinates
        if (height % 2 == 1) height = height - 1;
        if (width  % 2 == 1) width  = width  - 1;

        // Should we shrink the fractal?
        if((width < lenList[0]) || (height < lenList[0]))
        {
            sizeChanged = true;
            lenList[0] = lenList[0] / 2;
            if(currentDepth == MAX_DEPTH) changeDepth(-1);
            MAX_DEPTH = MAX_DEPTH - 1;
        }

        // Can we grow the fractal?
        if((lenList[0]*2 < width) && (lenList[0]*2 < height))
        {
            sizeChanged = true;
            lenList[0] = lenList[0] * 2;
            MAX_DEPTH = MAX_DEPTH + 1;
        }

        // If the base length has changed, update the rest of the length list 
        //   and recalculate the fractal 
        if (sizeChanged)
        {
            sizeChanged = false;
            URXCoords[0] = [-lenList[0] / 2];
            URYCoords[0] = [-lenList[0] / 2];
            for(var i = 1; i < MAX_DEPTH; i++)
                lenList[i] = lenList[i-1] / 2;
            SierpIterUpTo(MAX_DEPTH);
        }

        // Draw the fractal
        drawUpTo(currentDepth);
    }

    function drawSquare(x, y, length, color)
    {
        // Truncate decimal values so we don't have to deal with antialiasing
        var x1 = x - x % 1;
        var y1 = y - y % 1;
        c.fillStyle = color;
        c.fillRect(x1, y1, length, length);
    }

    this.drawSquare = function(x, y, length, color)
    {
        drawSquare(x, y, length, color);
    };

    // Non-Recursive Function: Sierpinski iteration
    // Accesses + Modifies a global array containing the UR corners of each successive depth level

    // Given the current fractal depth, create the next level down
    function SierpIterOnce(depth)
    {
        // Access coordinates in UR corner list
        var xC = URXCoords[depth];
        var yC = URYCoords[depth];
        var rots = rotList[depth];
        var newL = lenList[depth] / 4;

        // Calculate offsets for the current depth
        var x00 = [[],[],[],[]];
        var x11 = [[],[],[],[]];
        var x22 = [[],[],[],[]];
        var y00 = [[],[],[],[]];
        var y11 = [[],[],[],[]];
        var y22 = [[],[],[],[]];

        // Multiply everything outside of the loop
        //  Slows down the first couple iterations but saves time later
        for(var i = 0; i < 4; i++)
        {
            for(var j = 0; j < 4; j++)
            {
                x00[i][j] = x0[i][j] * newL;
                x11[i][j] = x1[i][j] * newL;
                x22[i][j] = x2[i][j] * newL;
                y00[i][j] = y0[i][j] * newL;
                y11[i][j] = y1[i][j] * newL;
                y22[i][j] = y2[i][j] * newL;
            }
        }

        var newDepth = depth + 1;

        URXCoords[newDepth] = [];
        URYCoords[newDepth] = [];
        rotList  [newDepth] = [];

        // Loop over all squares in the current fractal depth
        for (var i = 0; i < rots.length; i++)
        {
            // Get the info for one square
            var R = rots[i];
            var X = xC[i];
            var Y = yC[i];

            // Calculate the UR corners of its children
            var xc0 = X + x00[R][rule[0]];
            var xc1 = X + x11[R][rule[1]];
            var xc2 = X + x22[R][rule[2]];

            var yc0 = Y - y00[R][rule[0]];
            var yc1 = Y - y11[R][rule[1]];
            var yc2 = Y - y22[R][rule[2]];

            // Calculate the rotations of its children
            var r0 = (R + rule[0]) % 4;
            var r1 = (R + rule[1]) % 4;
            var r2 = (R + rule[2]) % 4;

            // Put the children into the next fractal depth
            // Don't use .concat() -- it's around 700x slower
            var start = URXCoords[newDepth].length;
            URXCoords[newDepth][start  ] = xc0;
            URXCoords[newDepth][start+1] = xc1;
            URXCoords[newDepth][start+2] = xc2;

            URYCoords[newDepth][start  ] = yc0;
            URYCoords[newDepth][start+1] = yc1;
            URYCoords[newDepth][start+2] = yc2;

            rotList  [newDepth][start  ] = r0;
            rotList  [newDepth][start+1] = r1;
            rotList  [newDepth][start+2] = r2;
        }
    }

    // Given a depth and a rule, do sierpinski gasket up to that depth
    function SierpIterUpTo(depth)
    {
        for(var d = 0; d < depth; d++)
            SierpIterOnce(d);
    }

    function drawDepth(depth)
    {
        var xC = URXCoords[depth];
        var yC = URYCoords[depth];

        //colors = ['#000000','#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff', '#00ffff', '#ffff80', '#ff80ff', '80ffff'];
        color = '#000';

        // Translate to center of screen
        var midX = width / 2;
        var midY = height / 2;

        for(var i = 0; i < xC.length; i++)
            drawSquare(xC[i] + midX, yC[i] + midY, lenList[depth] / 2, color);//colors[depth]);
    }

    function drawUpTo(depth)
    {
        // Overwrite anything currently drawn on the canvas
        c.fillStyle = '#000';
        c.fillRect(0, 0, width, height);

        // Draw the white square
        drawSquare(URXCoords[0][0] + width / 2, URYCoords[0][0] + height / 2, lenList[0], "#fff");

        for (var d = 0; d < depth; d++)
            drawDepth(d);
    }

    // Called when the [i]th text input box has been changed
    // Sanitizes the input and updates the rule
    function processInput(i)
    {
        console.log("processing input");
        var inputs = [rule0, rule1, rule2];

        var r = inputs[i];

        // If someone types a new number without selecting the old number, remove the old number
        if(r.value >= 10) r.value = (1 * r.value) % 10;

        // If a number is one above or one below the rule domain, loop back around
        if(r.value ==  4) r.value = 0;
        if(r.value == -1) r.value = 3;

        // If a number is out of the rule domain, put it back into the rule domain
        if(r.value >   3) r.value = 3;
        if(r.value <   0) r.value = 0;

        // Cast r.value to an integer from a string
        selectSubsquare(i+1, 1 * r.value);
    }

    window.addEventListener('load', function() {
        onResize(true);
        createRuleButtons();
      }, false);
      window.requestAnimationFrame(function(){animationFrame();});
}