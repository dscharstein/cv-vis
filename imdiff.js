


/*==============================================================================*/
/*									Main Method									*/
/*==============================================================================*/


window.onload = function main(){

	var imdiff_app = new ImdiffApp();

	var tick = function(){
		if(imdiff_app.images_loaded){
			imdiff_app.update();			
		}
		requestAnimationFrame(tick);
	};

	tick();    
}


/*==============================================================================*/
/*								Webgl Image Class								*/
/*==============================================================================*/

/*
 *	Constructor for WebglImage Object
 *	
 *	takes the following paramaters:
 *	gl => webgl object that will be used to manipulte the image
 *	width => image width
 *	height => image height
 *	sample_type => how the image will be sampled // choices: 	linear filtering 
 *																|| nearest
 */
function WebglImage(gl, width, height, sample_type){
	this.texture_image = gl.createTexture();	//	create a new texture using the
												//	given gl object
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
	//	bind the texture so we can edit its parameters
	gl.bindTexture(gl.TEXTURE_2D, this.texture_image);
	//	init an empty texture with dimensions width x height
	//	use RGBA format and type FLOAT (only available with OES_texture_float ext.)
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
	//	set out of bounds sampling to clamp to edge (repeat edge pixels)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //	set up sampling to be either linear filtering or nearest
    //	use this for both minification and magnification of texels
    if(sample_type == "linear"){
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	}else if(sample_type == "nearest"){
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	}

	//	init other instance variables
	this.width = width;
	this.height = height;
	this.sample_type = sample_type;
	this.gl = gl;
}

/*
 *	Definition of WebglImage methods
 *
 *	these methods will be inherited and can be used
 *	by any instance of class WebglImage
 */
WebglImage.prototype = {
	constructor: WebglImage,
	load_image: function(gl, image){
		//	delete the old texture
		gl.deleteTexture(this.texture_image);
		//	septup the new texture, same as above but make a texture
		//	with the given image in it not empty
		this.texture_image = gl.createTexture();
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
		gl.bindTexture(gl.TEXTURE_2D, this.texture_image);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.FLOAT, image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    	if(this.sample_type == "linear"){
	    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}else if(this.sample_type == "nearest"){
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		}
	},
	self_destruct: function(gl){
		gl.deleteTexture(this.texture_image);	// destroy the webgl texture object so 
												// javascript can garbage collect this object
	}
}



/*==============================================================================*/
/*								imdiff App Class								*/
/*==============================================================================*/



/*
 *	Imdiff App constructor
 *
 *	initializes all instance variables, including:
 *
 *	gets and stores a reference to all html interactive elements
 *
 *	initializes gl context 
 *
 */
function ImdiffApp(){

							//instance variables:
	this.gl; 				//the gl object for the app
	this.image1; 			//bottom image
	this.image2; 			//top image
	this.images = {};
	this.im1_flag = false;
	this.im2_flag = false;	
	this.time_now = Date.now();	
											
	
	//dimensions of the image window:
	this.window_width_input = document.getElementById('window-width'); 
	this.window_height_input = document.getElementById('window-height');
	
	//menu to choose which images to display:
	this.image1_menu = document.getElementById('image1_menu');
	this.image2_menu = document.getElementById('image2_menu');


	// effect menu for selecting matching cost
	this.effect_menu = document.getElementById('effect_menu');
	this.effect_menu.value = 'e1';

	/*	references to text areas in the html where these 	*
	*	variables will be displayed 						*/
	this.dx_text = document.getElementById('dx_text');
    this.dy_text = document.getElementById('dy_text');
	this.speed_text = document.getElementById('speed_text');
    this.tex_inten_text = document.getElementById('tex_inten_text');
    this.center_text = document.getElementById('center_text');
    this.wdim_text = document.getElementById('wdim_text');
    this.xshear_text = document.getElementById('xshear_text');
    this.yshear_text = document.getElementById('yshear_text');


	// set the original window width and height to match input width and height
	this.window_width = 450;
	this.window_height = 375;
	this.window_width_input.value = this.window_width;
	this.window_height_input.value = this.window_height;
	this.canvas = document.getElementById('gl-canvas');	// grab a reference to the canvas
	this.pressedKeys = {};								// dictionary to hold key presses

	this.moveDist = 0.5; 		//distance image will move on a WASD key press, in pixels
    this.spd_diff = 0.01; 		//scales moveDist for use in controlling shearing speed (too fast w/o scale)
    this.s_val = 0.75; 			//s-value that determines what level of texture detail shows up
    this.zoom_scale = 1000.0;	//scales scroll force to a reasonable scale for controlling the zoom factor
    this.dx = 0.0;				//top image's current shift in x direction
    this.dy = 0.0;				//top image's current shift in y direction

    //variables to control affine transformations:
    this.var_a = 0;				
    this.var_b = 0;
    this.var_d = 0; 
    this.var_e = 1;

    //location of anchor point in canvas coordinates (0-1)			
	this.anchor_x = 0.5;
	this.anchor_y = 0.5;
	this.anchorVertices;
	this.anchorVertices = [ 0.5, 0.5, 1.0, 1.0, 0.0, 0.0];

	//used to compute the anchor point's shift from current location 
	//as top image is transformed
	this.anchor_dx = 0.0;
	this.anchor_dy = 0.0;
	this.image_anchor_x = 0.0;
	this.image_anchor_y = 0.0;

	//keeping track of current and previous mouse coordinates
	//used for zooming & shifting 
	this.browser_clicked_x = 0.0;
	this.browser_clicked_y = 0.0;
	this.browser_current_x = 0.0;
	this.browser_current_y = 0.0;
	this.canvas_zoomed_x = 0.0;
	this.canvas_zoomed_y = 0.0;
	this.texture_zoompoint_x = 0.0;
	this.texture_zoompoint_y = 0.0;

	this.zoom = 1.0; 				//total level of zoom
	this.zoominc = 1.0;				//amount to change zoom from last zoom

	this.zoomMat = mat3(         	
						1, 0, 0,
						0, 1, 0,
						0, 0, 1
					);				//cumulative zoom matrix to transform the images

	this.anchorZoomMat = mat3(		//cumulative zoom matrix to transform the anchors
						1, 0, 0,
						0, 1, 0,
						0, 0, 1
					);

	this.mode = 0;					//current mode
	this.modes = ["inten_diff", "gradient", "bleyer", "icpr", "ncc", "blink"];
	this.old_state = {};			//dictionary containing the previous mode
	this.old_state.mode = this.mode;//the "mode" part of the old state....
	this.images_loaded = false;		//flag for whether the images have successfully loaded
	this.mouse_down = false;		//flag for whether the mouse is currently down
	this.window_origin = [0.0, 0.0];

	//initializstion function calls:
	this.load_images();

}










/*==============================================================================*/
/*					        imdiff App Instance Methods							*/
/*==============================================================================*/

ImdiffApp.prototype = {
	constructor: ImdiffApp,
	init_gl: function(){
		// Use webgl-util.js to make sure we get a WebGL context
		this.gl = WebGLUtils.setupWebGL(this.canvas);
	    if (!this.gl) {
	        alert("Could not create WebGL context");
	        return;
	    }
	    this.gl.getExtension("OES_texture_float");
	    this.gl.getExtension("OES_texture_float_linear");
	    // set the viewport to be sized correctly
	    this.gl.viewport(0,0, this.canvas.width, this.canvas.height);
	    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

	    // create program with our shaders and store a reference to them 
	    // in the gl object
	    this.gl.transform_program = initShaders(this.gl, "transform-vertex-shader", "transform-fragment-shader");
	    this.gl.inten_diff_program = initShaders(this.gl, "inten-diff-vertex-shader", "inten-diff-fragment-shader");
	    this.gl.kernel_conv_program = initShaders(this.gl, "kernel-conv-vertex-shader", "kernel-conv-fragment-shader");
	    this.gl.black_white_program = initShaders(this.gl, "color-bw-vertex-shader", "color-bw-fragment-shader");
	    this.gl.display_program = initShaders(this.gl, "display-vertex-shader", "display-fragment-shader");
	    this.gl.magnitude_program = initShaders(this.gl, "magnitude-vertex-shader", "magnitude-fragment-shader");
	    this.gl.abs_diff_program = initShaders(this.gl, "abs-diff-vertex-shader", "abs-diff-fragment-shader");
	    this.gl.addweighted_program = initShaders(this.gl, "addweighted-vertex-shader", "addweighted-fragment-shader");
	    this.gl.multiply_program = initShaders(this.gl, "multiply-vertex-shader", "multiply-fragment-shader");
	    this.gl.pow_program = initShaders(this.gl, "pow-vertex-shader", "pow-fragment-shader");
	    this.gl.divide_program = initShaders(this.gl, "divide-vertex-shader", "divide-fragment-shader");
	    this.gl.add_program = initShaders(this.gl, "add-vertex-shader", "add-fragment-shader");
	    this.gl.sampler_program = initShaders(this.gl, "sampler-vertex-shader", "sampler-fragment-shader");
	    this.gl.zoom_program = initShaders(this.gl, "zoom-vertex-shader", "zoom-fragment-shader");
	    this.gl.anchor_program = initShaders(this.gl, "anchor-vertex-shader", "anchor-fragment-shader");

	    this.gl.positionBuffers = {};
	    this.gl.textures = {};

	    var image1_tex = create_texture(this.gl, this.image1, 0, this.image1.width, this.image1.height);
	    var image2_tex = create_texture(this.gl, this.image2, 1, this.image2.width, this.image2.height);

	    this.gl.textures["im1_2"] = create_texture(this.gl, null, 14, this.image1.width, this.image1.height);
	    this.gl.textures["im2_2"] = create_texture(this.gl, null, 15, this.image2.width, this.image2.height);

	    this.gl.textures["orig_image1"] = image1_tex;
	    this.gl.textures["orig_image2"] = image2_tex;

	    

	    this.gl.textures["im1_alter1"] = create_texture(this.gl, null, 3, this.window_width, this.window_height);
	    this.gl.textures["im1_alter2"] = create_texture(this.gl, null, 4, this.window_width, this.window_height);
	    this.gl.textures["im1_alter3"] = create_texture(this.gl, null, 5, this.window_width, this.window_height);

	    this.gl.textures["im2_alter1"] = create_texture(this.gl, null, 6, this.window_width, this.window_height);
	    this.gl.textures["im2_alter2"] = create_texture(this.gl, null, 7, this.window_width, this.window_height);
	    this.gl.textures["im2_alter3"] = create_texture(this.gl, null, 8, this.window_width, this.window_height);

	    this.gl.textures["scratch1"] = create_texture(this.gl, null, 9, this.window_width, this.window_height);
	    this.gl.textures["scratch2"] = create_texture(this.gl, null, 10, this.window_width, this.window_height);

	    this.gl.textures["crop1"] = create_texture(this.gl, null, 11, this.window_width, this.window_height);
	    this.gl.textures["crop2"] = create_texture(this.gl, null, 12, this.window_width, this.window_height);

	    this.gl.textures["out"] = create_texture(this.gl, null, 13, this.window_width, this.window_height);


	    //initialize the information for visualizing the anchor point
	    this.gl.anchorBuffer;
		
	    var flattenedAnchorArr = new Float32Array(this.anchorVertices);
	    var FSIZE = flattenedAnchorArr.BYTES_PER_ELEMENT;

	    this.gl.anchorBuffer = createBuffer(this.gl, this.gl.ARRAY_BUFFER, flatten(this.anchorVertices), "anchorBuffer", this.gl.STATIC_DRAW);
	    enableAttribute(this.gl, this.gl.anchor_program, this.gl.anchorBuffer, "a_Position", 3, 6*FSIZE, 0);
	    enableAttribute(this.gl, this.gl.anchor_program, this.gl.anchorBuffer, "a_Color", 3, 3*FSIZE, 3*FSIZE);
	},

	init_anchors: function(){

	},

	load_images: function(){
		// trying to load images, so set loaded flags to false
		this.images_loaded = false;

		// load the first image asynchronously using a promise
    	// the image loaded from this is stored with image id 0
   		// on success this will try to load image 2
    	Promise.all(
    		[ 	this.read_image(1, this.image1_menu.value, this.images), 
    			this.read_image(2, this.image2_menu.value, this.images)])
    	.then(function () {
    		
    		this.image1 = this.images["image1"]; 
    		this.image2 = this.images["image2"];
    		this.init_onimage_load();

    		//needs to be last line, must execute on completion of this function
    		this.images_loaded = true; 
    	}.bind(this))
    	.catch(function (error) {alert('Failed to load texture '+  error.message);});

    	/*
    	// try to load image 2, if successful both image 1 and image 2 will be loaded
    	// and their respective loaded flags will be set to true
    	Promise.all([ this.read_image(1, this.image2_menu.value, this.image2)])
    	.then(function () {this.image2_loaded = true;}.bind(this))
    	.catch(function (error) {alert('Failed to load texture '+  error.message);});
    	*/

	},

	read_image: function(image_id, filename, images){
		return new Promise(function(resolve, reject){
	        var image = new Image();
	        image.onload = function(){
	            images["image"+image_id] = image; 
	            console.log("loaded");           
	            resolve();
	        }
	        image.onerror = function(error){
	            reject(Error(filename));
	        }
	        image.src = filename; 
	    });
	},

	init_onimage_load: function(){
		this.init_gl();				//initialize the gl object
		this.resize_canvas();		//syncs window input szie with canvas size 
		
		// center the image in the window
		this.window_origin = [	-(((this.window_width-this.image1.width)/2.0)/this.image1.width),
								-(((this.window_height-this.image1.height)/2.0)/this.image1.height)];
		//this.window_origin = [0.0, 0.0];
		this.init_listeners();		//initialize the event listeners

		//image to be displayed in the app (calculated 
		//difference between the two images)
		//this.image_out = new WebglImage(this.gl, this.window_width, this.window_height, "linear"); 
	},

	resize_canvas: function(){
		this.canvas.width = this.window_width;
		this.canvas.height = this.window_height;
		this.window_origin = [	-(((this.window_width-this.image1.width)/2.0)/this.image1.width),
								-(((this.window_height-this.image1.height)/2.0)/this.image1.height)];
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	},

	init_listeners: function(){
		this.canvas.addEventListener("mousedown", this.mouse_down_handler.bind(this));
		document.addEventListener("mouseup", this.mouse_up_handler.bind(this));
		document.addEventListener("mousemove", this.mouse_move_handler.bind(this));
		this.canvas.addEventListener("wheel", this.wheel_handler.bind(this));
		this.window_width_input.addEventListener("change", this.window_width_change.bind(this));
		this.window_height_input.addEventListener("change", this.window_height_change.bind(this));
		this.image1_menu.addEventListener("change", this.image1_menu_change.bind(this));
		this.image2_menu.addEventListener("change", this.image2_menu_change.bind(this));
		//this.im1_box.addEventListener("change", this.im1_box_change);
		//this.im2_box.addEventListener("change", this.im2_box_change);
		this.effect_menu.addEventListener("change", this.effect_menu_change.bind(this));
		document.addEventListener("keydown", this.key_down_handler.bind(this));
		document.addEventListener("keyup", this.key_up_handler.bind(this));
	},

	mouse_down_handler: function(event){
		this.mouse_down = true;
		this.browser_clicked_x = event.clientX;    	// get the mouse x and y
        this.browser_clicked_y = event.clientY;		// for clicked point

        //if the user is doing an option-click, 
        //set the anchor point to be the point under the mouse:
        if (this.pressedKeys[18]) {
        	var canvas_clicked_xy = browser_to_canvas(	this.window_width, this.window_height, 
        												this.browser_clicked_x, this.browser_clicked_y,
        												event.target.getBoundingClientRect());

            this.anchor_x = (this.texture_zoompoint_x + 
            				(canvas_clicked_xy[0] - this.canvas_zoomed_x) * this.zoom) + 
            				(-this.dx / this.window_width);

            this.anchor_y = (this.texture_zoompoint_y + 
            				(canvas_clicked_xy[1] - this.canvas_zoomed_y) * this.zoom) + 
							(this.dy / this.window_height);

			var scale_x = this.window_width / this.image1.width;
			var scale_y = this.window_height / this.image1.height;
			this.image_anchor_x = (this.anchor_x * scale_x) + this.window_origin[0];
			this.image_anchor_y = (this.anchor_y * scale_y) + this.window_origin[1];

			
            this.anchorVertices = [this.anchor_x, this.anchor_y, 1.0, 1.0, 0.0, 0.0];
        }

	},

	mouse_up_handler: function(event){
		this.mouse_down = false;

	},

	mouse_move_handler: function(event){
		// update current mouse 
        this.browser_current_x = event.clientX;
        this.browser_current_y = event.clientY;

		if (!this.mouse_down) {	// if the mouse is not down exit function
            return;
        }

        this.mode = this.old_state.mode;
      

        //compute shift of anchor point, uses gl coordinates:
        var rect = event.target.getBoundingClientRect();

        var gl_old = browser_to_gl(	this.window_width, this.window_height, 
        							this.browser_clicked_x, this.browser_clicked_y, rect);

        var gl_new = browser_to_gl(	this.window_width, this.window_height, 
        							this.browser_current_x, this.browser_current_y, rect);

        this.anchor_dx += gl_new[0] - gl_old[0];
        


        // calculate the difference between the last mouse position
        // and the new and use it as the amount to rotate the mesh
        // the rotation is broken down into its x and y components
        // for simplicity
        this.dx += this.browser_current_x - this.browser_clicked_x;

        //shift button to lock all motion to horizontal:
        if (!this.pressedKeys[16]) { //if shift button is not being pressed, change in y direction
            this.dy += this.browser_current_y - this.browser_clicked_y;
            this.anchor_dy += gl_new[1] - gl_old[1];
        } 

        // update the old mouse position
        this.browser_clicked_x = this.browser_current_x;
        this.browser_clicked_y = this.browser_current_y;
	},

	wheel_handler: function(event){
		event.preventDefault();

		var bound_rect = event.target.getBoundingClientRect();

		var canvas_current_xy = browser_to_canvas(	this.window_width, this.window_height, 
        											this.browser_current_x, this.browser_current_y,
        											bound_rect);

        this.texture_zoompoint_x = (	this.texture_zoompoint_x + 
        								(canvas_current_xy[0] - this.canvas_zoomed_x) * this.zoom);
        
        this.texture_zoompoint_y = (	this.texture_zoompoint_y + 
        								(canvas_current_xy[1] - this.canvas_zoomed_y) * this.zoom);


        this.canvas_zoomed_x = canvas_current_xy[0];
        this.canvas_zoomed_y = canvas_current_xy[1];

        gl_mouse_coords = browser_to_gl(this.window_width, this.window_height, 
        								this.browser_current_x, this.browser_current_y, 
        									bound_rect);

        if(event.deltaY/this.zoom_scale < 0){
            this.zoominc = 1.0 - Math.abs(event.deltaY/this.zoom_scale);
        }else{
            this.zoominc = event.deltaY/this.zoom_scale + 1.0; 
        }

        if (this.zoom * this.zoominc > 0.0001) {
        //set zoom to match the current zoom level by multiplying the previous zoom level
        //by 'zoominc'
      		this.zoom *= this.zoominc;

	       //compute new matrices to shift the zoomcenter to the origin,
	       //zoom in on the origin, then shift back with point at previous location
	        var unshift = mat3(
	        1, 0, this.texture_zoompoint_x,
	        0, 1, this.texture_zoompoint_y,
	        0, 0, 1
	        );

	        var zoomStep = mat3(
	        this.zoominc, 0.0, 0.0,
	        0.0, this.zoominc, 0.0,
	        0.0, 0.0, 1.0
	        );

	        var shift = mat3(
	        1, 0, -this.texture_zoompoint_x,
	        0, 1, -this.texture_zoompoint_y,
	        0, 0, 1
	        );

	        //shift matrices to shift the zoomcenter in gl coordinates to the 
	        //center, for correctly positioning the anchor display point
	        var anchUnshift = mat3(
	        1, 0, gl_mouse_coords[0],
	        0, 1, gl_mouse_coords[1],
	        0, 0, 1
	        );

	        var anchZoomStep = mat3(
	        1.0/this.zoominc, 0.0, 0.0,
	        0.0, 1.0/this.zoominc, 0.0,
	        0.0, 0.0, 1.0
	        );

	        var anchShift = mat3(
	        1, 0, -gl_mouse_coords[0],
	        0, 1, -gl_mouse_coords[1],
	        0, 0, 1
	        );

	        //add these three matrices to the cumulative shift matrix
	        this.zoomMat = mult(unshift, mult(zoomStep, mult(shift, this.zoomMat))); 
	        this.anchorZoomMat =  mult(anchUnshift, mult(anchZoomStep, mult(anchShift, this.anchorZoomMat)));
    	}
	},

	window_width_change: function(){
		this.window_width = this.window_width_input.value;
		this.resize_canvas();
		this.init_gl();	
	},
	window_height_change: function(){
		this.window_height = this.window_height_input.value;
		this.resize_canvas();
		this.init_gl();
	},
	image1_menu_change: function(){
		this.init_gl();
		this.load_images();
	},
	image2_menu_change: function(){
		this.init_gl();
		this.load_images();
	},
	effect_menu_change: function(){
		switch(this.effect_menu.value){
			case 'e1':
				this.mode = this.modes.indexOf("inten_diff");
				break;
			case 'e2':
				this.mode = this.modes.indexOf("gradient");
				break;
			case 'e3':
				this.mode = this.modes.indexOf("bleyer");
				break;
			case 'e4':
				this.mode = this.modes.indexOf("icpr");
				break;
			case 'e5':
				this.mode = this.modes.indexOf("ncc");
				break;
		}
		this.old_state.mode = this.mode;
	},

	key_down_handler: function(event){
		switch(event.keyCode){
            case 37: case 38: case 39: case 40: event.preventDefault(); break; // IJKL
            default: break; // do not block other keys
        }
        
        this.pressedKeys[event.keyCode] = true;
	},

	key_up_handler: function(event){
		this.pressedKeys[event.keyCode] = false;
	},

	handle_keys: function(){
		//change motion speed:
        if (this.pressedKeys[69] && this.moveDist <= 3) { //speed up motion if q key pressed
            this.moveDist = this.moveDist+.01;
        } 

        if (this.pressedKeys[81] && this.moveDist > 0.05) { //slow down motion if e key pressed
            this.moveDist = this.moveDist-0.01;
        } 

        if(this.pressedKeys[65] || this.pressedKeys[68] || this.pressedKeys[87] || this.pressedKeys[83] ||
           this.pressedKeys[37] || this.pressedKeys[38] || this.pressedKeys[39] || this.pressedKeys[40] ||
           this.pressedKeys[71] || this.pressedKeys[72] || this.pressedKeys[77] || this.pressedKeys[78] ){
            this.mode = this.old_state.mode;
            this.im1flag = this.old_state.im1flag;
            this.im2flag = this.old_state.im2flag;
        }
        //horizontal motion key control:
        if (this.pressedKeys[65] || this.pressedKeys[37]) { //if A key or left arrow is pressed, shift in neg x direction
            this.dx -= this.moveDist;
            this.anchor_dx -= 2.0 * (this.moveDist/this.window_width);
        } else if (this.pressedKeys[68] || this.pressedKeys[39]) { //if D key or right arrow is pressed, shift in pos x direction
            this.dx += this.moveDist;
            this.anchor_dx += 2.0 * (this.moveDist/this.window_height);
        } 
    
        //vertical motion key control
        if (!this.pressedKeys[16]) { //only move vertically if shift key is not pressed
            if (this.pressedKeys[87] || this.pressedKeys[38]) { //if W key or up arrow is pressed, shift in pos y direction
                this.dy -= this.moveDist;
                this.anchor_dy += 2.0 * (this.moveDist/this.window_width);
            } else if (this.pressedKeys[83] || this.pressedKeys[40]) { //if S key or down arrow is pressed, shift in neg y direction
                this.dy += this.moveDist;
                this.anchor_dy -= 2.0 * (this.moveDist/this.window_height);
            } 
        }

        //change s_val for textures to show up more or less boldly
        if (this.pressedKeys[90] && this.s_val >= 0.5) { //if Z key is pressed, decrease s_val
            this.s_val -= 0.1;
        } 
        else if (this.pressedKeys[88] && this.s_val <= 4) { //if X key is pressed, increase s_val
            this.s_val += 0.1;
        } 

         //*******controls for image shearing***********
        //x direction shearing:
        if(this.pressedKeys[71]){ // G
            this.var_a += (this.moveDist*this.spd_diff);
        }
        if(this.pressedKeys[72]){// H
            this.var_a -= (this.moveDist*this.spd_diff);
        }

        //y direction shearing:
        if(this.pressedKeys[78]){ // N
            this.var_b += (this.moveDist*this.spd_diff);
        }
        if(this.pressedKeys[77]){// M
            this.var_b -= (this.moveDist*this.spd_diff);
        }

        //***** Image navigation controls
        var nav_speed = 0.003;

        if(this.pressedKeys[73]){ // i
            this.window_origin = [this.window_origin[0], this.window_origin[1] + nav_speed];
            this.anchorVertices[1] -= (nav_speed*(this.image2.height / this.window_height));

            /*this.anchor_y -= nav_speed;
            this.anchorVertices = [this.anchor_x, this.anchor_y, 1.0, 1.0, 0.0, 0.0];*/
        }
        if(this.pressedKeys[74]){ // j
            this.window_origin = [this.window_origin[0] - nav_speed, this.window_origin[1]];
            this.anchorVertices[0] += (nav_speed*(this.image2.width / this.window_width));

            /*
            this.anchor_x += nav_speed;
            this.anchorVertices = [this.anchor_x, this.anchor_y, 1.0, 1.0, 0.0, 0.0];*/
        }
        if(this.pressedKeys[75]){ // k
            this.window_origin = [this.window_origin[0], this.window_origin[1] - nav_speed];
            this.anchorVertices[1] += (nav_speed*(this.image2.height / this.window_height));

            /*
            this.anchor_y += nav_speed;
            this.anchorVertices = [this.anchor_x, this.anchor_y, 1.0, 1.0, 0.0, 0.0];*/
        }
        if(this.pressedKeys[76]){ // l
            this.window_origin = [this.window_origin[0] + nav_speed, this.window_origin[1]];
            this.anchorVertices[0] -= (nav_speed*(this.image2.width / this.window_width));

            /*
            this.anchor_x -= nav_speed;
            this.anchorVertices = [this.anchor_x, this.anchor_y, 1.0, 1.0, 0.0, 0.0];*/
        }


        //************************reset buttons****************************
        //*****************************************************************

        //reset image position
        if (this.pressedKeys[82]) { //if R is pressed, reset position of top image
            this.dx = 0;
            this.dy = 0;
            this.anchor_dx = 0.0;
            this.anchor_dy = 0.0;
        } 
        
        //reset dy:
        if (this.pressedKeys[89] && this.pressedKeys[16]){ //shift-y
            this.dy = 0;
        }

        //reset var_a:
        if (this.pressedKeys[71] && this.pressedKeys[16]){ //shift-g
            this.var_a = 0.0;
        }

        //reset var_b
        if (this.pressedKeys[78] && this.pressedKeys[16]){ //shift-n
            this.var_b = 0.0;
        }

        //reset zoom
        if (this.pressedKeys[80] && this.pressedKeys[16]){ //shift-=
            this.zoomMat = mat3();
            this.zoom = 1.0;
            this.zoominc = 1.0;
            this.texture_zoompoint_x = 0.0;
            this.texture_zoompoint_y = 0.0;
            this.canvas_zoomed_x = 0.0;
            this.canvas_zoomed_y = 0.0;
        }

        //******reset all controls********
        //shift-r
        if (this.pressedKeys[82] && this.pressedKeys[16]){
            this.moveDist = 1;
            this.s_val = 0.75;
            this.var_a = 0;
            this.var_b = 0;
            this.var_d = 0; 
            this.var_e = 1;
            this.zoomMat = mat3();
            this.anchorZoomMat = mat3();
            this.zoom = 1.0;
            this.zoominc = 1.0;
            this.texture_zoompoint_x = 0.0;
            this.texture_zoompoint_y = 0.0;
            this.canvas_zoomed_x = 0.0;
            this.canvas_zoomed_y = 0.0;
            this.anchor_x = 0.5;
            this.anchor_y = 0.5;
            this.anchorVertices = [this.anchor_x, this.anchor_y, 1.0, 0.0, 0.0, 0.0];
        }

        //set to blink mode and displays image 2
        if (this.pressedKeys[66]){
            if (this.mode !== this.modes.indexOf("blink")){
                this.old_state.mode = this.mode;
                this.mode = this.modes.indexOf("blink");
            }
            this.im1flag = 1;
            this.im2flag = 0;
        }else{
            if(this.mode == this.modes.indexOf("blink")){
                this.im1flag = 0;
                this.im2flag = 1;
            }
        }
	},

	update: function(){
		this.handle_keys();
		this.update_view();

		var scale_dx = this.dx / this.image1.width;
        var scale_dy = -(this.dy / this.image2.height);

        var zoomCenter = mat3();
        

        //create the transformation matrix by multiplying the affine trans. and translation matrices:
        //for translating the image
        var translationMat = mat3(
        1, 0, -scale_dx,
        0, 1, -scale_dy,
        0, 0, 1
        );

        


        var anchorTranslationMat = mat3(
        1, 0, this.anchor_dx,
        0, 1, this.anchor_dy,
        0, 0, 1
        );

        //for affine transformations
        var affineMat = mat3(
        (1+this.var_a), this.var_b, 0,
        this.var_d, this.var_e, 0,
        0, 0, 1
        );

        //for shifting the image so desired point is center of shear
        var shiftMat = mat3(
        1, 0, -this.image_anchor_x,
        0, 1, -this.image_anchor_y,
        0, 0, 1
        );

        //for shifting the image back to its original location
        var revMat = mat3(
        1, 0, this.image_anchor_x,
        0, 1, this.image_anchor_y,
        0, 0, 1
        );

        var transMat = [
            zoomCenter,
            translationMat,
            revMat,
            affineMat,
            shiftMat,
            anchorTranslationMat
        ];

        // convert the boolean to an int to send to the shader
        this.im1flag = (this.im1flag) ? 1 : 0;
        // convert the boolean to an int to send to the shader
        this.im2flag = (this.im2flag) ? 1 : 0;

        
        switch(this.mode){
            case 0:
                this.inten_diff(transMat);
                break;
            case 1:
                this.gradient(transMat);
                break;
            case 2:
                this.bleyer(transMat);
                break;
            case 3:
                this.icpr(transMat);
                break;
            case 4:
                this.ncc(transMat);
                break;
            case 5:
                this.myblink(transMat);
                break;
        } 


        this.display(transMat);		
	},

	display: function(transMat){
		switch_shader(	this.gl, this.gl.display_program, 
						this.window_width, this.window_height, 
						this.window_width, this.window_height);
	    var u_Image1 = this.gl.getUniformLocation(this.gl.display_program, 'u_Image1');
	    this.gl.uniform1i(u_Image1, this.gl.textures["out"].textureid);
	    render_image(this.gl);

	    render_anchors(this.gl, transMat, this.anchorZoomMat, this.anchorVertices);
	},

	update_view: function(){
		this.dx_text.innerHTML = this.dx;
    	this.dy_text.innerHTML = -this.dy;
    	this.speed_text.innerHTML = this.moveDist;
        this.dx_text.innerHTML = this.dx.toFixed(4);
        this.dy_text.innerHTML = (-this.dy).toFixed(4);
        this.speed_text.innerHTML = this.moveDist.toFixed(4);
        this.tex_inten_text.innerHTML = this.s_val.toFixed(4);
        this.xshear_text.innerHTML = this.var_a.toFixed(4);
        this.yshear_text.innerHTML = this.var_b.toFixed(4);
        this.center_text.innerHTML = 	String(		(((this.texture_zoompoint_x + (0.5 - this.canvas_zoomed_x) * this.zoom) + 
        											(this.window_origin[0] + 
        											(((this.window_width-this.image1.width)/2.0)/this.image1.width))) * 
        											this.image1.width).toFixed(2)) +
        								", " +
        								String(		(((this.texture_zoompoint_y + (0.5 - this.canvas_zoomed_y) * this.zoom) + 
        											(this.window_origin[1] + 
        											(((this.window_height-this.image1.height)/2.0)/this.image1.height))) * 
        											this.image1.height).toFixed(2));
	},


			/*================================================*/
			/*===   Matching Costs Computation Functions  ====*/
			/*================================================*/


	inten_diff: function(transMat){
	    this.gl.textures["im2_2"] = transform(this.gl, transMat, this.gl.textures["orig_image2"], this.gl.textures["im2_2"]);

	    this.gl.textures["crop2"] = sample(this.gl, this.window_origin, [this.window_width, this.window_height], this.gl.textures["im2_2"], this.gl.textures["crop2"], this.zoomMat);
	    this.gl.textures["crop1"] = sample(this.gl, this.window_origin, [this.window_width, this.window_height], this.gl.textures["orig_image1"], this.gl.textures["crop1"], this.zoomMat);

	    //this.gl.textures["scratch2"] = zoomim(this.gl, this.gl.textures["crop2"], this.gl.textures["scratch2"], this.zoomMat);
	    //this.gl.textures["scratch1"] = zoomim(this.gl, this.gl.textures["crop1"], this.gl.textures["scratch1"], this.zoomMat);


	    diff(this.gl, this.gl.textures["crop1"], this.gl.textures["crop2"], this.gl.textures["out"], this.im1flag, this.im2flag, this.s_val, 0.5);  
	},

	myblink: function(transMat){
	    if(this.im1flag){
	        sample(this.gl, this.window_origin, [this.window_width, this.window_height], this.gl.textures["orig_image1"], this.gl.textures["out"], this.zoomMat);
	    }else{
	    
	        this.gl.textures["im2_2"] = transform(this.gl, transMat, this.gl.textures["orig_image2"], this.gl.textures["im2_2"]);
	        sample(this.gl, this.window_origin, [this.window_width, this.window_height], this.gl.textures["im2_2"], this.gl.textures["out"], this.zoomMat);
	    }

	},

	bleyer: function(transMat){

	    this.gl.textures["im2_2"] = transform(this.gl, transMat, this.gl.textures["orig_image2"], this.gl.textures["im2_2"]);
	    this.gl.textures["crop2"] = sample(this.gl, this.window_origin, [this.window_width, this.window_height], this.gl.textures["im2_2"], this.gl.textures["crop2"], this.zoomMat);
	    this.gl.textures["crop1"] = sample(this.gl, this.window_origin, [this.window_width, this.window_height], this.gl.textures["orig_image1"], this.gl.textures["crop1"], this.zoomMat);

	    //this.gl.textures["scratch2"] = zoomim(this.gl, this.gl.textures["crop2"], this.gl.textures["scratch2"], this.zoomMat);
	    //this.gl.textures["scratch1"] = zoomim(this.gl, this.gl.textures["crop1"], this.gl.textures["scratch1"], this.zoomMat);

	    this.gl.textures["im1_alter2"] = abs_diff(this.gl, this.gl.textures["crop1"], this.gl.textures["crop2"], this.gl.textures["im1_alter2"]); //****

	    this.gl.textures["im2_alter1"] = black_white(this.gl, this.gl.textures["crop2"], this.gl.textures["im2_alter1"]);
	    this.gl.textures["im2_alter2"] = sobel(this.gl, 1, 0, 3, 1, this.gl.textures["im2_alter1"], this.gl.textures["im2_alter2"]);
	    this.gl.textures["im2_alter3"] = sobel(this.gl, 0, 1, 3, 1, this.gl.textures["im2_alter1"], this.gl.textures["im2_alter3"]);
	    this.gl.textures["im2_alter1"] = magnitude(this.gl, this.gl.textures["im2_alter2"], this.gl.textures["im2_alter3"], this.gl.textures["im2_alter1"]); 


	    this.gl.textures["im2_alter2"] = black_white(this.gl, this.gl.textures["crop1"], this.gl.textures["im2_alter2"]);
	    this.gl.textures["im2_alter3"] = sobel(this.gl, 1, 0, 3, 1, this.gl.textures["im2_alter2"], this.gl.textures["im2_alter3"]); 
	    this.gl.textures["im1_alter3"] = sobel(this.gl, 0, 1, 3, 1, this.gl.textures["im2_alter2"], this.gl.textures["im1_alter3"]); 
	    this.gl.textures["im2_alter2"] = magnitude(this.gl, this.gl.textures["im2_alter3"], this.gl.textures["im1_alter3"], this.gl.textures["im2_alter2"]); 

	    this.gl.textures["scratch1"] = abs_diff(this.gl, this.gl.textures["im2_alter1"], this.gl.textures["im2_alter2"], this.gl.textures["scratch1"]); 

	    add_weighted(this.gl, 0.1, 0.9, 0.0, this.gl.textures["im1_alter2"], this.gl.textures["scratch1"], this.gl.textures["out"]); 
	},


	gradient: function(transMat){

	    this.gl.textures["im2_2"] = transform(this.gl, transMat, this.gl.textures["orig_image2"], this.gl.textures["im2_2"]);
	    this.gl.textures["crop2"] = sample(this.gl, this.window_origin, [this.window_width, this.window_height], this.gl.textures["im2_2"], this.gl.textures["crop2"], this.zoomMat);
	    //this.gl.textures["scratch2"] = zoomim(this.gl, this.gl.textures["crop2"], this.gl.textures["scratch2"], this.zoomMat);

	    this.gl.textures["im2_alter1"] = black_white(this.gl, this.gl.textures["crop2"], this.gl.textures["im2_alter1"]);
	    this.gl.textures["im2_alter2"] = sobel(this.gl, 1, 0, 3, 1, this.gl.textures["im2_alter1"], this.gl.textures["im2_alter2"]);
	    this.gl.textures["im2_alter3"] = sobel(this.gl, 0, 1, 3, 1, this.gl.textures["im2_alter1"], this.gl.textures["im2_alter3"]);
	    

	    this.gl.textures["crop1"] = sample(this.gl, this.window_origin, [this.window_width, this.window_height], this.gl.textures["orig_image1"], this.gl.textures["crop1"], this.zoomMat);
	    //this.gl.textures["scratch1"] = zoomim(this.gl, this.gl.textures["crop1"], this.gl.textures["scratch1"], this.zoomMat);
	    this.gl.textures["im1_alter1"] = black_white(this.gl, this.gl.textures["crop1"], this.gl.textures["im1_alter1"]);
	    this.gl.textures["im1_alter2"] = sobel(this.gl, 1, 0, 3, 1, this.gl.textures["im1_alter1"], this.gl.textures["im1_alter2"]);
	    this.gl.textures["im1_alter3"] = sobel(this.gl, 0, 1, 3, 1, this.gl.textures["im1_alter1"], this.gl.textures["im1_alter3"]);
	    this.gl.textures["im1_alter1"] = diff(this.gl, this.gl.textures["im1_alter2"], this.gl.textures["im2_alter2"], this.gl.textures["im1_alter1"],this.im1flag, this.im2flag, this.s_val, 0.0);
	    this.gl.textures["im2_alter1"] = diff(this.gl, this.gl.textures["im1_alter3"], this.gl.textures["im2_alter3"], this.gl.textures["im2_alter1"], this.im1flag, this.im2flag, this.s_val, 0.0);


	    magnitude(this.gl, this.gl.textures["im1_alter1"], this.gl.textures["im2_alter1"], this.gl.textures["out"]);
	},


	icpr: function(transMat){

	    this.gl.textures["im2_2"] = transform(this.gl, transMat, this.gl.textures["orig_image2"], this.gl.textures["im2_2"]); 
	    this.gl.textures["crop2"] = sample(this.gl, this.window_origin, [this.window_width, this.window_height], this.gl.textures["im2_2"], this.gl.textures["crop2"], this.zoomMat);
	    //this.gl.textures["scratch2"] = zoomim(this.gl, this.gl.textures["crop2"], this.gl.textures["scratch2"], this.zoomMat);

	    this.gl.textures["im2_alter1"] = black_white(this.gl, this.gl.textures["crop2"], this.gl.textures["im2_alter1"]);
	    this.gl.textures["im2_alter2"] = sobel(this.gl, 1, 0, 3, 1, this.gl.textures["im2_alter1"], this.gl.textures["im2_alter2"]); 
	    this.gl.textures["im2_alter3"] = sobel(this.gl, 0, 1, 3, 1, this.gl.textures["im2_alter1"], this.gl.textures["im2_alter3"]); 

	    this.gl.textures["crop1"] = sample(this.gl, this.window_origin, [this.window_width, this.window_height], this.gl.textures["orig_image1"], this.gl.textures["crop1"], this.zoomMat);
	    //this.gl.textures["scratch1"] = zoomim(this.gl, this.gl.textures["crop1"], this.gl.textures["scratch1"], this.zoomMat);
	    this.gl.textures["im1_alter1"] = black_white(this.gl, this.gl.textures["crop1"], this.gl.textures["im1_alter1"]);
	    this.gl.textures["im1_alter2"] = sobel(this.gl, 1, 0, 3, 1, this.gl.textures["im1_alter1"], this.gl.textures["im1_alter2"]); 
	    this.gl.textures["im1_alter3"] = sobel(this.gl, 0, 1, 3, 1, this.gl.textures["im1_alter1"], this.gl.textures["im1_alter3"]); 

	    this.gl.textures["scratch1"] = add_weighted(this.gl, -1.0, 1.0, 0.0, this.gl.textures["im2_alter2"], this.gl.textures["im1_alter2"], this.gl.textures["scratch1"]); //xmag diff
	    this.gl.textures["scratch2"] = add_weighted(this.gl, -1.0, 1.0, 0.0, this.gl.textures["im2_alter3"], this.gl.textures["im1_alter3"], this.gl.textures["scratch2"]); //ymag diff

	    this.gl.textures["im2_alter1"] = magnitude(this.gl, this.gl.textures["im2_alter2"], this.gl.textures["im2_alter3"], this.gl.textures["im2_alter1"]); //overall mag 1 //***
	    this.gl.textures["im1_alter1"] = magnitude(this.gl, this.gl.textures["im1_alter2"], this.gl.textures["im1_alter3"], this.gl.textures["im1_alter1"]); //overall mag 2 //***

	    this.gl.textures["im1_alter2"] = add_weighted(this.gl, 1.0, 1.0, 0.0, this.gl.textures["im1_alter1"], this.gl.textures["im2_alter1"], this.gl.textures["im1_alter2"]); //mag sumsv
	    this.gl.textures["im1_alter3"] = magnitude(this.gl, this.gl.textures["scratch1"], this.gl.textures["scratch2"], this.gl.textures["im1_alter3"]);

	    add_weighted(this.gl, 0.5, -1.0, 0.5, this.gl.textures["im1_alter2"], this.gl.textures["im1_alter3"], this.gl.textures["out"]);
	},


	ncc: function(transMat){

	    var nccsize = 3;

	    this.gl.textures["im2_2"] = transform(this.gl, transMat, this.gl.textures["orig_image2"], this.gl.textures["im2_2"]);
	    this.gl.textures["crop2"] = sample(this.gl, this.window_origin, [this.window_width, this.window_height], this.gl.textures["im2_2"], this.gl.textures["crop2"], this.zoomMat);
	    this.gl.textures["scratch2"] = black_white(this.gl, this.gl.textures["crop2"], this.gl.textures["scratch2"]); 
	    //this.gl.textures["scratch1"] = zoomim(this.gl, this.gl.textures["scratch2"], this.gl.textures["scratch1"], this.zoomMat); //R


	    this.gl.textures["crop1"] = sample(this.gl, this.window_origin, [this.window_width, this.window_height], this.gl.textures["orig_image1"], this.gl.textures["crop1"], this.zoomMat);
	    this.gl.textures["im1_alter3"] = black_white(this.gl, this.gl.textures["crop1"], this.gl.textures["im1_alter3"]); 
	    //this.gl.textures["scratch2"] = zoomim(this.gl, this.gl.textures["im1_alter3"], this.gl.textures["scratch2"], this.zoomMat); //L

	    this.gl.textures["im1_alter1"] = boxfilter(this.gl, this.gl.textures["im1_alter3"], this.gl.textures["im1_alter1"], nccsize); //Lb
	    this.gl.textures["im2_alter1"] = boxfilter(this.gl, this.gl.textures["scratch2"], this.gl.textures["im2_alter1"], nccsize); //Rb

	    this.gl.textures["im1_alter2"] = multiply(this.gl, this.gl.textures["im1_alter3"], this.gl.textures["im1_alter3"], this.gl.textures["im1_alter2"]); //LL
	    this.gl.textures["im2_alter2"] = multiply(this.gl, this.gl.textures["scratch2"], this.gl.textures["scratch2"], this.gl.textures["im2_alter2"]); //RR
	    this.gl.textures["crop2"] = multiply(this.gl, this.gl.textures["im1_alter3"], this.gl.textures["scratch2"], this.gl.textures["crop2"]); //RB

	    this.gl.textures["im1_alter3"] = boxfilter(this.gl, this.gl.textures["im1_alter2"], this.gl.textures["im1_alter3"], nccsize); //LLb
	    this.gl.textures["im2_alter3"] = boxfilter(this.gl, this.gl.textures["im2_alter2"], this.gl.textures["im2_alter3"], nccsize); //RRb
	    this.gl.textures["scratch1"] = boxfilter(this.gl, this.gl.textures["crop2"], this.gl.textures["scratch1"], nccsize); //LRb

	    this.gl.textures["im1_alter2"] = multiply(this.gl, this.gl.textures["im1_alter1"], this.gl.textures["im1_alter1"], this.gl.textures["im1_alter2"]); //Lb2
	    this.gl.textures["im2_alter2"] = multiply(this.gl, this.gl.textures["im2_alter1"], this.gl.textures["im2_alter1"], this.gl.textures["im2_alter2"]); //Rb2
	    this.gl.textures["scratch2"] = multiply(this.gl, this.gl.textures["im1_alter1"], this.gl.textures["im2_alter1"], this.gl.textures["scratch2"]); //LbRb2

	    this.gl.textures["im1_alter1"] = add_weighted(this.gl, 1.0, -1.0, 0.0, this.gl.textures["im1_alter3"], this.gl.textures["im1_alter2"], this.gl.textures["im1_alter1"]);//LLb - Lb2 = LL2
	    this.gl.textures["im2_alter1"] = add_weighted(this.gl, 1.0, -1.0, 0.0, this.gl.textures["im2_alter3"], this.gl.textures["im2_alter2"], this.gl.textures["im2_alter1"]);//RRb - Rb2 = RR2
	    this.gl.textures["im1_alter2"] = add_weighted(this.gl, 1.0, -1.0, 0.0, this.gl.textures["scratch1"], this.gl.textures["scratch2"], this.gl.textures["im1_alter2"]);//LRb -LbRb2 = LR2

	    this.gl.textures["scratch2"] = multiply(this.gl, this.gl.textures["im1_alter1"], this.gl.textures["im2_alter1"], this.gl.textures["scratch2"]); //den
	    this.gl.textures["scratch1"] = addscalar(this.gl, 0.01, this.gl.textures["scratch2"], this.gl.textures["scratch1"]);
	    this.gl.textures["scratch2"] = power(this.gl, vec3(0.5, 0.5, 0.5), this.gl.textures["scratch1"], this.gl.textures["scratch2"]); //new den
	    divide(this.gl, this.gl.textures["im1_alter2"], this.gl.textures["scratch1"], this.gl.textures["out"]); 
	}


}















/*==============================================================================*/
/*						      Misc Helper Functions								*/
/*==============================================================================*/

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

function create_texture_coords(a_TexCoord, gl, program){
    var texCoords = new Float32Array([
        0.0,  0.0,
        1.0,  0.0,
        0.0,  1.0,
        0.0,  1.0,
        1.0,  0.0,
        1.0,  1.0]);
    gl.texCoordBuffer = createBuffer(gl, gl.ARRAY_BUFFER, texCoords, "textureCoordBuffer", gl.STATIC_DRAW);
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
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.FLOAT, image);
        texture.width = image.width;
        texture.height = image.height;
    }else{
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
        texture.width = width;
        texture.height = height;
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    texture.textureid = textureid;

    return texture;
}

function create_texture_from_array (gl, data, type, format, width, height, textureid){



    var dataTexture = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.activeTexture(gl.TEXTURE0 + textureid);
    gl.bindTexture(gl.TEXTURE_2D, dataTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height,0, format, type, new Float32Array(data));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    dataTexture.width = width;
    dataTexture.height = height;

    return dataTexture;
    
}


//convert (x,y) pair from browser coordinates to gl coordinates
function browser_to_gl(width, height, x, y, bound_rect){
    var gl_x = (((x - bound_rect.left) - width/2.0) / (width/2.0));
    var gl_y = ((height/2.0 - (y - bound_rect.top)) / (height/2.0));
    return [gl_x, gl_y];
}

function browser_to_canvas(width, height, x, y, bound_rect){
    var canvas_x = (x - bound_rect.left) / width
    var canvas_y = 1-((y - bound_rect.top) / height);
    return [canvas_x, canvas_y];
}

/*
 * creates the quad that will display the images
 * the position data of the vertices of the quad
 * are buffered into a position buffer which is then 
 * stored in the gl object => gl.positionBuffer
 */
function create_image_plane(gl, width, height){
    if(typeof gl.positionBuffers[String(width)+","+String(height)] == 'undefined'){
        var recQuad = createRec(gl, 0, 0, width, height);
        
        //gl.deleteBuffer(gl.positionBuffer);
        //debug_buffer += 1
        //console.log("deleting buffer ", debug_buffer);
        //console.log("crreating buffer ", debug_buffer);
        //console.log("creating new buffer");
        gl.positionBuffer = createBuffer(gl, gl.ARRAY_BUFFER, recQuad, "positionBuffer", gl.STATIC_DRAW);
        gl.positionBuffers[String(width)+","+String(height)] = gl.positionBuffer;
    }else{
        gl.positionBuffer = gl.positionBuffers[String(width)+","+String(height)];
        //console.log("using old position buffer");

    }
    
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
function initialize_shader(gl, program, inWidth, inHeight, outWidth, outHeight){

    var u_Resolution = gl.getUniformLocation(program, 'u_Resolution');
    gl.uniform2f(u_Resolution, inWidth, inHeight);

    gl.viewport(0,0, outWidth, outHeight);

    
    create_image_plane(gl, inWidth, inHeight);
    //create_image_plane(gl.sample_width, gl.sample_height);

    if(typeof gl.texCoordBuffer == 'undefined'){
        create_texture_coords("a_TexCoord", gl, program);
    }


    enableAttribute(gl, program, gl.positionBuffer, "a_Position", 2, 0, 0);
    enableAttribute(gl, program, gl.texCoordBuffer, "a_TexCoord", 2, 0, 0);

}

/*
 * switches to the given shader program and 
 * initializes the shaders basic attributes 
 *
 */
function switch_shader(gl, program, inWidth, inHeight, outWidth, outHeight){
    gl.useProgram(program);
    gl.current_program = program;
    initialize_shader(gl, program, inWidth, inHeight, outWidth, outHeight);
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

function render_anchors(gl, transMat, zoomMat, anchorVertices){
    gl.useProgram(gl.anchor_program);

    var u_Translation = gl.getUniformLocation(gl.anchor_program, 'u_Transform');
    gl.uniformMatrix3fv(u_Translation, false, flatten(transMat[5]));

    var u_ZoomMat = gl.getUniformLocation(gl.anchor_program, 'u_ZoomMat');
    gl.uniformMatrix3fv(u_ZoomMat, false, flatten(zoomMat));

    var flattenedAnchorArr = new Float32Array(anchorVertices);
    var FSIZE = flattenedAnchorArr.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.anchorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flattenedAnchorArr, gl.STATIC_DRAW);
    enableAttribute(gl, gl.anchor_program, gl.anchorBuffer, "a_Position", 3, 6*FSIZE, 0);
    enableAttribute(gl, gl.anchor_program, gl.anchorBuffer, "a_Color", 3, 3*FSIZE, 3*FSIZE);
    gl.drawArrays(gl.POINTS, 0, anchorVertices.length/6);
}


function sample(gl, origin, outRes, inTex, outTex, zoomMat){
    switch_shader(gl, gl.sampler_program, inTex.width, inTex.height, outTex.width, outTex.height);
    var u_Image1 = gl.getUniformLocation(gl.sampler_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex.textureid);

    var u_Origin = gl.getUniformLocation(gl.sampler_program, 'u_Origin');
    gl.uniform2f(u_Origin, origin[0], origin[1]);


    var u_ImInRes = gl.getUniformLocation(gl.sampler_program, 'u_ImInRes');
    gl.uniform2f(u_ImInRes, inTex.width, inTex.height);

    var u_ImOutRes = gl.getUniformLocation(gl.sampler_program, 'u_ImOutRes');
    gl.uniform2f(u_ImOutRes, outRes[0], outRes[1]);

    var u_Zoom = gl.getUniformLocation(gl.sampler_program, 'u_Zoom');
    gl.uniformMatrix3fv(u_Zoom, false, flatten(zoomMat));

    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outTex; 
}


function transform(gl, transMat, inTex, outTex){
    switch_shader(gl, gl.transform_program, inTex.width, inTex.height, outTex.width, outTex.height);
    var u_Image1 = gl.getUniformLocation(gl.transform_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex.textureid);

    var u_zoomMat = gl.getUniformLocation(gl.transform_program, 'u_zoomMat');
    gl.uniformMatrix3fv(u_zoomMat, false, flatten(transMat[0]));

    var u_translationMat = gl.getUniformLocation(gl.transform_program, 'u_translationMat');
    gl.uniformMatrix3fv(u_translationMat, false, flatten(transMat[1]));

    var u_revMat = gl.getUniformLocation(gl.transform_program, 'u_revMat');
    gl.uniformMatrix3fv(u_revMat, false, flatten(transMat[2]));

    var u_affineMat = gl.getUniformLocation(gl.transform_program, 'u_affineMat');
    gl.uniformMatrix3fv(u_affineMat, false, flatten(transMat[3]));

    var u_shiftMat = gl.getUniformLocation(gl.transform_program, 'u_shiftMat');
    gl.uniformMatrix3fv(u_shiftMat, false, flatten(transMat[4]));

    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outTex;   
}


function zoomim(gl, inTex, outTex, zoomMat){
     switch_shader(gl, gl.zoom_program, inTex.width, inTex.height, outTex.width, outTex.height);


    var u_Image1 = gl.getUniformLocation(gl.zoom_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex.textureid);

    var u_Zoom = gl.getUniformLocation(gl.zoom_program, 'u_Zoom');
    gl.uniformMatrix3fv(u_Zoom, false, flatten(zoomMat));

    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outTex;
};


function copy_tex(gl, inTex, outTex){
    switch_shader(gl, gl.display_program, inTex.width, inTex.height, outTex.width, outTex.height);
    var u_Image1 = gl.getUniformLocation(gl.display_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex.textureid);
    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outTex;  
}

function diff(gl, inTex1, inTex2, outTex, im1flag, im2flag, s_val, gamma){
    switch_shader(gl, gl.inten_diff_program, inTex1.width, inTex1.height, outTex.width, outTex.height);

    var u_ImFlag1 = gl.getUniformLocation(gl.inten_diff_program, 'u_ImFlag1');
    gl.uniform1i(u_ImFlag1, im1flag);

    var u_ImFlag2 = gl.getUniformLocation(gl.inten_diff_program, 'u_ImFlag2');
    gl.uniform1i(u_ImFlag2, im2flag);

    var u_S = gl.getUniformLocation(gl.inten_diff_program, 'u_S');    
    gl.uniform1f(u_S, s_val);

    var u_Gamma = gl.getUniformLocation(gl.inten_diff_program, 'u_Gamma');    
    gl.uniform1f(u_Gamma, gamma);

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
    switch_shader(gl, gl.black_white_program, inTex.width, inTex.height, outTex.width, outTex.height);
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
    switch_shader(gl, gl.magnitude_program, inTex1.width, inTex1.height, outTex.width, outTex.height);
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


function blur(gl, inTex, outTex, ksize, anchor) {
    var size = ksize[0] * ksize[1];
    var k = 1.0 / size;
    var kernel = [];

    for (var i = 0; i < size; i++){
        kernel.push(k, 0.0, 0.0);
    }
    
    outTex = kernel_conv(gl, ksize[1], ksize[0], anchor, kernel, inTex, outTex);
    return outTex;
}


function boxfilter(gl, inTex, outTex, n){
    outTex = blur(gl, inTex, outTex, [n, n], [-1, -1]);
    return outTex; 
}


function multiply(gl, inTex1, inTex2, outTex){
    switch_shader(gl, gl.multiply_program, inTex1.width, inTex1.height, outTex.width, outTex.height);
    var u_Image1 = gl.getUniformLocation(gl.multiply_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex1.textureid);
    var u_Image2 = gl.getUniformLocation(gl.multiply_program, 'u_Image2');
    gl.uniform1i(u_Image2, inTex2.textureid);
    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outTex; 
}


function power(gl, expon, inTex1, outTex){
    switch_shader(gl, gl.pow_program, inTex1.width, inTex1.height, outTex.width, outTex.height);
    var u_Image1 = gl.getUniformLocation(gl.pow_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex1.textureid);
    var u_Pow = gl.getUniformLocation(gl.pow_program, 'u_Pow');
    gl.uniform3fv(u_Pow, flatten(expon));
    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outTex; 
}


function addscalar(gl, val, inTex1, outTex){
    switch_shader(gl, gl.add_program, inTex1.width, inTex1.height, outTex.width, outTex.height);
    var u_Image1 = gl.getUniformLocation(gl.add_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex1.textureid);
    var u_Val = gl.getUniformLocation(gl.add_program, 'u_Val');
    gl.uniform1f(u_Val, val);
    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return outTex; 
}


function divide(gl, inTex1, inTex2, outTex){
    switch_shader(gl, gl.divide_program, inTex1.width, inTex1.height, outTex.width, outTex.height);
    var u_Image1 = gl.getUniformLocation(gl.divide_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex1.textureid);
    var u_Image2 = gl.getUniformLocation(gl.divide_program, 'u_Image2');
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
    switch_shader(gl, gl.kernel_conv_program, inTex.width, inTex.height, outTex.width, outTex.height);
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
        /*var kernel = new Float32Array([
            0.0, 3.0, 0.0,
            0.0, 0.0, 0.0,
            3.0, 0.0, 0.0,
            0.0, 10.0, 0.0,
            0.0, 0.0, 0.0,
            10.0, 0.0, 0.0,
            0.0, 3.0, 0.0,
            0.0, 0.0, 0.0,
            3.0, 0.0, 0.0
            ]);*/
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
        /*var kernel = new Float32Array([
            0.0, 3.0, 0.0,
            0.0, 10.0, 0.0,
            0.0, 3.0, 0.0,
            0.0, 0.0, 0.0,
            0.0, 0.0, 0.0,
            0.0, 0.0, 0.0,
            3.0, 0.0, 0.0,
            10.0, 0.0, 0.0,
            3.0, 0.0, 0.0
            ]);*/
    }

    var outTex = kernel_conv(gl, kernel_size, kernel_size, [-1, -1], kernel, inTex, outTex);

    return outTex;
}


function abs_diff(gl, inTex1, inTex2, outTex){
    switch_shader(gl, gl.abs_diff_program, inTex1.width, inTex1.height, outTex.width, outTex.height);
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
    switch_shader(gl, gl.addweighted_program, inTex1.width, inTex1.height, outTex.width, outTex.height);
    var u_Image1 = gl.getUniformLocation(gl.addweighted_program, 'u_Image1');
    gl.uniform1i(u_Image1, inTex1.textureid);
    var u_Image2 = gl.getUniformLocation(gl.addweighted_program, 'u_Image2');
    gl.uniform1i(u_Image2, inTex2.textureid);

    var u_Alpha = gl.getUniformLocation(gl.addweighted_program, 'u_Alpha');
    gl.uniform1f(u_Alpha, alpha);
    var u_Beta = gl.getUniformLocation(gl.addweighted_program, 'u_Beta');
    gl.uniform1f(u_Beta, beta);
    var u_Gamma = gl.getUniformLocation(gl.addweighted_program, 'u_Gamma');
    gl.uniform1f(u_Gamma, gamma);

    var targetFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outTex, 0);
    render_image(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return outTex;  
}


function print_mat(mat){
	 console.log(	"[ ", mat[0][0], ", ", mat[0][1], ", ", mat[0][2], " ]\n", 
        			"[ ", mat[1][0], ", ", mat[1][1], ", ", mat[1][2], " ]\n", 
        			"[ ", mat[2][0], ", ", mat[2][1], ", ", mat[2][2], " ]\n");
}



