class GestureController {
    constructor(videoElement, canvasElement, onGesture) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.onGesture = onGesture;
        
        this.hands = null;
        this.camera = null;
        this.isReady = false;
        
        // 防抖
        this.lastGesture = '';
        this.gestureFrameCount = 0;
        this.CONFIDENCE_THRESHOLD = 5; // 连续多少帧确认手势
    }

    async init() {
        if (typeof Hands === 'undefined') {
            console.error('MediaPipe Hands not loaded');
            return false;
        }

        try {
            this.hands = new Hands({locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }});

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults(this.onResults.bind(this));

            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    await this.hands.send({image: this.video});
                },
                width: 320,
                height: 240
            });

            await this.camera.start();
            this.isReady = true;
            return true;
        } catch (e) {
            console.error('Camera init failed:', e);
            return false;
        }
    }

    onResults(results) {
        // 绘制辅助线 (可选，为了不干扰 UI，我们可以不绘制或者绘制得很淡)
        // this.ctx.save();
        // this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
        // if (results.multiHandLandmarks) {
        //     for (const landmarks of results.multiHandLandmarks) {
        //         drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 1});
        //         drawLandmarks(this.ctx, landmarks, {color: '#FF0000', lineWidth: 1});
        //     }
        // }
        // this.ctx.restore();

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            this.detectGesture(landmarks);
        } else {
            this.triggerGesture('NONE', null);
        }
    }

    detectGesture(landmarks) {
        // 计算关键特征
        const dist = (i, j) => Math.hypot(landmarks[i].x - landmarks[j].x, landmarks[i].y - landmarks[j].y);
        
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];

        // 1. 捏合 (Pinch): 拇指和食指距离很近
        const pinchDist = dist(4, 8);
        
        // 2. 张开 (Open Palm): 所有指尖距离手腕都比较远，且手指是张开的
        // 简单判断：指尖到手腕的距离 > 某个阈值，且手指间有距离
        const isPalmOpen = (
            dist(8, 0) > 0.3 && 
            dist(12, 0) > 0.3 && 
            dist(16, 0) > 0.3 && 
            dist(20, 0) > 0.3
        );

        // 3. 握拳 (Fist): 指尖距离手腕很近
        const isFist = (
            dist(8, 0) < 0.2 && 
            dist(12, 0) < 0.2 && 
            dist(16, 0) < 0.2 && 
            dist(20, 0) < 0.2
        );
        
        // X 坐标用于控制旋转 (归一化 0~1, 0.5是中心)
        const handX = landmarks[9].x; // 用中指根部代表手掌中心

        let currentGesture = 'UNKNOWN';

        if (pinchDist < 0.05) {
            currentGesture = 'PINCH';
        } else if (isPalmOpen) {
            currentGesture = 'PALM';
        } else if (isFist) {
            currentGesture = 'FIST';
        }

        // 状态确认逻辑
        if (currentGesture === this.lastGesture) {
            this.gestureFrameCount++;
            if (this.gestureFrameCount > this.CONFIDENCE_THRESHOLD) {
                this.triggerGesture(currentGesture, handX);
            }
        } else {
            this.lastGesture = currentGesture;
            this.gestureFrameCount = 0;
        }
        
        // 挥手动作始终传递坐标，不需要状态防抖
        if (currentGesture !== 'NONE') {
             this.onGesture('MOVE', handX);
        }
    }

    triggerGesture(gesture, param) {
        this.onGesture(gesture, param);
    }
}