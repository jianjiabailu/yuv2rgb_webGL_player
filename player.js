function Texture(gl) {
    this.gl = gl;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

Texture.prototype.bind = function(n, program, name) {
    var gl = this.gl;
    gl.activeTexture([gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2][n]);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(gl.getUniformLocation(program, name), n);
}

Texture.prototype.fill = function(width, height, data) {
    var gl = this.gl;
    // 将给定的 WebGLTexture 绑定到目标（绑定点）
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    // 指定了二维纹理图像
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
}

function setupCanvas(canvas) {
    var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl)
        return gl;

    var program = gl.createProgram();
    var vertexShaderSource = [
        "attribute highp vec4 aVertexPosition;",
        "attribute vec2 aTextureCoord;",
        "varying highp vec2 vTextureCoord;",
        "void main(void) {",
        " gl_Position = aVertexPosition;",
        " vTextureCoord = aTextureCoord;",
        "}"
    ].join("\n");
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    // shaderSource()设置 WebGLShader 着色器（顶点着色器及片元着色器）的GLSL程序代码。
    gl.shaderSource(vertexShader, vertexShaderSource);
    // compileShader()用于编译一个GLSL着色器，使其成为为二进制数据，然后就可以被WebGLProgram对象所使用.
    gl.compileShader(vertexShader);
    // var fragmentShaderSource = [
    //     "precision highp float;",
    //     "varying lowp vec2 vTextureCoord;",
    //     "uniform sampler2D YTexture;",
    //     "uniform sampler2D UTexture;",
    //     "uniform sampler2D VTexture;",
    //     "const mat4 YUV2RGB = mat4",
    //     "(",
    //     " 1.1643828125, 0, 1.59602734375, -.87078515625,",
    //     " 1.1643828125, -.39176171875, -.81296875, .52959375,",
    //     " 1.1643828125, 2.017234375, 0, -1.081390625,",
    //     " 0, 0, 0, 1",
    //     ");",
    //     "void main(void) {",
    //     " gl_FragColor = vec4( texture2D(YTexture, vTextureCoord).x, texture2D(UTexture, vTextureCoord).x, texture2D(VTexture, vTextureCoord).x, 1) * YUV2RGB;",
    //     "}"
    // ].join("\n");
    let fragmentShaderSource = `
        precision lowp float;
        uniform sampler2D YTexture;
        uniform sampler2D UTexture;
        uniform sampler2D VTexture;
        varying vec2 vTextureCoord;
        void main() {
            float r,g,b,y,u,v,fYmul;
            y = texture2D(YTexture, vTextureCoord).r;
            u = texture2D(UTexture, vTextureCoord).r;
            v = texture2D(VTexture, vTextureCoord).r;
            fYmul = y * 1.1643828125;
            r = fYmul + 1.59602734375 * v - 0.870787598;
            g = fYmul - 0.39176171875 * u - 0.81296875 * v + 0.52959375;
            b = fYmul + 2.01723046875 * u - 1.081389160375;
            gl_FragColor = vec4(r, g, b, 1.0);
        }
    `;

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    // shaderSource()设置 WebGLShader 着色器（顶点着色器及片元着色器）的GLSL程序代码。
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    // compileShader()用于编译一个GLSL着色器，使其成为为二进制数据，然后就可以被WebGLProgram对象所使用.
    gl.compileShader(fragmentShader);
    // attachShader()负责往 WebGLProgram 添加一个片段或者顶点着色器
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    // linkProgram()链接给定的WebGLProgram，从而完成为程序的片元和顶点着色器准备GPU代码的过程
    gl.linkProgram(program);
    // useProgram()将定义好的WebGLProgram 对象添加到当前的渲染状态
    gl.useProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log("Shader link failed.");
    }
    var vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(vertexPositionAttribute);
    var textureCoordAttribute = gl.getAttribLocation(program, "aTextureCoord");
    gl.enableVertexAttribArray(textureCoordAttribute);

    var verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0, -1.0, 0.0]),
        gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    var texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0]),
        gl.STATIC_DRAW);
    gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.y = new Texture(gl);
    gl.u = new Texture(gl);
    gl.v = new Texture(gl);
    gl.y.bind(0, program, "YTexture");
    gl.u.bind(1, program, "UTexture");
    gl.v.bind(2, program, "VTexture");
    return gl;
}

function renderFrame(gl, videoFrame, width, height, yuv_type) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const uOffset = width * height;
    const vOffset = (width / 2) * (height / 2);

    if (yuv_type == '420-yuv') {
        // Plane(平面)模式：yuv排列
        gl.y.fill(width, height, videoFrame.subarray(0, uOffset));
        gl.u.fill(width >> 1, height >> 1, videoFrame.subarray(uOffset, uOffset + vOffset));
        gl.v.fill(width >> 1, height >> 1, videoFrame.subarray(uOffset + vOffset, videoFrame.length));
    } else if (yuv_type == '420-yvu') {
        // Plane(平面)模式：yuv排列
        gl.y.fill(width, height, videoFrame.subarray(0, uOffset));
        gl.u.fill(width >> 1, height >> 1, videoFrame.subarray(uOffset, uOffset + vOffset));
        gl.v.fill(width >> 1, height >> 1, videoFrame.subarray(uOffset + vOffset, videoFrame.length));
    } else if (yuv_type == '422-yuv') {
        // packed(打包)模式：Y-UV排列
        gl.y.fill(width, height, videoFrame.subarray(0, uOffset));
        gl.u.fill(width >> 1, height, videoFrame.subarray(uOffset, videoFrame.length).filter((item,index)=>index%2==0));
        gl.v.fill(width >> 1, height, videoFrame.subarray(uOffset, videoFrame.length).filter((item,index)=>index%2==1));
    } else if (yuv_type == '422-yvu') {
        // packed(打包)模式：Y-VU排列
        gl.y.fill(width, height, videoFrame.subarray(0, uOffset));
        gl.u.fill(width >> 1, height, videoFrame.subarray(uOffset, videoFrame.length).filter((item,index)=>index%2==0));
        gl.v.fill(width >> 1, height, videoFrame.subarray(uOffset, videoFrame.length).filter((item,index)=>index%2==1));
    } else if (yuv_type == '422-yuyv') {
        // packed(打包)模式：YUYV排列
        gl.y.fill(width, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==0 || index%4==2));
        gl.u.fill(width >> 1, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==1));
        gl.v.fill(width >> 1, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==3));
    } else if (yuv_type == '422-yvyu') {
        // packed(打包)模式：YVYU排列
        gl.y.fill(width, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==0 || index%4==2));
        gl.u.fill(width >> 1, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==1));
        gl.v.fill(width >> 1, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==3));
    } else if (yuv_type == '422-uyvy') {
        // packed(打包)模式：YVYU排列
        gl.y.fill(width, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==1 || index%4==3));
        gl.u.fill(width >> 1, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==0));
        gl.v.fill(width >> 1, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==2));
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}


/* Player controls Start Here */

function fullscreen() {
    let node = document.getElementById('vidPlayerComp');
    let canvas = document.getElementById('canvas');
    let childrens = node.children;
    let fullScreen;

    if ((document.webkitIsFullScreen == false) || (document['isFullScreen'] == false) || (screen.height - 50 > window.innerHeight && screen.width == window.innerWidth)) {
        (node.webkitRequestFullScreen || node.requestFullScreen || node.mozRequestFullScreen || node.msRequestFullscreen).call(node);
        fullScreen = true;
    } else {
        //(document.webkitCancelFullScreen()||document.cancelFullScreen()||document.mozCancelFullScreen()||document.msExitFullscreen());
        (document.webkitCancelFullScreen || document['cancelFullScreen'] || document['mozCancelFullScreen'] || document['msExitFullscreen']).call(document);
        fullScreen = false;
    }

    let innerWidth = screen.width;
    let innerHeight = screen.height;
    if (fullScreen) {
        node.setAttribute('style', 'width:' + innerWidth + 'px;' + 'height:' + innerHeight + 'px;' + 'margin-top:0px;margin-left:0px;top:0px;left:0px;background-color:black;border:2px solid rgba(17, 48, 69, 0.9);max-width:' + innerWidth + 'px;');
    } else {
        node.setAttribute('style', '');
    }

    for (let i = 0, len = node.children.length; i < len; i++) {
        if (fullScreen) {
            node.children[i].setAttribute('style', 'width:' + innerWidth + 'px;' + 'height:25px;');
        } else {
            node.children[i].setAttribute('style', '');
        }

        if (i === 1) {
            if (fullScreen) {
                node.children[i].setAttribute('style', 'height:' + (innerHeight - 54) + 'px;' + 'width:' + innerWidth + 'px');
                canvas.style.width = (innerWidth) + 'px';
                canvas.style.height = (innerHeight - 54) + 'px';
            } else {
                node.children[i].setAttribute('style', '');
                canvas.setAttribute('style', '');
            }
        }
    }
}


/* Player controls Ends Here */