<!DOCTYPE html>
<html lan="en">

    <head>
        <title>cv-vis</title>
        <script type="text/javascript" src="lib/webgl-utils.js"></script>
        <script type="text/javascript" src="lib/MV.js"></script>
        <script type="text/javascript" src="lib/InitShaders.js"></script>
        
        <link rel="stylesheet" type="text/css" href="assets/style/main-style.css" />

        <script type="text/javascript" src="hidden/imdiff.js"></script>


        <script id="display-vertex-shader" type="x-shader/x-vertex">
        //***************************COLOR TO B&W SHADERS:*******************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>


        
        <script id="display-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;
            uniform int u_ImFlag2;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up

            vec2 uv_1;
            vec2 uv_2;

            vec4 im1Color = vec4(0.0,0.0,0.0,0.0);
            vec4 im2Color = vec4(0.0,0.0,0.0,0.0);

            void main(){
                gl_FragColor = texture2D(u_Image1, v_TexCoord);
            } 
        </script>

        <script id="sampler-vertex-shader" type="x-shader/x-vertex">
        //***************************COLOR TO B&W SHADERS:*******************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>


        
        <script id="sampler-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;
            uniform int u_ImFlag2;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up

            uniform vec2 u_ImInRes;
            uniform vec2 u_ImOutRes;
            uniform vec2 u_Origin;
            uniform mat3 u_Zoom;

            vec2 uv;
            vec2 uv_1;
            vec2 uv_2;

            vec4 im1Color = vec4(0.0,0.0,0.0,1.0);
            vec4 im2Color = vec4(0.0,0.0,0.0,0.0);

            void main(){

                vec2 scale_sample = (u_ImOutRes / u_ImInRes);
                uv_2 = u_Origin + (scale_sample * (u_Zoom * vec3(v_TexCoord, 1.0)).xy);
                //uv_2 = uv_1*u_Zoom;
                if(uv_2.x >= 0.0 && uv_2.x <= 1.0 && uv_2.y >= 0.0 && uv_2.y <= 1.0){
                    gl_FragColor = texture2D(u_Image1, uv_2);
                }else{
                    gl_FragColor = vec4(0.0,0.0,0.0,1.0);
                }
            } 
        </script>



        <script id="transform-vertex-shader" type="x-shader/x-vertex">
        //***************************COLOR TO B&W SHADERS:*******************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>


        
        <script id="transform-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;

            uniform mat3 u_zoomMat;
            uniform mat3 u_translationMat;
            uniform mat3 u_affineMat;
            uniform mat3 u_shiftMat;
            uniform mat3 u_revMat;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up

            vec2 uv;

            vec4 im1Color = vec4(0.0,0.0,0.0,1.0);

            void main(){
                mat3 u_TransMat = u_zoomMat * u_revMat * u_affineMat * u_shiftMat * u_translationMat;
                uv = (u_TransMat*vec3(v_TexCoord, 1.0)).xy;
                if(uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0){
                        im1Color = texture2D(u_Image1, uv);
                }
                
                gl_FragColor = im1Color;

            }
        </script>


         <script id="zoom-vertex-shader" type="x-shader/x-vertex">
        //***************************COLOR TO B&W SHADERS:*******************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>


        
        <script id="zoom-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;

            //uniform vec2 u_Center;
            //uniform vec2 u_Diff;
            uniform mat3 u_Zoom;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up

            vec2 uv;

            vec4 im1Color = vec4(0.0,0.0,0.0,1.0);

            void main(){

                uv = (u_Zoom * vec3(v_TexCoord, 1.0)).xy;
                if(uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0){
                        im1Color = texture2D(u_Image1, uv);
                }
                
                gl_FragColor = im1Color;

            }
        </script>


        
        <script id="inten-diff-vertex-shader" type="x-shader/x-vertex">
        //***************************INTENSITY DIFF SHADERS:*******************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader

        
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>
        
        <script id="inten-diff-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;
            uniform int u_ImFlag2;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up
            uniform float u_Gamma;

            vec4 im1Color = vec4(0.0,0.0,0.0,0.0);
            vec4 im2Color = vec4(0.0,0.0,0.0,0.0);

            void main(){
                
                //gl_FragColor = texture2D(u_Image1, v_TexCoord);
                im1Color = texture2D(u_Image1, v_TexCoord);
                im2Color = texture2D(u_Image2, v_TexCoord);
                gl_FragColor = vec4((((im2Color).rgb - (im1Color).rgb )* u_S) + u_Gamma, 1.0);
            }
        </script>


        <script id="color-bw-vertex-shader" type="x-shader/x-vertex">
        //***************************COLOR TO B&W SHADERS:*******************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>


        
        <script id="color-bw-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;
            uniform int u_ImFlag2;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up

            vec2 uv_1;
            vec2 uv_2;

            vec4 im1Color = vec4(0.0,0.0,0.0,0.0);
            vec4 im2Color = vec4(0.0,0.0,0.0,0.0);

            void main(){
                float color = 0.299 * texture2D(u_Image1, v_TexCoord).r + 
                              0.587 * texture2D(u_Image1, v_TexCoord).g + 
                              0.114 * texture2D(u_Image1, v_TexCoord).b;

                gl_FragColor = vec4(color, color, color, 1.0);
            } 
        </script>



         <script id="magnitude-vertex-shader" type="x-shader/x-vertex">
        //***********************************MAGNITUDE SHADERS:*****************************************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>


        
        <script id="magnitude-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;
            uniform int u_ImFlag2;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up

            vec2 uv_1;
            vec2 uv_2;

            vec4 im1Color = vec4(0.0,0.0,0.0,0.0);
            vec4 im2Color = vec4(0.0,0.0,0.0,0.0);

            void main(){
                float color = sqrt(pow(texture2D(u_Image1, v_TexCoord).r, 2.0) + pow(texture2D(u_Image2, v_TexCoord).r, 2.0));

                gl_FragColor = vec4(color, color, color, 1.0);
            } 
        </script>



         <script id="multiply-vertex-shader" type="x-shader/x-vertex">
        //***********************************MAGNITUDE SHADERS:*****************************************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>


        
        <script id="multiply-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;
            uniform int u_ImFlag2;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up

            vec4 im1Color = vec4(0.0,0.0,0.0,0.0);
            vec4 im2Color = vec4(0.0,0.0,0.0,0.0);

            void main(){
                vec3 color = (texture2D(u_Image1, v_TexCoord).rgb * texture2D(u_Image2, v_TexCoord).rgb);

                gl_FragColor = vec4(color, 1.0);
            } 
        </script>




         <script id="pow-vertex-shader" type="x-shader/x-vertex">
        //***********************************POW SHADERS:*****************************************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>


        
        <script id="pow-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;
            uniform int u_ImFlag2;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up

            uniform vec3 u_Pow;

            void main(){
                vec3 color = pow(texture2D(u_Image1, v_TexCoord).rgb, u_Pow);

                gl_FragColor = vec4(color, 1.0);
            } 
        </script>



        <script id="add-vertex-shader" type="x-shader/x-vertex">
        //***********************************ADD SCALAR SHADERS:*****************************************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>


        
        <script id="add-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;
            uniform int u_ImFlag2;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up
            uniform float u_Val;

            void main(){
                vec3 color = (texture2D(u_Image1, v_TexCoord).rgb + u_Val);

                gl_FragColor = vec4(color, 1.0);
            } 
        </script>


         <script id="divide-vertex-shader" type="x-shader/x-vertex">
        //***********************************DIVIDE SHADERS:*****************************************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>


        
        <script id="divide-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;
            uniform int u_ImFlag2;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up

            void main(){
                vec3 color = (texture2D(u_Image1, v_TexCoord).rgb / texture2D(u_Image2, v_TexCoord).rgb);

                gl_FragColor = vec4(color, 1.0);
            } 
        </script>




        <script id="abs-diff-vertex-shader" type="x-shader/x-vertex">
        //***********************************ABS DIFF SHADERS:*****************************************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>


        
        <script id="abs-diff-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;
            uniform int u_ImFlag2;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up

            vec2 uv_1;
            vec2 uv_2;

            vec4 im1Color = vec4(0.0,0.0,0.0,0.0);
            vec4 im2Color = vec4(0.0,0.0,0.0,0.0);

            void main(){
                
                vec3 color = abs(texture2D(u_Image1, v_TexCoord) - texture2D(u_Image2, v_TexCoord)).xyz;

                gl_FragColor = vec4(color, 1.0);
            } 
        </script>



        <script id="addweighted-vertex-shader" type="x-shader/x-vertex">
        //***********************************ADD WEIGHTED SHADERS:*****************************************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>


        
        <script id="addweighted-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;

            uniform int u_ImFlag1;
            uniform int u_ImFlag2;

            uniform float u_Alpha;
            uniform float u_Beta;
            uniform float u_Gamma;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up

            void main(){
                vec3 color = texture2D(u_Image1, v_TexCoord).rgb * u_Alpha + texture2D(u_Image2, v_TexCoord).rgb * u_Beta + u_Gamma;

                gl_FragColor = vec4(color, 1.0);
            } 
        </script>



        <script id="kernel-conv-vertex-shader" type="x-shader/x-vertex">
            //*********************************KERNEL CONV SHADERS:*****************************************************************
            attribute vec2 a_Position;
            attribute vec2 a_TexCoord; // texture coordinate of the vertex
            uniform vec2 u_Resolution;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord; // pass texture coordinates to the fragment shader

        
            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                vec2 normalized_pos = a_Position / u_Resolution;
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec2 doubled_pos = normalized_pos * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec2 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4(clipCoords, 0.0, 1.0);

                //v_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        </script>
        
        <script id="kernel-conv-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
            
            //varying vec3 v_Position;
            varying vec2 v_TexCoord;
             
            uniform sampler2D u_Image1;
            uniform sampler2D u_Image2;
            uniform sampler2D u_Kernel;
            uniform vec2 u_Anchor;
            uniform vec2 u_Resolution;

            //size & shape of the kernel
            uniform vec2 u_KRes;

            uniform int u_ImFlag1;
            uniform int u_ImFlag2;

            uniform float u_Dx;
            uniform float u_Dy;

            uniform float u_S; //adjusts level of detail that shows up

            vec2 uv_1;
            vec2 uv_2;
            

            vec4 im1Color = vec4(0.0,0.0,0.0,0.0);
            vec4 im2Color = vec4(0.0,0.0,0.0,0.0);

            void main(){
                vec2 imStep = (1.0 / u_Resolution);
                vec2 mid = floor(u_KRes / 2.0);
                vec2 step = 1.0 / u_KRes;
                vec2 initxy = step / 2.0;
                vec3 sum = vec3(0.0, 0.0, 0.0);
                vec2 center = u_Anchor;

                //if either anchor coord is (-), default that coord to the midpoint (floor) of hat dimension
                if (u_Anchor.x < 0.0){
                    center.x = mid.x;
                }
                if (u_Anchor.y < 0.0){
                    center.y = mid.y;
                }


                for (float u = 0.0; u<=155.0; u++){
                    if (u > (mid.y*2.0)) {
                            break;
                        }
                    for (float v = 0.0; v<=155.0; v++){
                        if (v > (mid.x*2.0)) {
                            break;
                        }
                        sum += (texture2D(u_Kernel, vec2(initxy.x + (v*step.x), initxy.y + (u*step.y))).r * //positive nums stored in r channel
                               texture2D(u_Image1, vec2(v_TexCoord.x + ((v-center.x)*imStep.x), v_TexCoord.y + ((u-center.y)*imStep.y)))).rgb +
                                //negative nums stored in g channnel:
                               ((-1.0)*texture2D(u_Kernel, vec2(initxy.x + (v*step.x), initxy.y + (u*step.y))).g * 
                               texture2D(u_Image1, vec2(v_TexCoord.x + ((v-center.x)*imStep.x), v_TexCoord.y + ((u-center.y)*imStep.y)))).rgb; 
                    }
                }

                gl_FragColor = vec4(sum, 1.0);  
            }
        </script>


        <script id="anchor-vertex-shader" type="x-shader/x-vertex">
        //***********************************ANCHOR SHADERS:*****************************************************************
            attribute vec3 a_Position;
            attribute vec3 a_Color;
            uniform mat3 u_Transform;
            uniform mat3 u_ZoomMat;

            
            void main(){

                //convert position data from pixels to range 0.0 - 1.0 (normalize)
                // convert 0.0 - 1.0 to 0.0 - 2.0;
                vec3 doubled_pos = a_Position * 2.0;
                // convert to clip coords -1.0 - 1.0
                vec3 clipCoords = doubled_pos - 1.0;

                gl_Position = vec4((u_ZoomMat * u_Transform * vec3((clipCoords.xy), 1.0)).xy, 1.0, 1.0);
                gl_PointSize = 8.0;

            }
        </script>


        
        <script id="anchor-fragment-shader" type="x-shader/x-fragment">
            precision highp float;
             
            void main(){
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            } 
        </script>
            
        </script>

    </head>
    <body>
        <div id="canvas-box">
            <div id="canvas-top">
                <ul class="span-box">
                    <li>  
                        <strong>offset >> </strong>   
                        <strong>dx:</strong> <span id="dx_text"></span>    
                        <strong>dy:</strong> <span id ="dy_text"></span>
                    </li>
                    <li>
                        <strong>x disparity grad.:
                        </strong> <span id ="xshear_text"></span>
                    </li>
                    <li>
                        <strong>y disparity grad.:
                        </strong> <span id ="yshear_text"></span>
                    </li>
                    <li>
                        <strong>speed:</strong> <span id="speed_text"></span>
                    </li>
                    <li>
                        <strong>texture intensity:</strong> <span id="tex_inten_text"></span>
                    </li>
                </ul>
            </div>
            <canvas id="gl-canvas" width="400" height="300">
                You need a better web browser
            </canvas>
            <div id="canvas-bottom">
                <ul class="span-box">
                    <li>
                        <strong>Window Center >> </strong> <span id="center_text"></span>
                    </li>
                    <li>
                        <!--<strong>Window Dim >> </strong> <span id="wdim_text"></span>-->
                        <strong>Window Dim >> </strong>
                        <input id="window-width" type="text" /> 
                        x
                        <input id="window-height" type="text" /> 
                    </li>
                </ul>
            </div>
        </div>
        <div id="inputs-box">
            <!--<p>
                <input id="im1_box" type="checkbox" /> Image 1
                <input id="im2_box" type="checkbox" /> Image 2
            </p>-->
            <p>
                <select id="effect_menu">
                    <option value="e1">Color Difference</option>
                    <option value="e2">Gradient Difference</option>
                    <option value="e3">Bleyer</option>
                    <option value="e4">ICPR</option>
                    <option value="e5">NCC</option>
                </select>
            </p>
            <p>
                <!--<select id="image_menu">
                    <option value="cones">Cones</option>
                    <option value="motos">Motorcycle</option>
                    <option value="playtable">Playtable</option>
                </select>-->

                <?php 

                    $path = "./images/";

                    $select1 = "\n<select name=\"content\" id=\"image1_menu\">\n";
                    $select2 = "\n<select name=\"content\" id=\"image2_menu\">\n";

                    // match all files that have either .png or .jpg extension
                    $file_matcher = realpath(dirname(__FILE__)) . "/" . $path . '*.{png,jpg}';

                    foreach( glob($file_matcher, GLOB_BRACE) as $file ) {
                        $file_name = basename($file);
                        $rel_path_file_name = $path . $file_name;
                        if(preg_match('/.*1.*/', $file_name)){
                            $select1 .= "<option value='$rel_path_file_name'>$file_name</option>\n";
                        }else if(preg_match('/.*2.*/', $file_name)){
                            $select2 .= "<option value='$rel_path_file_name'>$file_name</option>\n";
                        }
                    }

                    $select1 .= "</select> \n";
                    $select2 .= "</select> \n";
                    echo $select1;
                    echo $select2;

                ?>
            </p>
        </div>
        <div id="key-bind-box">
            <div class="column-box">
                <div class="col-intern">
                    <p><strong>WASD, arrow keys</strong> or <strong>click & drag</strong> to shift image</p>
                    <p><strong>q/e:</strong> slow down/speed up image motion & shear speed</p>
                    <p><strong>g/h:</strong> control x-shear</p>
                    <p><strong>r:</strong> reset image position</p> 
                    <p><strong>b:</strong> blink between images</p> 
                    <p><strong>shift-g:</strong> reset x disparity gradient value</p>
                    <p><strong>alt-click:</strong> set warp anchor point</p>
                </div>
            </div>
            <div class="column-box">
                <div class="col-intern">
                    <p><strong>IJKL</strong> to shift window</p>
                    <p><strong>shift:</strong> lock image motion to horizontal only</p>
                    <p><strong>z/x:</strong> decrease/increase texture intensity</p>
                    <p><strong>n/m:</strong> control y-shear</p>
                    <p><strong>shift-y:</strong> reset dy </p>
                    <p><strong>shift-n:</strong> reset y disparity gradient value</p>
                    <p><strong>shift-r:</strong> reset all controls</p>
                    <p><strong>shift-p:</strong> reset zoom</p>
                    <p><strong>scroll:</strong> zoom </p>
                    
                </div>
            </div>
        </div>
    </body>
</html>