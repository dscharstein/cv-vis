# cv-vis

To download run `git clone https://github.com/mthstanley/cv-vis.git`

## User Information

### About

This tool provides a visualization of pixel-wise matching costs between two images, for use in stereo vision research. The user can apply transformations to one of the two images in order to line up corresponding objects in the scene. The tool performs best on a rectified stereo pair. It is a web application written using JavaScript and WebGL. 

The user can select between several methods of computing the matching cost between two images: 
`color difference`
`gradient difference`
`bleyer`
`ICPR`
`NCC`

### Usage

#### Adding Images

To add a pair of images to view with the app, add them to the "images" folder. They will then be available in the image selection drop-down menus.

#### Key Bindings

| Key            |      Effect     |
|----------------|-----------------|
| WASD/Arrow Keys/Click & Drag | shift top image |
| q/e | decrease/increase image motion & shear speed |
| z/x | decrease/increase texture intensity |
| g/h | x-shear |
| n/m | y-shear |
| alt-click | set warp anchor point |
| b | blink between images |
| shift | lock image motion to horizontal only |
| IJKL | shift window |      
| mouse scroll | zoom |
| r | reset image position |
| shift-g | reset x disparity gradient value |
| shift-n | reset y disparity gradient value |
| shift-y | reset dy |
| shift-p | reset zoom |
| shift-r | reset all |



## Developer Information

### About WebGL

This application makes use of a small JavaScript library which is compiled from a number of sources. 

The application reads in initial .png or .jpeg images and converts them into WebGL textures, which enables us to use WebGL to apply transformations to the images. The image to be displayed is texture mapped to a quad which is the same size as the canvas. The quad's vertices are specified within the JavaScript in pixels and then converted to the gl coordinate system in the vertex shader. 

All of the image processing functions use separate shaders, which are written in GLSL. The program handles switching between shaders for the different image processing tasks. These shaders are embedded in the `index.php` file.  

### Application Structure 

The application consists of a single JavaScript class called imdiff_app. To continually update the view, the application executes in a loop, repeatededly calling its `update()` function while it is running. It provides event listeners for key up, key down, mouse up, mouse down, mouse move and wheel event (mouse scroll). 


