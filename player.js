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

function Yuv2rgbPlayer(canvas) {
    let gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    this.gl = gl;
    let program = gl.createProgram();
    let vertexShaderSource = `
        attribute highp vec4 aVertexPosition;
        attribute vec2 aTextureCoord;
        varying highp vec2 vTextureCoord;
        void main(void) {
            gl_Position = aVertexPosition;
            vTextureCoord = aTextureCoord;
        }
    `;
    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    // shaderSource()设置 WebGLShader 着色器（顶点着色器及片元着色器）的GLSL程序代码。
    gl.shaderSource(vertexShader, vertexShaderSource);
    // compileShader()用于编译一个GLSL着色器，使其成为为二进制数据，然后就可以被WebGLProgram对象所使用.
    gl.compileShader(vertexShader);
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

    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
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
    let vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(vertexPositionAttribute);
    let textureCoordAttribute = gl.getAttribLocation(program, "aTextureCoord");
    gl.enableVertexAttribArray(textureCoordAttribute);

    let verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0, -1.0, 0.0]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    let texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.y = new Texture(gl);
    gl.u = new Texture(gl);
    gl.v = new Texture(gl);

    gl.y.bind(0, program, "YTexture");
    gl.u.bind(1, program, "UTexture");
    gl.v.bind(2, program, "VTexture");
}

Yuv2rgbPlayer.prototype.renderFrame = function (videoFrame, width, height, yuv_type) {
    let gl = this.gl;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const uOffset = width * height;
    const vOffset = (width / 2) * (height / 2);
    // 爱情这东西只有自己知道，陷得越深越困扰，就这样吧，一个人挺好
    if (yuv_type == '420-yuv') {
        // Plane(平面)模式：yuv排列
        gl.y.fill(width, height, videoFrame.subarray(0, uOffset));
        gl.u.fill(width >> 1, height >> 1, videoFrame.subarray(uOffset, uOffset + vOffset));
        gl.v.fill(width >> 1, height >> 1, videoFrame.subarray(uOffset + vOffset, videoFrame.length));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else if (yuv_type == '420-yvu') {
        // Plane(平面)模式：yuv排列
        gl.y.fill(width, height, videoFrame.subarray(0, uOffset));
        gl.u.fill(width >> 1, height >> 1, videoFrame.subarray(uOffset, uOffset + vOffset));
        gl.v.fill(width >> 1, height >> 1, videoFrame.subarray(uOffset + vOffset, videoFrame.length));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else if (yuv_type == '422-yuyv') {
        // packed(打包)模式：YUYV排列
        gl.y.fill(width, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==0 || index%4==2));
        gl.u.fill(width >> 1, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==1));
        gl.v.fill(width >> 1, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==3));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else if (yuv_type == '422-yvyu') {
        // packed(打包)模式：YVYU排列
        gl.y.fill(width, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==0 || index%4==2));
        gl.u.fill(width >> 1, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==1));
        gl.v.fill(width >> 1, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==3));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else if (yuv_type == '422-uyvy') {
        // packed(打包)模式：YVYU排列
        gl.y.fill(width, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==1 || index%4==3));
        gl.u.fill(width >> 1, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==0));
        gl.v.fill(width >> 1, height, videoFrame.subarray(0, videoFrame.length).filter((item,index)=>index%4==2));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // console.log('计时结束: ',(new Date()).getTime())
}

/* Player controls Ends Here */