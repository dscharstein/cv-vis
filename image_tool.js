/*
 *	M. Stanley
 *  B. Messner
 *	Image Processing and Visualization Tool
 *  
 *	2015-06-02
 */

var im_name = "cones.png";
var mode;
var modes = ["inten_diff", "gradient", "bleyer", "blink"];


/*
 * function that is called when the window is loaded
 * loads image 1 and then calls the function to load 
 * image 2
 */
window.onload = function main(){

    // initialize the gl object 
    gl = initialize_gl();
    
    // load the first image asynchronously using a promise
    // the image loaded from this is stored with image id 0
    // on success this will try to load image 2
    Promise.all([ read_image(gl, 0, 'images/cones1.png')])
    .then(function () {load_image2(gl)})
    .catch(function (error) {alert('Failed to load texture '+  error.message);}); 
    
}

/*
 * loads in image 2 of the stereo pair, this
 * is done asynchronously using a promise object
 * on success this function will call the main animation
 * loop, otherwise it will throw an error 
 */
function load_image2(gl){
    Promise.all([ read_image(gl, 1, 'images/cones2.png')])
    .then(function () {animation(gl);})
    .catch(function (error) {alert('Failed to load texture '+  error.message);}); 
}

/*
 *  regular old initilaization method, sets up the canvas
 *  and gl objects, also initializes various matrices and uniforms
 */
function initialize_gl() {
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

    // create program with our shaders and store a reference to them 
    // in the gl object
    gl.inten_diff_program = initShaders(gl, "inten-diff-vertex-shader", "inten-diff-fragment-shader");
    gl.kernel_conv_program = initShaders(gl, "kernel-conv-vertex-shader", "kernel-conv-fragment-shader");
    gl.black_white_program = initShaders(gl, "color-bw-vertex-shader", "color-bw-fragment-shader");
    gl.display_program = initShaders(gl, "display-vertex-shader", "display-fragment-shader");
    gl.magnitude_program = initShaders(gl, "magnitude-vertex-shader", "magnitude-fragment-shader");
    gl.abs_diff_program = initShaders(gl, "abs-diff-vertex-shader", "abs-diff-fragment-shader");


    // dictionary to hold image objects once they have been loaded
    // images are stored with an id, e.g. the first image is stored with
    // the key "image0"
    gl.images = {};

    gl.textures = {};

    // variable to hold the shader that is currently being used
    gl.current_program;

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

/*
 * main animation function, this function loops  
 * and updates gl and the canvas based on user interaction
 * 
 * 
 */
function animation(gl){


    // initialize the textures and image quad
    initialize();

    // checkboxes that control which image is displayed
    var im1_box = document.getElementById('im1_box');
    var im2_box = document.getElementById('im2_box');
    im1_box.checked = false;
    im2_box.checked = false;

    var old_state = {};
    old_state.mode = mode;
    
    // dropdown menu to control which visualization is
    // currently running
    var e_menu = document.getElementById('effect_menu');
    e_menu.value = 'e1';
    var e_tag;

    // fucntion used to change visualizations
    // when a different visualization is selected
    // form the dropdown menu
    program_select = function(){
        if(e_menu.value == 'e1'){
            mode = modes.indexOf("inten_diff");
            old_state.mode = mode;
        }
        if (e_menu.value == 'e2'){
            mode = modes.indexOf("gradient");
            old_state.mode = mode;
        }
    }

    program_select();

    e_menu.onchange = function(){
        program_select();
    }

    
    // handle which of the two images is displayed
    // using the input from the checkboxes
    var im1flag = im1_box.checked;
    im1_box.onchange = function(){
        im1flag = im1_box.checked;
        old_state.im1flag = im1flag;
    }

    var im2flag = im2_box.checked;
    im2_box.onchange = function(){
        im2flag = im2_box.checked;
        old_state.im2flag = im2flag;
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
        mode = old_state.mode;
        im1flag = old_state.im1flag;
        im2flag = old_state.im2flag;
        im1_box.checked = im1flag;
        im2_box.checked = im2flag;

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

        // update the old mouse position
        old_mouse_x = new_mouse_x;
        old_mouse_y = new_mouse_y;
    }
    /********************************************/


    /********************************************/
    /************ Key Press Handling ***********/
    /********************************************/
    var moveDist = 1; //distance image will move on a WASD key press, initialized to 1 (1 pixel in given direction)
    var s_val = 0.75; //s-value that determines what level of texture detail shows up, initialized to 1/2
    

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
        //change motion speed:
        if (pressedKeys[69] && moveDist <= 3) { //speed up motion if q key pressed
            moveDist = moveDist+.05;
        } 

        if (pressedKeys[81] && moveDist >= 0.05) { //slow down motion if e key pressed
            moveDist = moveDist-0.05;
        } 

        if(pressedKeys[65] || pressedKeys[68] || pressedKeys[87] || pressedKeys[83]){
            mode = old_state.mode;
            im1flag = old_state.im1flag;
            im2flag = old_state.im2flag;
            im1_box.checked = im1flag;
            im2_box.checked = im2flag;
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
            } 
        }

        //change s_val for textures to show up more or less boldly
        if (pressedKeys[90] && s_val >= 0.5) { //if Z key is pressed, decrease s_val
            s_val -= 0.025;
        } 
        else if (pressedKeys[88] && s_val <= 4) { //if X key is pressed, increase s_val
            s_val += 0.025;
        } 

        //reset image position
        if (pressedKeys[82]) { //if R is pressed, reset position of top image
            dx = 0;
            dy = 0;
        } 
        
        //reset all controls
        //shift-r
        if (pressedKeys[82] && pressedKeys[16]){
            moveDist = 1;
            s_val = 0.75;
        }

        //set to blink mode and displays image 2
        if (pressedKeys[66]){
            if (mode !== modes.indexOf("blink")){
                old_state.mode = mode;
                mode = modes.indexOf("blink");
            }
            im1flag = 1;
            im2flag = 0;
            im1_box.checked = true;
            im2_box.checked = false;
        }else{
            if(mode == modes.indexOf("blink")){
                im1flag = 0;
                im2flag = 1;
                im1_box.checked = false;
                im2_box.checked = true;
            }
        }

        //set displayed text to match current dx/dy
        dx_text.innerHTML = dx.toFixed(4);
        dy_text.innerHTML = (-dy).toFixed(4);
    }

    /********************************************/


    // main animation loop
    var tick = function(){

        handleKeys();

        /*
        var u_Dx = gl.getUniformLocation(gl.current_program, 'u_Dx');
        var u_Dy = gl.getUniformLocation(gl.current_program, 'u_Dy');
        var u_S = gl.getUniformLocation(gl.current_program, 'u_S');

        gl.uniform1f(u_Dx, dx / gl.images["image0"].width );
        gl.uniform1f(u_Dy, -(dy / gl.images["image0"].height) );     
        gl.uniform1f(u_S, s_val);
        */

        var scale_dx = dx / gl.images["image0"].width;
        var scale_dy = -(dy / gl.images["image0"].height);
        // convert the boolean to an int to send to the shader
        im1flag = (im1flag) ? 1 : 0;
        // convert the boolean to an int to send to the shader
        im2flag = (im2flag) ? 1 : 0;


        switch(mode){
            case 0:
                inten_diff(gl, im1flag, im2flag, scale_dx, scale_dy, s_val);
                break;
            case 1:
                gradient(gl, im1flag, im2flag, scale_dx, scale_dy, s_val);
                break;
            case 2:
                bleyer(gl, im1flag, im2flag, scale_dx, scale_dy, s_val);
                break;
            case 3:
                myblink(gl, im1flag, im2flag, scale_dx, scale_dy, s_val);
                break;
        } 

        display(gl, im1flag, im2flag, scale_dx, scale_dy, s_val);
        //render_image(gl);
        requestAnimationFrame(tick);
    };
    
    tick();

}

function display(gl, im1flag, im2flag, scale_dx, scale_dy, s_val){
    switch_shader(gl, gl.display_program, gl.textures["orig_image1"], gl.textures["orig_image2"]);
    var u_Image1 = gl.getUniformLocation(gl.display_program, 'u_Image1');
    gl.uniform1i(u_Image1, gl.textures["out"].textureid);
    render_image(gl);
}

function inten_diff(gl, im1flag, im2flag, scale_dx, scale_dy, s_val){
    diff(gl, gl.textures["orig_image1"], gl.textures["orig_image2"], gl.textures["out"], im1flag, im2flag, scale_dx, scale_dy, s_val);
}

function myblink(gl, im1flag, im2flag, scale_dx, scale_dy, s_val){
    if(im1flag){
        copy_tex(gl, gl.textures["orig_image1"], gl.textures["out"]);
    }else{
        diff(gl, gl.textures["orig_image1"], gl.textures["orig_image2"], gl.textures["out"], false, true, scale_dx, scale_dy, s_val);
    }

}

function bleyer(gl, im1flag, im2flag, scale_dx, scale_dy, s_val){

}


function gradient(gl, im1flag, im2flag, scale_dx, scale_dy, s_val){

    
    gl.textures["im2_alter1"] = black_white(gl, gl.textures["orig_image2"], gl.textures["im2_alter1"]);
    gl.textures["im2_alter2"] = sobel(gl, 1, 0, 3, 1, gl.textures["im2_alter1"], gl.textures["im2_alter2"]);
    gl.textures["im2_alter1"] = black_white(gl, gl.textures["orig_image2"], gl.textures["im2_alter1"]);
    gl.textures["im2_alter3"] = sobel(gl, 0, 1, 3, 1, gl.textures["im2_alter1"], gl.textures["im2_alter3"]);
    gl.textures["im2_alter1"] = magnitude(gl, gl.textures["im2_alter2"], gl.textures["im2_alter3"], gl.textures["im2_alter1"]);

    gl.textures["im1_alter1"] = black_white(gl, gl.textures["orig_image1"], gl.textures["im1_alter1"]);
    gl.textures["im1_alter2"] = sobel(gl, 1, 0, 3, 1, gl.textures["im1_alter1"], gl.textures["im1_alter2"]);
    gl.textures["im1_alter1"] = black_white(gl, gl.textures["orig_image1"], gl.textures["im1_alter1"]);
    gl.textures["im1_alter3"] = sobel(gl, 0, 1, 3, 1, gl.textures["im1_alter1"], gl.textures["im1_alter3"]);
    gl.textures["im1_alter1"] = magnitude(gl, gl.textures["im1_alter2"], gl.textures["im1_alter3"], gl.textures["im1_alter1"]);

    diff(gl, gl.textures["im1_alter1"], gl.textures["im2_alter1"], gl.textures["out"], im1flag, im2flag, scale_dx, scale_dy, s_val);
}


/*
 * creates image textures, sets the canvas to the 
 * appropriate size, and creates the quad on which
 * the images will be rendered
 */
function initialize(){

    var image1 = gl.images["image0"];
    var image2 = gl.images["image1"];

    resize_canvas(gl, image1);

    var image1_tex = create_texture(gl, image1, 0, image1.width, image1.height);
    var image2_tex = create_texture(gl, image2, 1, image2.width, image2.height);

    gl.textures["orig_image1"] = image1_tex;
    gl.textures["orig_image2"] = image2_tex;

    create_image_plane(image1.width, image1.height);

    gl.textures["im1_alter1"] = create_texture(gl, null, 3, image1.width, image1.height);
    gl.textures["im1_alter2"] = create_texture(gl, null, 4, image1.width, image1.height);
    gl.textures["im1_alter3"] = create_texture(gl, null, 5, image1.width, image1.height);

    gl.textures["im2_alter1"] = create_texture(gl, null, 6, image2.width, image2.height);
    gl.textures["im2_alter2"] = create_texture(gl, null, 7, image2.width, image2.height);
    gl.textures["im2_alter3"] = create_texture(gl, null, 8, image2.width, image2.height);

    gl.textures["out"] = create_texture(gl, null, 9, image2.width, image2.height);
}

/*
 * creates the quad that will display the images
 * the position data of the vertices of the quad
 * are buffered into a position buffer which is then 
 * stored in the gl object => gl.positionBuffer
 */
function create_image_plane(width, height){
    var recQuad = createRec(gl, 0, 0, width, height);
    gl.positionBuffer = createBuffer(gl, gl.ARRAY_BUFFER, recQuad, "positionBuffer", gl.STATIC_DRAW);
}


/*
 * given a shader program and the gl object
 * initializes the basic uniforms and attributes
 * belonging to that shader:
 * 
 * image samplers
 * texture coordinates
 * position attribute
 * and image resolution
 *
 */
function initialize_shader(gl, program, tex1, tex2){

    // init texture switching uniforms for texture
    var u_Image1 = gl.getUniformLocation(program, 'u_Image1');
    var u_Image2 = gl.getUniformLocation(program, 'u_Image2');

    gl.uniform1i(u_Image1, tex1.textureid);
    gl.uniform1i(u_Image2, tex2.textureid);


	create_texture_coords("a_TexCoord", gl, program);

	var u_Resolution = gl.getUniformLocation(program, "u_Resolution");
    gl.uniform2f(u_Resolution, gl.canvas.width, gl.canvas.height);

    enableAttribute(gl, program, gl.positionBuffer, "a_Position", 2, 0, 0);
}

/*
 * switches to the given shader program and 
 * initializes the shaders basic attributes 
 *
 */
function switch_shader(gl, program, tex1, tex2){
    gl.useProgram(program);
    gl.current_program = program;
    initialize_shader(gl, program, tex1, tex2);
}

/*
 * clears the color buffer and then draws
 * the image quad using the current shader program
 */
function render_image(gl){
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.positionBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function copy_tex(gl, inTex, outTex){
    switch_shader(gl, gl.display_program, gl.textures["orig_image1"], gl.textures["orig_image2"]);
    var u_Image1 = gl.getUniformLocation(gl.display_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex.textureid);
    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outTex;  
}

function diff(gl, inTex1, inTex2, outTex, im1flag, im2flag, dx, dy, s_val){
    switch_shader(gl, gl.inten_diff_program, gl.textures["orig_image1"], gl.textures["orig_image2"]);

    var u_ImFlag1 = gl.getUniformLocation(gl.inten_diff_program, 'u_ImFlag1');
    gl.uniform1i(u_ImFlag1, im1flag);

    var u_ImFlag2 = gl.getUniformLocation(gl.inten_diff_program, 'u_ImFlag2');
    gl.uniform1i(u_ImFlag2, im2flag);

    var u_Dx = gl.getUniformLocation(gl.inten_diff_program, 'u_Dx');
    var u_Dy = gl.getUniformLocation(gl.inten_diff_program, 'u_Dy');
    var u_S = gl.getUniformLocation(gl.inten_diff_program, 'u_S');
    gl.uniform1f(u_Dx, dx);
    gl.uniform1f(u_Dy, dy);     
    gl.uniform1f(u_S, s_val);

    var u_Image1 = gl.getUniformLocation(gl.inten_diff_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex1.textureid);
    var u_Image2 = gl.getUniformLocation(gl.inten_diff_program, 'u_Image2');
    gl.uniform1i(u_Image2, inTex2.textureid);
    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outTex; 
}

function black_white(gl, inTex, outTex){
    switch_shader(gl, gl.black_white_program, gl.textures["orig_image1"], gl.textures["orig_image2"]);
    var u_Image1 = gl.getUniformLocation(gl.black_white_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex.textureid);
    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outTex;  
}

function magnitude(gl, inTex1, inTex2, outTex){
    switch_shader(gl, gl.magnitude_program, gl.textures["orig_image1"], gl.textures["orig_image2"]);
    var u_Image1 = gl.getUniformLocation(gl.magnitude_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex1.textureid);
    var u_Image2 = gl.getUniformLocation(gl.magnitude_program, 'u_Image2');
    gl.uniform1i(u_Image2, inTex2.textureid);
    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outTex; 
}


//sets up/passes to shaders extra variables needed to do a convolution
//does kernel convolution using a kernel of "rows" rows and "cols" columns,
//with anchor pixel "anchor" on inTex and writes the result to outTex
//for sampling outside of the image range it repeats the border pixels
function kernel_conv(gl, rows, cols, anchor, kernel, inTex, outTex){
    switch_shader(gl, gl.kernel_conv_program, gl.textures["orig_image1"], gl.textures["orig_image2"]);
    var u_Image1 = gl.getUniformLocation(gl.kernel_conv_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex.textureid);
    var u_Anchor = gl.getUniformLocation(gl.kernel_conv_program, 'u_Anchor');
    gl.uniform2f(u_Anchor, anchor[0], anchor[1]);

    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);

    var u_Kernel = gl.getUniformLocation(gl.kernel_conv_program, 'u_Kernel');
    gl.uniform1i(u_Kernel, 2);
    var u_KRes = gl.getUniformLocation(gl.kernel_conv_program, 'u_KRes');
    gl.uniform2f(u_KRes, cols, rows);

    var identity = [
        1.0, 0.0, 0.0
    ];

    var deriv = [
        0.0, 0.5, 0.0,
        0.0, 0.0, 0.0,
        0.5, 0.0, 0.0
    ];

    var blur = [
        0.0625, 0.0, 0.0,
        0.125, 0.0, 0.0,
        0.0625, 0.0, 0.0,
        0.125, 0.0, 0.0,
        0.25, 0.0, 0.0,
        0.125, 0.0, 0.0,
        0.0625, 0.0, 0.0,
        0.125, 0.0, 0.0,
        0.0625, 0.0, 0.0
        ];

    var gaussianblur = [
        0.045, 0.0, 0.0,
        0.122, 0.0, 0.0,
        0.045, 0.0, 0.0,
        0.122, 0.0, 0.0,
        0.332, 0.0, 0.0,
        0.122, 0.0, 0.0,
        0.045, 0.0, 0.0,
        0.122, 0.0, 0.0,
        0.045, 0.0, 0.0
    ];

       var emboss = [
        0.0, 2.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        2.0, 0.0, 0.0
    ];

    create_texture_from_array(gl, kernel, gl.FLOAT, gl.RGB, cols, rows, 2);


    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outTex; 

    
}


//applies a sobel filter to approximate the derivatives of an image
//calls kernel_conv to accomplish this
function sobel(gl, x_order, y_order, kernel_size, scale, inTex, outTex) {
    switch_shader(gl, gl.kernel_conv_program, gl.textures["orig_image1"], gl.textures["orig_image2"]);
    if (x_order == 1){
        var kernel = new Float32Array([
            0.0, 1.0, 0.0,
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            0.0, 2.0, 0.0,
            0.0, 0.0, 0.0,
            2.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0
            ]);
    }
    else{
        var kernel = new Float32Array([
            0.0, 1.0, 0.0,
            0.0, 2.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 0.0,
            0.0, 0.0, 0.0,
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            2.0, 0.0, 0.0,
            1.0, 0.0, 0.0
            ]);
    }

    var outTex = kernel_conv(gl, kernel_size, kernel_size, [-1, -1], kernel, inTex, outTex);

    return outTex;
}


function abs_diff(gl, inTex1, inTex2, outTex){
    switch_shader(gl, gl.abs_diff_program, gl.textures["orig_image1"], gl.textures["orig_image2"]);
    var u_Image1 = gl.getUniformLocation(gl.abs_diff_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex1.textureid);
    var u_Image2 = gl.getUniformLocation(gl.abs_diff_program, 'u_Image2');
    gl.uniform1i(u_Image2, inTex2.textureid);

    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return outTex;  
}


function add_weighted(gl, alpha, beta, gamma, inTex1, inTex2, outTex){
    switch_shader(gl, gl.addweighted_program, gl.textures["orig_image1"], gl.textures["orig_image2"]);
    var u_Image1 = gl.getUniformLocation(gl.addweighted_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex1.textureid);
    var u_Image2 = gl.getUniformLocation(gl.addweighted_program, 'u_Image2');
    gl.uniform1i(u_Image2, inTex2.textureid);

    var u_Alpha = gl.getUniformLocation(gl.addweighted_program, 'u_Alpha');
    gl.uniform1i(u_Alpha, alpha);
    var u_Beta = gl.getUniformLocation(gl.addweighted_program, 'u_Beta');
    gl.uniform1i(u_Beta, beta);
    var u_Gamma = gl.getUniformLocation(gl.addweighted_program, 'u_Gamma');
    gl.uniform1i(u_Gamma, gamma);

    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return outTex;  
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

function create_texture(gl, image, textureid, width, height){
    var texture = gl.createTexture();

    // creating the texture so that we can use any sized image
    // (i.e. the width and height may not be powers of 2)
    // as a result unable to use features such as mip-mapping
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0 + textureid);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if(image !== null){
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    }else{
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        console.log("creating empty texture");
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    texture.textureid = textureid;

    return texture;
}

function create_texture_from_array (gl, data, type, format, width, height, textureid){

    gl.getExtension("OES_texture_float");

    var dataTexture = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.activeTexture(gl.TEXTURE0 + textureid);
    gl.bindTexture(gl.TEXTURE_2D, dataTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height,0, format, type, new Float32Array(data));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return dataTexture;
    
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

function read_image(gl, image_id, filename) {
    
    return new Promise(function(resolve, reject){
        var image = new Image();
        
    
        image.onload = function(){

            //image.name = filename;
            gl.images["image"+image_id] = image;
                        
            resolve();
        }
        
        image.onerror = function(error){
            reject(Error(filename));
        }
    
        image.src = filename; 
    });
}


