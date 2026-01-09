// 主逻辑控制器
let scene, camera, renderer, composer;
let particleSystem;
let gestureController;

// 状态管理
const STATE = {
    isLoaded: false,
    cameraReady: false,
    currentGesture: 'NONE'
};

// 初始化 Three.js
function initThree() {
    const container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050205, 0.002);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    // 移动端视距调整：离远一点以适应竖屏
    camera.position.set(0, 0, isMobileDevice() ? 180 : 80);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 辉光效果
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85
    );
    // 调整 Bloom 参数，让光效更柔和
    bloomPass.threshold = 0.1;
    bloomPass.strength = 1.2;
    bloomPass.radius = 0.5;

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // 灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 生成粒子
    initParticles();

    // 监听窗口大小
    window.addEventListener('resize', onWindowResize, false);
    
    // 开始循环
    animate();
}

async function initParticles() {
    // 260x260 的网格 + 步长1，像素点数将大幅增加，细节更丰富
    const particlesData = await generatePochaccoParticles(260, 260);
    
    particleSystem = new ParticleSystem(scene, particlesData);
    
    // === 自动嗅探加载照片逻辑 ===
    // 规则：尝试加载 1.jpg, 2.jpg, 3.jpg ... 直到加载失败为止
    // 这样用户只需在 images/photos/ 下放入按数字命名的图片即可，无需修改代码
    let photoIndex = 1;
    const loadNextPhoto = () => {
        const path = `images/photos/${photoIndex}.jpg`;
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = () => {
            console.log(`[Photo Loaded] ${path}`);
            particleSystem.addPhoto(img);
            photoIndex++;
            loadNextPhoto(); // 递归加载下一张
        };
        
        img.onerror = () => {
            // 加载失败意味着序号断了或结束了
            console.log(`[Photo Load Finished] Loaded ${photoIndex - 1} photos total.`);
            if (photoIndex === 1) {
                console.warn("No photos found! Please ensure 'images/photos/1.jpg' exists.");
            }
        };
        
        img.src = path;
    };
    
    // 启动加载链
    loadNextPhoto();
    
    // 隐藏加载屏
    document.getElementById('loading-screen').style.opacity = 0;
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 500);
    
    STATE.isLoaded = true;
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    if (STATE.isLoaded && particleSystem) {
        particleSystem.update();
    }
    
    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// 手势处理回调
function handleGesture(type, param) {
    if (!particleSystem) return;

    // UI 反馈
    updateStatusUI(type);

    switch(type) {
        case 'FIST': // 聚合
            particleSystem.setMode('FORM');
            toggleHeaderText(true); // 握拳：文字回来
            break;
        case 'PALM': // 爆散
            particleSystem.setMode('EXPLODE');
            break;
        case 'PINCH': // 照片/抓取
            particleSystem.setMode('PHOTO');
            toggleHeaderText(false); // 捏合：文字消散
            break;
        case 'MOVE': // 移动控制旋转
            // param 是 0~1，我们需要映射到 -PI ~ PI
            // 镜像翻转：手向右(x大) -> 旋转向右
            // 但 MediaPipe 这里的 X 是归一化的，且我们需要注意镜像问题
            // 通常 X=0 在左边，X=1 在右边
            if (param !== null) {
                const rot = (param - 0.5) * -4; // -2 ~ 2
                particleSystem.setRotation(rot);
            }
            break;
    }
}

function updateStatusUI(gesture) {
    if (STATE.currentGesture === gesture) return;
    STATE.currentGesture = gesture;

    const items = document.querySelectorAll('.guide-item');
    items.forEach(el => el.classList.remove('active'));

    const statusText = document.getElementById('status-text');
    const indicator = document.querySelector('.status-indicator');

    if (gesture === 'FIST') {
        document.getElementById('guide-fist').classList.add('active');
        statusText.innerText = "状态: 聚合中...";
    } else if (gesture === 'PALM') {
        document.getElementById('guide-palm').classList.add('active');
        statusText.innerText = "状态: 爆散星尘!";
    } else if (gesture === 'PINCH') {
        document.getElementById('guide-pinch').classList.add('active');
        statusText.innerText = "状态: 回忆碎片";
    } else if (gesture === 'NONE') {
        // statusText.innerText = "未检测到手势";
    }

    if (gesture !== 'NONE') {
        indicator.classList.add('connected');
    }
}

// 控制标题文字动画
function toggleHeaderText(show) {
    const h1 = document.querySelector('.header h1');
    const h2 = document.querySelector('.header h2');
    
    if (show) {
        // 如果已经显示，就不再触发动画
        if(h1.classList.contains('text-dissolve')) {
            h1.classList.remove('text-dissolve');
            h2.classList.remove('text-dissolve');
            h1.classList.add('text-appear');
            h2.classList.add('text-appear');
        }
    } else {
        if(!h1.classList.contains('text-dissolve')) {
            h1.classList.remove('text-appear');
            h2.classList.remove('text-appear');
            h1.classList.add('text-dissolve');
            h2.classList.add('text-dissolve');
        }
    }
}

// 检测是否为移动端
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 移动端触屏控制 (仅保留旋转辅助)
function initTouchControls() {
    let startX = 0;
    
    document.addEventListener('touchstart', (e) => {
        if(e.touches.length === 1) {
            startX = e.touches[0].clientX;
        }
    }, {passive: false});

    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('.controls')) return; 
        // 不阻止默认行为，防止无法滚动页面（如果需要的话），或者阻止以防抖动
        // e.preventDefault(); 
        
        if(e.touches.length === 1) {
            const currentX = e.touches[0].clientX;
            const deltaX = currentX - startX;
            // 简单旋转映射
            const rot = (deltaX / window.innerWidth) * 2; 
            if(particleSystem) particleSystem.setRotation(rot);
        }
    }, {passive: false});
}

// 启动流程
window.onload = async () => {
    initThree();
    
    // 初始化手势
    const videoElement = document.getElementById('video-feed');
    const canvasElement = document.getElementById('camera-overlay');
    
    // 无论移动端还是桌面端，都初始化摄像头
    gestureController = new GestureController(videoElement, canvasElement, handleGesture);
    const cameraSuccess = await gestureController.init();
    
    const statusText = document.getElementById('status-text');
    if (cameraSuccess) {
        STATE.cameraReady = true;
        statusText.innerText = "摄像头已连接，请挥手";
    } else {
        statusText.innerText = "摄像头连接失败，仅展示动画";
    }

    // 移动端额外添加触屏旋转辅助
    if (isMobileDevice()) {
        initTouchControls();
        // 覆盖状态文本，提示用户可以使用手势
        if (cameraSuccess) {
            statusText.innerText = ""; // 移动端状态栏已隐藏，这里不用管
        }
    }

    // 图片上传处理 - 回忆照片 (已移除，改为自动加载)
    // document.getElementById('photo-upload').addEventListener...

    // 图片上传处理 - 帕恰狗形象
    document.getElementById('char-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                // 更新全局图片源，虽然这里我们直接重新生成
                const newSrc = evt.target.result;
                reloadCharacterParticles(newSrc);
            };
            reader.readAsDataURL(file);
        }
    });
};

async function reloadCharacterParticles(imageSrc) {
    if (particleSystem) {
        scene.remove(particleSystem.mesh);
        if (particleSystem.wandSystem) scene.remove(particleSystem.wandSystem);
        // 保留之前的照片
        var savedPhotos = particleSystem.photoTextures;
    }
    
    // 修改 generatePochaccoParticles 支持传入 src，保持高分辨率
    const particlesData = await generatePochaccoParticles(260, 260, imageSrc);
    
    particleSystem = new ParticleSystem(scene, particlesData);
    if(savedPhotos) particleSystem.photoTextures = savedPhotos;
    
    alert("帕恰狗形象已更新！");
}
