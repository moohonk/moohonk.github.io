function Serp(canvas){
    // Width and height of the window
    var width  = 0;
    var height = 0;
    var len = 512;

    var URXCoords = [[0]];
    var URYCoords = [[0]];
    var rotList   = [[0]];
    var lenList   = [len];
    var x0, y0, x1, y1, x2, y2;
    x0 = [[ 0,  0,  1,  1],
        [ 2,  3,  3,  2],
        [ 1,  1,  0,  0],
        [-1, -2, -2, -1]];

    y0 = [[-2, -3, -3, -2],
        [-1, -1,  0,  0],
        [ 1,  2,  2,  1],
        [ 0,  0, -1, -1]];

    x1 = [[ 2,  2,  3,  3],
        [ 2,  3,  3,  2],
        [-1, -1, -2, -2],
        [-1, -2, -2, -1]];

    y1 = [[-2, -3, -3, -2],
        [ 1,  1,  2,  2],
        [ 1,  2,  2,  1],
        [-2, -2, -3, -3]];

    // x2 is x0 
    // (row + 3) % 4
    // (col + 1) % 4
    x2 = [[ 2,  2,  3,  3],
        [ 0,  1,  1,  0],
        [-1, -1, -2, -2],
        [ 1,  0,  0,  1]];

    y2 = [[ 0, -1, -1,  0],
        [ 1,  1,  2,  2],
        [-1,  0,  0, -1],
        [-2, -2, -3, -3]];

    var l = len;
    for (var i = 1; i < 9; i++)
    {
        l = l / 2;
        lenList[i] = l;
    }

    var c = canvas;
    
    // Given the current rotation of the square and the rule, 
    //    determine where the UR corners of child squares are
    // function getChildOffsets(R, rule, length)
    // {
    //     //Return these values
    //     dx0 = x0[R][rule[0]];
    //     dy0 = y0[R][rule[0]];
    //     dx1 = x1[R][rule[1]];
    //     dy1 = y1[R][rule[1]];
    //     dx2 = x2[R][rule[2]];
    //     dy2 = y2[R][rule[2]];
    // }

    function drawSquare(x, y, length)
    {
        //TODO: tell canvas to draw a square at (x, y) with side length [length] and color [color]
        return
    }


    // Non-Recursive Function: Sierpinski iteration
    // Accesses + Modifies a global array containing the UR corners of each successive depth level

    // Given the current fractal depth, create the next level down
    function SierpIterOnce(depth, rule)
    {

        // Access coordinates in UR corner list
        var xC = URXCoords[depth];
        var yC = URYCoords[depth];
        var rots = rotList[depth];

        URXCoords[depth+1] = [];
        URYCoords[depth+1] = [];
        rotList  [depth+1] = [];

        // Loop over all squares in the current fractal depth
        for (var i = 0; i < rotList.length; i++)
        {
            // Get the info for one square
            var R = rots[i];
            var X = xC[i];
            var Y = yC[i];

            var newL = lenList[depth] / 4;

            // Calculate the UR corners of its children
            var xc0 = X + newL * x0[R][rule[0]];
            var xc1 = X + newL * x1[R][rule[1]];
            var xc2 = X + newL * x2[R][rule[2]];

            var yc0 = Y + newL * y0[R][rule[0]];
            var yc1 = Y + newL * y1[R][rule[1]];
            var yc2 = Y + newL * y2[R][rule[2]];

            // Calculate the rotations of its children
            var r0 = (R + rule[0]) % 4;
            var r1 = (R + rule[1]) % 4;
            var r2 = (R + rule[2]) % 4;

            // Push the children onto the next fractal depth
            URXCoords[depth+1] = URXCoords[depth+1].concat([xc0, xc1, xc2]);
            URYCoords[depth+1] = URYCoords[depth+1].concat([yc0, yc1, yc2]);
            rotList  [depth+1] = rotList  [depth+1].concat([ r0,  r1,  r2]);
        }
    }


    // Given a depth and a rule, do sierpinski gasket up to that depth
    //  Store information in relevant lists
    function SierpIterUpTo(depth, rule)
    {
        // for each fractal depth
        for(var d = 0; d < depth; d++)
        {
            SierpIterOnce(d, rule);
        }
    }

    function drawDepth(depth)
    {
        var xC = URXCoords[depth];
        var yC = URYCoords[depth];
        for(var i = 0; i < xC.length; i++)
        {
            drawSquare(xC[i], yC[i], lenList[depth]);
        }
    }

    // A rule consists of three numbers corresponding to how much each quadrant should be rotated
    // 0 -> no change
    // 1 -> +90 degrees
    // 2 -> +180 degrees
    // 3 -> +270 degrees

    // Want to freely go forward or backward in 

    // FUNCTION -- 

    // each fractal chunk has a corner position and a rotation associated with it
    // iterating once 
    // length is divided by two

    // FUNCTION A -- given depth level, find how many positions we should have in the lists already

    // loop for each position in this depth level, starting at A(depth-1) up to A(depth)

    // FUNCTION B -- given rotation and position, find positions and rotations of child quadrants

    // push child positions and rotations onto their respective lists




    // Drawing
    //  Start with a background color
    //  fill in top right quadrant with black
    //  keep doing that
}