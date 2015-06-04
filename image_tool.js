/*
*	M. Stanley
*   B. Messner
*	Image Processing and Visualization Tool
*  
*	2015-06-02
*/

var im_name = "cones.png";


//function that is called when the window is loaded
//finds the texture and calls the draw function
window.onload = function main(){
    gl = initialize();

    /*
    var image = new Image();
    image.src = "images/" + im_name;
    image.onload = function() {
        render_image(image, gl);
    }*/
    
    Promise.all([ initializeTexture(gl, 0, 'images/cones1.png')])
    .then(function () {load_image2(gl)})
    .catch(function (error) {alert('Failed to load texture '+  error.message);}); 
    
}

function load_image2(gl){
    Promise.all([ initializeTexture(gl, 1, 'images/cones2.png')])
    .then(function () {animation(gl.images, gl);})
    .catch(function (error) {alert('Failed to load texture '+  error.message);}); 
}

/*
 *  regular old initilaization method, sets up the canvas
 *  and gl objects, also initializes various matrices and uniforms
 */
function initialize() {
    var canvas = document.getElementById('gl-canvas');
    
    // Use webgl-util.js to make sure we get a WebGL context
    var gl = WebGLUtils.setupWebGL(canvas);
    
    if (!gl) {
        alert("Could not create WebGL context");
        return;
    }
    
    // store a reference to the canvas in the gl object
    gl.canvas = canvas;
    
    // set the viewport to be sized correctly
    gl.viewport(0,0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //gl.enable(gl.DEPTH_TEST);
    // create program with our shaders and enable it
    gl.inten_diff_program = initShaders(gl, "inten-diff-vertex-shader", "inten-diff-fragment-shader");

    gl.useProgram(gl.inten_diff_program);

    

    gl.images = [];

    // create the current transform and the matrix stack right in th gl object
    gl.currentTransform = mat4();
    gl.transformStack = [];
    
    // add some method for working with the matrix stack
    gl.push = function(){
        gl.transformStack.push(gl.currentTransform);
    }
    
    gl.pop = function(){
        gl.currentTransform = gl.transformStack.pop();
    }

    return gl;
}

function animation(images, gl){

    var im1_box = document.getElementById('im1_box');
    var im2_box = document.getElementById('im2_box');

    var im1flag = im1_box.checked;
    im1_box.onchange = function(){
        im1flag = im1_box.checked;
        positionBuffer = setup_image(images, gl, im1flag, im2flag, e_tag, program);
    }

    var im2flag = im2_box.checked;
    im2_box.onchange = function(){
        im2flag = im2_box.checked;
        positionBuffer = setup_image(images, gl, im1flag, im2flag, e_tag, program);
    }

    var e_menu = document.getElementById('effect_menu');
    var program = gl.inten_diff_program;
    var e_tag = 'e1'

    var positionBuffer = setup_image(images, gl, im1flag, im2flag, e_tag, program);

    e_menu.onchange = function(){
        if(e_menu.value == 'e1'){
            program = gl.inten_diff_program;
            gl.useProgram(program);
            e_tag = e_menu.value;
            positionBuffer = setup_image(images, gl, im1flag, im2flag, e_tag, program);
        }
        if(e_menu.value == 'e2'){
            // bianca add program name
        }
    }

    /********************************************/
    /*************** Mouse Handler **************/
    /********************************************/
    gl.canvas.onmousedown = mouse_down_handler;
    document.onmouseup = mouse_up_handler;
    document.onmousemove = mouse_move_handler;

    var dx_text = document.getElementById('dx_text');
    var dy_text = document.getElementById('dy_text');

    
    var mouse_down = false; // set the mouse down flag to false
    var old_mouse_x = 0.0;    // set up variables to hold the mouses x and y
    var old_mouse_y = 0.0;
    var dx = 0.0;
    var dy = 0.0;

    dx_text.innerHTML = dx;
    dy_text.innerHTML = -dy;
    
    function mouse_down_handler(event){
        mouse_down = true;  // the mouse is now down
        old_mouse_x = event.clientX;    // get the mouse x and y
        old_mouse_y = event.clientY;
    }

    function mouse_up_handler(event){
        mouse_down = false; // the mouse is now up
    }
    
    function mouse_move_handler(event){
        if (!mouse_down) {  // if the mouse isn't down
                    // do nothing
            return;
        }
        // while the mouse is down keep updating
        // the variables storing the mouse's location
        var new_mouse_x = event.clientX;
        var new_mouse_y = event.clientY;
        
        // calculate the difference between the last mouse position
        // and the new and use it as the amount to rotate the mesh
        // the rotation is broken down into its x and y components
        // for simplicity
        dx += new_mouse_x - old_mouse_x;

        //shift button to lock all motion to horizontal:
        if (!pressedKeys[16]) { //if shift button is not being pressed, change in y direction
            dy += new_mouse_y - old_mouse_y;
        } 
            
        dx_text.innerHTML = dx;
        dy_text.innerHTML = -dy;

        // update the old mouse position
        old_mouse_x = new_mouse_x;
        old_mouse_y = new_mouse_y;
    }
/********************************************/


/********************************************/
/************ Key Press Handling ***********/
/********************************************/
    var moveDist = 1; //distance image will move on a key press, initialized to 1

    //create "dictionary" of keys and store whether they are pressed or not
    var pressedKeys = {};

    document.onkeydown = function(event) {
        pressedKeys[event.keyCode] = true;
    }

    document.onkeyup = function(event) {
        pressedKeys[event.keyCode] = false;
    }
    
    
    //funtion to be called to handle key presses:
    function handleKeys() {

        if (pressedKeys[69] && moveDist <= 2) { //speed up motion if q key pressed
            moveDist = moveDist*1.01;
        } 

        if (pressedKeys[81] && moveDist >= 0.1) { //slow down motion if e key pressed
            moveDist = moveDist * 0.99;
            console.log("speed-", moveDist);
        } 

        //horizontal motion key control:
        if (pressedKeys[65]) { //if A key is pressed, shift in neg x direction
            dx -= moveDist;
        } else if (pressedKeys[68]) { //if D key is pressed, shift in pos x direction
            dx += moveDist;
        } 
    
        //vertical motion key control
        if (!pressedKeys[16]) { //only move vertically if shift key is not pressed
            if (pressedKeys[87]) { //if W key is pressed, shift in pos y direction
                dy -= moveDist;
            } else if (pressedKeys[83]) { //if S key is pressed, shift in neg y direction
                dy += moveDist;
        } }

        dx_text.innerHTML = dx;
        dy_text.innerHTML = -dy;
  }

/********************************************/



    var tick = function(){

        handleKeys();

        var u_Dx = gl.getUniformLocation(program, 'u_Dx');
        var u_Dy = gl.getUniformLocation(program, 'u_Dy');

        gl.uniform1f(u_Dx, dx / images[0].width );
        gl.uniform1f(u_Dy, -(dy / images[0].height) );        

        render_image(gl, positionBuffer);
        requestAnimationFrame(tick);
    };
    
    tick();

}

/*
 *param: takes the gl context as a parameter
 *return: nothing
 *draws the vertices in the array buffer
 */
function setup_image(images, gl, im1flag, im2flag, e_tag, program){

    var image1 = images[0];
    var image2 = images[1];
    /*console.log("inside render_image");
    console.log("image width: ", image.width);
    console.log("image height: ", image.height);*/

    // init texture switching uniforms for texture
    var u_Image1 = gl.getUniformLocation(program, 'u_Image1');
    var u_Image2 = gl.getUniformLocation(program, 'u_Image2');

    gl.uniform1i(u_Image1, 0);
    gl.uniform1i(u_Image2, 1);

    var u_ImFlag1 = gl.getUniformLocation(program, 'u_ImFlag1');
    var u_ImFlag2 = gl.getUniformLocation(program, 'u_ImFlag2');

    /*
    console.log("image src1: ", image1.src);
    console.log("image src2: ", image2.src);
    */

    resize_canvas(gl, image1);

    gl.clear(gl.COLOR_BUFFER_BIT);


    create_texture(gl, image1);
    create_texture(gl, image2);

	create_texture_coords("a_TexCoord", gl, program);

	var u_Resolution = gl.getUniformLocation(program, "u_Resolution");
    gl.uniform2f(u_Resolution, gl.canvas.width, gl.canvas.height);

    //console.log("image height: ", image.height);
    var recQuad = createRec(gl, 0, 0, image1.width, image1.height);
    //console.log("recQuad: ", recQuad);
    var positionBuffer = createBuffer(gl, gl.ARRAY_BUFFER, recQuad, "positionBuffer", gl.STATIC_DRAW);
    enableAttribute(gl, program, positionBuffer, "a_Position", 2, 0, 0);

    //console.log("im 1 flag", im1flag);
    im1flag = (im1flag) ? 1 : 0;
    im2flag = (im2flag) ? 1 : 0;
    //console.log("im 1 flag", im1flag);

    gl.uniform1i(u_ImFlag1, im1flag);
    gl.uniform1i(u_ImFlag2, im2flag);

    if(e_tag == 'e1'){
        inten_diff(gl, image1, image2);
    }
    if(e_tag == 'e2'){
        kernel_conv(gl, image1, image2);
    }
    
    return positionBuffer;

}

function render_image(gl, positionBuffer){

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function inten_diff(gl, im1, im2){

}

function kernel_conv(gl, im1, im2){
}


function resize_canvas(gl, image){
    gl.canvas.width = image.width;
    gl.canvas.height = image.height;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function createRec(gl, x, y, width, height){
    var x1 = x;
    var x2 = x + width;
    var y1 = y;
    var y2 = y + height;
    var recCoords = new Float32Array([
        x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1, 
        x2, y2  ]);

    return recCoords;
}

/*
 * This is helper function to create buffers.
 */
function createBuffer(gl, destination, data, name, type){
    var buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the ',name,' buffer');
        return -1;
    }
    
    gl.bindBuffer(destination, buffer);
    gl.bufferData(destination, data, type);
    return buffer;
}


/*
 * This is a new helper function to simplify enabling attributes.
 * Note that this no longer fails if the attribute can't be found. It gives us a warning, but doesn't crash.
 * This will allow us to use different shaders with different attributes.
 */ 
function enableAttribute(gl, program, buffer, name, size, stride, offset){
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   var attribute = gl.getAttribLocation(program, name);
   if (attribute >= 0) {
       gl.vertexAttribPointer(attribute, size, gl.FLOAT, false, 0,0);
       gl.enableVertexAttribArray(attribute);
   }else{
       console.log('Warning: Failed to get ',name );

   }
}


function create_texture_coords(a_TexCoord, gl, program){
    var texCoords = new Float32Array([
        0.0,  0.0,
        1.0,  0.0,
        0.0,  1.0,
        0.0,  1.0,
        1.0,  0.0,
        1.0,  1.0]);
    var texCoordBuffer = createBuffer(gl, gl.ARRAY_BUFFER, texCoords, "textureCoordBuffer", gl.STATIC_DRAW);
    enableAttribute(gl, program, texCoordBuffer, a_TexCoord, 2, 0, 0);
}

function create_texture(gl, image){
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // creating the texture so that we can use any sized image
    // (i.e. the width and height may not be powers of 2)
    // as a result unable to use features such as mip-mapping
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    return texture;
}

function initializeTexture(gl, textureid, filename) {
    
    return new Promise(function(resolve, reject){
        var texture = gl.createTexture();
        var image = new Image();
        
    
        image.onload = function(){
            
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
            gl.activeTexture(gl.TEXTURE0 + textureid);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);


            gl.images.push(image);
            
            
            resolve();
        }
        
        image.onerror = function(error){
            reject(Error(filename));
        }
    
        image.src = filename; 
    });
}


