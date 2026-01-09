// 默认帕恰狗形象路径
const POCHACCO_IMAGE_SRC = 'images/pochacco.png';

// 用于生成纹理的辅助函数
function createSoftDot() {
    const canvas = document.createElement('canvas'); 
    canvas.width = 32; 
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; 
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
}

function createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.font = '24px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', 16, 16);
    return new THREE.CanvasTexture(canvas);
}

// 模拟读取图片并生成粒子数据
function generatePochaccoParticles(width, height, customSrc = null) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // 防止跨域问题
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            // 保持比例居中绘制
            const aspect = img.width / img.height;
            let drawWidth = width;
            let drawHeight = height;
            let offsetX = 0;
            let offsetY = 0;
            
            if (aspect > 1) {
                drawHeight = width / aspect;
                offsetY = (height - drawHeight) / 2;
            } else {
                drawWidth = height * aspect;
                offsetX = (width - drawWidth) / 2;
            }

            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            
            // 获取像素数据
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data;
            const particles = [];
            
            // 扫描像素 - 步长改为 1，全采样，极大增加密度
            // 同时引入一定的随机性避免网格感太强
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    const i = (y * width + x) * 4;
                    const r = data[i];
                    const g = data[i+1];
                    const b = data[i+2];
                    const a = data[i+3];

                    // 阈值过滤，只保留非透明
                    if (a > 64) { 
                        // 坐标计算
                        const px = (x - width / 2) * 0.5;
                        const py = -(y - height / 2) * 0.5;
                        
                        // Z轴优化：
                        // 1. 基础厚度
                        // 2. 根据亮度稍微改变Z轴，让亮的在前或在后，增加立体感
                        const brightness = (r + g + b) / 3;
                        const zOffset = (brightness / 255) * 2; 
                        const pz = (Math.random() - 0.5) * 4 + zOffset; 
                        
                        // 颜色增强逻辑：
                        // 降低亮度到 0.8，避免过曝
                        
                        const color = new THREE.Color();
                        
                        if (r < 50 && g < 50 && b < 50) {
                            // 黑色区域 -> 深灰色，保持轮廓但不过分抢眼
                            color.setRGB(0.1, 0.1, 0.15); 
                        } else {
                            // 普通颜色 -> 亮度系数 0.8
                            color.setRGB(r/255 * 0.8, g/255 * 0.8, b/255 * 0.8);
                        }

                        particles.push({
                            x: px, y: py, z: pz,
                            r: color.r, g: color.g, b: color.b,
                            u: x / width, v: y / height 
                        });
                    }
                }
            }
            resolve(particles);
        };
        img.onerror = () => {
            console.error("图片加载失败，请检查路径:", customSrc || POCHACCO_IMAGE_SRC);
            // 可以在这里提供一个兜底逻辑，或者 alert 提示
            resolve([]); 
        };
        img.src = customSrc || POCHACCO_IMAGE_SRC;
    });
}