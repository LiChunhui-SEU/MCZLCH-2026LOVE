class ParticleSystem {
    constructor(scene, particlesData) {
        this.scene = scene;
        this.particlesData = particlesData; // 原始目标位置数据
        this.count = particlesData.length;
        
        // 状态
        this.mode = 'FORM'; // FORM, EXPLODE, GATHER, PHOTO
        this.time = 0;
        this.rotationSpeed = 0.01;
        this.targetRotationY = 0;
        this.currentRotationY = 0;
        
        // 初始化几何体
        this.geometry = new THREE.BufferGeometry();
        this.initAttributes();
        
        // 材质
        this.material = new THREE.PointsMaterial({
            size: 1.2, // 初始为帕恰狗形态，设为大粒子 (0.8 * 1.5)
            map: createSoftDot(),
            vertexColors: true,
            transparent: true,
            opacity: 0.8, // 降低不透明度到 0.8
            depthWrite: false,
            blending: THREE.AdditiveBlending 
        });

        this.mesh = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.mesh);
        
        // 魔法棒粒子
        this.wandSystem = null;
        this.createMagicWand();

        // 额外的装饰粒子 (背景星星/雪花)
        this.createAmbientParticles();
        
        // 照片纹理
        this.photoTextures = [];
        this.currentPhotoIndex = 0;
    }

    initAttributes() {
        const positions = new Float32Array(this.count * 3);
        const colors = new Float32Array(this.count * 3);
        const sizes = new Float32Array(this.count);
        
        // 存储每个粒子的物理状态
        this.physics = [];

        for(let i = 0; i < this.count; i++) {
            const d = this.particlesData[i];
            
            // 初始位置：随机散落在空间中
            positions[i*3] = (Math.random() - 0.5) * 300;
            positions[i*3+1] = (Math.random() - 0.5) * 300;
            positions[i*3+2] = (Math.random() - 0.5) * 200;
            
            colors[i*3] = d.r * 0.65;
            colors[i*3+1] = d.g * 0.65;
            colors[i*3+2] = d.b * 0.65;
            
            sizes[i] = Math.random() * 0.5 + 0.5;

            this.physics.push({
                // 帕恰狗形态整体缩小 0.8 倍
                target: new THREE.Vector3(d.x * 0.8, d.y * 0.8, d.z * 0.8), 
                velocity: new THREE.Vector3(0, 0, 0),
                burstVelocity: new THREE.Vector3(0, 0, 0), // 爆散时的初速度
                wanderOffset: Math.random() * Math.PI * 2, // 漂浮相位
                baseColor: new THREE.Color(d.r * 0.65, d.g * 0.65, d.b * 0.65)
            });
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    }

    createMagicWand() {
        // 创建一个简单的爱心魔法棒粒子组
        // 这里用参数方程生成一个心形
        const wandPoints = [];
        const heartShape = new THREE.Shape();
        const x = 0, y = 0;
        heartShape.moveTo(x + 5, y + 5);
        heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
        heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
        heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
        heartShape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
        heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
        heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);
        
        // 采样点
        const points = heartShape.getSpacedPoints(50);
        const positions = [];
        const colors = [];
        
        // 棒身
        for(let i=0; i<20; i++) {
            positions.push(20, -10 - i, 10); // 假设手的位置
            colors.push(1, 0.8, 0.2); // 金色
        }
        
        // 爱心头
        points.forEach(p => {
             // 缩放并移动到棒子顶端
             positions.push(p.x * 0.5 + 17.5, -p.y * 0.5 - 10, 10);
             colors.push(1, 0.2, 0.5); // 粉色
        });

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const mat = new THREE.PointsMaterial({
            size: 2.0, // 魔法棒粒子大一点
            map: createSoftDot(),
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true
        });

        this.wandSystem = new THREE.Points(geo, mat);
        this.scene.add(this.wandSystem);
    }
    
    createAmbientParticles() {
        const count = 300;
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        
        for(let i=0; i<count; i++) {
            pos[i*3] = (Math.random()-0.5) * 400;
            pos[i*3+1] = (Math.random()-0.5) * 400;
            pos[i*3+2] = (Math.random()-0.5) * 200 - 50;
            
            // 随机粉色或白色
            const c = Math.random() > 0.5 ? new THREE.Color(0xFFFFFF) : new THREE.Color(0xFFB6C1);
            col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
        }
        
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        
        const mat = new THREE.PointsMaterial({
            size: 1.5,
            map: createStarTexture(),
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.ambientSystem = new THREE.Points(geo, mat);
        this.scene.add(this.ambientSystem);
    }

    setMode(newMode) {
        if (this.mode === newMode) return;
        
        // 状态切换逻辑
        if (newMode === 'EXPLODE') {
            // 给所有粒子一个向外的爆发速度
            for(let i=0; i<this.count; i++) {
                 const p = this.physics[i];
                 // 随机方向
                 const dir = new THREE.Vector3(
                     Math.random()-0.5, Math.random()-0.5, Math.random()-0.5
                 ).normalize();
                 // 速度力度
                 const force = Math.random() * 5 + 2; 
                 p.burstVelocity.copy(dir).multiplyScalar(force);
            }
        }
        
        if (newMode === 'PHOTO' && this.photoTextures.length > 0) {
            // 切换到下一张照片
            this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.photoTextures.length;
            this.updateColorsForPhoto();
            
            // 照片模式：粒子变小以展示细节
            this.material.size = 0.8;
            
        } else if (newMode === 'FORM') {
            // 恢复帕恰狗颜色
            this.resetColors();
            this.resetTargets();
            
            // 帕恰狗模式：粒子变大 (1.5倍)
            this.material.size = 1.2;
        }

        this.mode = newMode;
        console.log(`Mode switched to: ${newMode}`);
    }
    
    setRotation(rotY) {
        this.targetRotationY = rotY;
    }
    
    addPhoto(img) {
        // 动态计算最佳分辨率：利用所有可用粒子
        // 计算最大正方形边长
        const side = Math.floor(Math.sqrt(this.count));
        
        // 创建纹理并分析颜色
        const canvas = document.createElement('canvas');
        canvas.width = side; 
        canvas.height = side;
        const ctx = canvas.getContext('2d');
        
        // 保持比例居中裁剪
        const aspect = img.width / img.height;
        let sx, sy, sw, sh;
        
        if (aspect > 1) {
            sh = img.height;
            sw = img.height;
            sx = (img.width - img.height) / 2;
            sy = 0;
        } else {
            sw = img.width;
            sh = img.width;
            sx = 0;
            sy = (img.height - img.width) / 2;
        }
        
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, side, side);
        const data = ctx.getImageData(0, 0, side, side).data;
        
        this.photoTextures.push({
            data: data,
            width: side,
            height: side
        });
    }

    updateColorsForPhoto() {
        const photo = this.photoTextures[this.currentPhotoIndex];
        const colors = this.geometry.attributes.color.array;
        
        // 计算网格布局
        const width = photo.width;
        const height = photo.height;
        
        // 动态调整间距，防止照片过大
        // 再次缩小：原108 * 0.8 ≈ 86
        const targetDisplayWidth = 86;
        const spacing = targetDisplayWidth / width; 
        
        const startX = - (width * spacing) / 2;
        const startY = (height * spacing) / 2;
        
        for(let i=0; i<this.count; i++) {
            const pIndex = i % (width * height);
            const px = pIndex % width;
            const py = Math.floor(pIndex / width);
            
            const pixelIndex = pIndex * 4;
            
            colors[i*3] = photo.data[pixelIndex] / 255;
            colors[i*3+1] = photo.data[pixelIndex+1] / 255;
            colors[i*3+2] = photo.data[pixelIndex+2] / 255;
            
            // 设置目标位置以形成平面图像
            const targetX = startX + px * spacing;
            const targetY = startY - py * spacing;
            const targetZ = 0;
            
            this.physics[i].target.set(targetX, targetY, targetZ);
        }
        this.geometry.attributes.color.needsUpdate = true;
    }

    resetTargets() {
        for(let i=0; i<this.count; i++) {
            const d = this.particlesData[i];
            this.physics[i].target.set(d.x, d.y, d.z);
        }
    }

    resetColors() {
        const colors = this.geometry.attributes.color.array;
        for(let i=0; i<this.count; i++) {
            const p = this.physics[i];
            colors[i*3] = p.baseColor.r;
            colors[i*3+1] = p.baseColor.g;
            colors[i*3+2] = p.baseColor.b;
        }
        this.geometry.attributes.color.needsUpdate = true;
    }

    update(time) {
        this.time += 0.01;
        
        // 1. 处理整体旋转 (平滑插值)
        if (this.mode === 'EXPLODE') {
             // 爆散时自动旋转一点点
             this.targetRotationY += 0.002;
        } else if (this.mode === 'FORM') {
             // 默认自转
             // this.targetRotationY += 0.005; // 如果想自动转可以打开
        }
        
        this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.1;
        this.mesh.rotation.y = this.currentRotationY;
        if(this.wandSystem) this.wandSystem.rotation.y = this.currentRotationY;

        // 2. 粒子物理更新
        const positions = this.geometry.attributes.position.array;
        
        for(let i=0; i<this.count; i++) {
            const i3 = i * 3;
            const p = this.physics[i];
            
            // 当前位置
            let cx = positions[i3];
            let cy = positions[i3+1];
            let cz = positions[i3+2];
            
            if (this.mode === 'EXPLODE') {
                // 爆散物理：位置 += 速度
                cx += p.burstVelocity.x;
                cy += p.burstVelocity.y;
                cz += p.burstVelocity.z;
                
                // 阻力
                p.burstVelocity.multiplyScalar(0.95);
                
                // 加上一点随机漂移，像星尘
                cx += Math.sin(this.time + p.wanderOffset) * 0.1;
                cy += Math.cos(this.time + p.wanderOffset) * 0.1;
                
            } else if (this.mode === 'FORM' || this.mode === 'PHOTO') {
                // 聚合物理：向目标位置移动 (Spring force)
                // 目标位置
                let tx = p.target.x;
                let ty = p.target.y;
                let tz = p.target.z;
                
                // 呼吸效果
                const breathe = 1 + Math.sin(this.time * 2) * 0.01;
                tx *= breathe; ty *= breathe; tz *= breathe;

                // 简单的 Ease out
                cx += (tx - cx) * 0.1;
                cy += (ty - cy) * 0.1;
                cz += (tz - cz) * 0.1;
                
                // 如果是 PHOTO 模式，可能需要改变 target 位置形成平面
                // 这里暂时保持 3D 形态展示颜色，或者你可以把 target 改成平面的
            }
            
            positions[i3] = cx;
            positions[i3+1] = cy;
            positions[i3+2] = cz;
        }
        
        this.geometry.attributes.position.needsUpdate = true;
        
        // 3. 氛围粒子 (雪花) 下落
        if (this.ambientSystem) {
             const apos = this.ambientSystem.geometry.attributes.position.array;
             for(let i=0; i<apos.length/3; i++) {
                 apos[i*3+1] -= 0.2; // 下落
                 if(apos[i*3+1] < -100) apos[i*3+1] = 100; // 循环
             }
             this.ambientSystem.geometry.attributes.position.needsUpdate = true;
        }
    }
}