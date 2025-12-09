// --- Configuration ---
const COLORS = {
    bg: 0x2D2D3A,
    pink: 0xFFB7B2,
    blue: 0xA2E1DB,
    yellow: 0xE2F0CB,
    white: 0xFFFFFF,
    darkIcon: 0x4A4A5E
};

// --- Audio (Synthesized "Pop" Sounds) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    if (type === 'pop') {
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
    }
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
}

// --- Game State Management ---
const game = {
    players: [],
    totalPlayers: 2,
    currIdx: 0,
    score: 0,
    timerInterval: null,
    
    // UI Helpers
    screens: {
        setup: document.getElementById('screen-setup'),
        ready: document.getElementById('screen-ready'),
        hud: document.getElementById('hud'),
        transition: document.getElementById('screen-transition'),
        leaderboard: document.getElementById('screen-leaderboard')
    },

    // 修复的核心部分：正确管理显示状态
    showScreen: (name) => {
        // 1. 先隐藏所有 UI 面板 (移除 active 类，并强制隐藏)
        ['setup', 'ready', 'transition', 'leaderboard'].forEach(key => {
            if (game.screens[key]) {
                game.screens[key].classList.remove('active');
            }
        });

        // 2. 单独隐藏 HUD (因为它不是 .card 类型)
        if (game.screens.hud) {
            game.screens.hud.style.display = 'none';
        }

        // 3. 显示目标面板
        if (name === 'hud') {
            game.screens.hud.style.display = 'flex';
        } else if (game.screens[name]) {
            // 只添加类，不设置行内样式 style.display
            game.screens[name].classList.add('active');
        }
    },

    startSetup: () => {
        game.showScreen('setup');
    },

    startPlayerPrep: () => {
        document.getElementById('input-name').value = `Player ${game.currIdx + 1}`;
        document.getElementById('ready-player-label').innerText = `Player ${game.currIdx + 1}`;
        game.showScreen('ready');
    },

    startRound: () => {
        const nameInput = document.getElementById('input-name').value || `P${game.currIdx+1}`;
        game.players[game.currIdx] = { name: nameInput, score: 0 };
        
        game.score = 0;
        document.getElementById('hud-score').innerText = '0';
        
        // 切换到 HUD 界面
        game.showScreen('hud');
        
        // 3D Scene Reset
        scene3D.spawnShapes(12); // Spawn initial batch
        
        // Timer
        let timeLeft = 60;
        document.getElementById('hud-timer').innerText = timeLeft;
        
        clearInterval(game.timerInterval);
        game.timerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('hud-timer').innerText = timeLeft;
            if(timeLeft <= 0) game.endRound();
        }, 1000);
    },

    addScore: () => {
        game.score += 10;
        document.getElementById('hud-score').innerText = game.score;
        playSound('pop');
        
        // Spawn a new one to replace
        scene3D.spawnOne();
    },

    endRound: () => {
        clearInterval(game.timerInterval);
        game.players[game.currIdx].score = game.score;
        
        document.getElementById('round-score').innerText = game.score;
        game.showScreen('transition');
        
        // Clean up scene
        scene3D.clearShapes();
    },

    nextPlayer: () => {
        game.currIdx++;
        if (game.currIdx < game.totalPlayers) {
            game.startPlayerPrep();
        } else {
            game.showLeaderboard();
        }
    },

    showLeaderboard: () => {
        game.showScreen('leaderboard');
        playSound('win');
        
        const sorted = [...game.players].sort((a,b) => b.score - a.score);
        const container = document.getElementById('podium-container');
        container.innerHTML = '';
        
        // Visual order: 2nd, 1st, 3rd
        const order = [1, 0, 2];
        order.forEach(rankIdx => {
            if(sorted[rankIdx]) {
                const p = sorted[rankIdx];
                const div = document.createElement('div');
                div.className = `podium-step rank-${rankIdx+1}`;
                div.innerHTML = `
                    <div class="podium-name">${p.name}</div>
                    <div class="podium-bar">${rankIdx+1}</div>
                    <div class="podium-score">${p.score}pts</div>
                `;
                container.appendChild(div);
            }
        });
    }
};

// UI Event Listeners
let tempPlayers = 2;
window.updatePlayers = (delta) => {
    tempPlayers = Math.max(1, Math.min(10, tempPlayers + delta));
    document.getElementById('player-count-display').innerText = tempPlayers;
};
document.getElementById('btn-setup-confirm').onclick = () => {
    game.totalPlayers = tempPlayers;
    game.startPlayerPrep();
};
document.getElementById('btn-start-game').onclick = game.startRound;
document.getElementById('btn-next-player').onclick = game.nextPlayer;


// --- Three.js Logic ---
const canvas = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.bg);
// Add gentle fog to blend floor
scene.fog = new THREE.Fog(COLORS.bg, 15, 30);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 1, 100);
camera.position.set(0, 8, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
canvas.appendChild(renderer.domElement);

// Lighting (Soft Studio Setup)
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// Materials (Matte Clay)
const matBase = { roughness: 1.0, metalness: 0.0 };
const mats = {
    pink: new THREE.MeshStandardMaterial({ color: COLORS.pink, ...matBase }),
    blue: new THREE.MeshStandardMaterial({ color: COLORS.blue, ...matBase }),
    yellow: new THREE.MeshStandardMaterial({ color: COLORS.yellow, ...matBase }),
    white: new THREE.MeshStandardMaterial({ color: COLORS.white, ...matBase }),
    icon: new THREE.MeshBasicMaterial({ color: COLORS.darkIcon })
};

// --- Game Objects ---
const shapes = [];
const particles = [];
const targets = [];

// Create Targets (Boxes)
function createTarget(x, type) {
    const group = new THREE.Group();
    group.position.set(x, 0, 0);

    // Box
    const geo = new THREE.BoxGeometry(2.5, 1.5, 2.5);
    const mesh = new THREE.Mesh(geo, mats.white);
    mesh.receiveShadow = true;
    mesh.position.y = 0.75; // Sit on floor
    group.add(mesh);

    // Icon (Procedural Geometry)
    let iconGeo;
    if (type === 'cube') iconGeo = new THREE.PlaneGeometry(1, 1);
    if (type === 'cone') iconGeo = new THREE.CircleGeometry(0.6, 3); // Triangle
    if (type === 'sphere') iconGeo = new THREE.CircleGeometry(0.5, 32); // Circle

    const icon = new THREE.Mesh(iconGeo, mats.icon);
    icon.rotation.x = -Math.PI / 2; // Flat on top
    icon.position.y = 1.51; // Slightly above box
    if (type === 'cone') icon.rotation.z = Math.PI;
    group.add(icon);

    scene.add(group);
    targets.push({ type, x, mesh: group });
}

// Floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: COLORS.bg, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

createTarget(-3, 'cube');
createTarget(0, 'cone');
createTarget(3, 'sphere');

// Shape Logic
const scene3D = {
    spawnOne: () => {
        const types = ['cube', 'cone', 'sphere'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let geo, mat;
        if (type === 'cube') { geo = new THREE.BoxGeometry(0.8, 0.8, 0.8); mat = mats.blue; }
        if (type === 'cone') { geo = new THREE.ConeGeometry(0.5, 1, 32); mat = mats.pink; }
        if (type === 'sphere') { geo = new THREE.SphereGeometry(0.5, 32, 32); mat = mats.yellow; }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        
        // Random Pos
        mesh.position.set((Math.random() - 0.5) * 8, 5, (Math.random() - 0.5) * 3 - 2);
        mesh.rotation.set(Math.random(), Math.random(), Math.random());
        
        // Store original spawn pos for spring back
        mesh.userData = { type, originalPos: mesh.position.clone(), velocity: 0 };
        
        scene.add(mesh);
        shapes.push(mesh);
    },

    spawnShapes: (count) => {
        for(let i=0; i<count; i++) scene3D.spawnOne();
    },

    clearShapes: () => {
        shapes.forEach(s => scene.remove(s));
        shapes.length = 0;
    },

    createExplosion: (pos, color) => {
        for(let i=0; i<10; i++) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({color}));
            p.position.copy(pos);
            p.position.x += (Math.random()-0.5);
            p.position.y += (Math.random()-0.5);
            p.userData = { 
                vel: new THREE.Vector3((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2),
                life: 1.0 
            };
            scene.add(p);
            particles.push(p);
        }
    }
};

// --- Interaction (Raycasting) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let draggedObject = null;
let dragOffset = new THREE.Vector3();

function onDown(x, y) {
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(shapes);

    if (intersects.length > 0) {
        draggedObject = intersects[0].object;
        
        // Calc offset to keep mouse relative to object center
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -draggedObject.position.z), intersectPoint);
        dragOffset.copy(intersectPoint).sub(draggedObject.position);
    }
}

function onMove(x, y) {
    if (!draggedObject) return;

    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersectPoint = new THREE.Vector3();
    
    // Drag on a plane closer to camera (Z=0 or so)
    raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), intersectPoint);
    
    if (intersectPoint) {
        draggedObject.position.copy(intersectPoint.sub(dragOffset));
        // Keep it above floor
        draggedObject.position.y = Math.max(0.5, draggedObject.position.y);
        draggedObject.rotation.x += 0.05;
        draggedObject.rotation.z += 0.05;
    }
}

function onUp() {
    if (!draggedObject) return;

    // Check Matches
    let match = false;
    for (const t of targets) {
        // Distance check (ignoring Y height mostly)
        const dx = draggedObject.position.x - t.x;
        const dz = draggedObject.position.z - 0; // Targets are at Z=0 mostly
        const dist = Math.sqrt(dx*dx + dz*dz);
        
        if (dist < 1.5 && draggedObject.userData.type === t.type) {
            match = true;
            game.addScore();
            scene3D.createExplosion(draggedObject.position, draggedObject.material.color);
            scene.remove(draggedObject);
            shapes.splice(shapes.indexOf(draggedObject), 1);
            
            // Box Bop Animation
            t.mesh.scale.set(1.2, 0.8, 1.2);
            break;
        }
    }

    // If no match, it will be handled in animation loop (spring back)
    if (!match) {
        draggedObject.userData.isReturning = true;
    }

    draggedObject = null;
}

// Mouse Events
window.addEventListener('mousedown', e => onDown(e.clientX, e.clientY));
window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
window.addEventListener('mouseup', onUp);

// Touch Events
window.addEventListener('touchstart', e => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
window.addEventListener('touchmove', e => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
window.addEventListener('touchend', onUp);

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // 1. Shapes Physics (Floating / Returning)
    shapes.forEach(s => {
        if (s === draggedObject) return;

        if (s.userData.isReturning) {
            // Spring back to start
            s.position.lerp(s.userData.originalPos, 0.1);
            if (s.position.distanceTo(s.userData.originalPos) < 0.1) {
                s.userData.isReturning = false;
            }
        } else {
            // Idle Float
            s.position.y += Math.sin(Date.now() * 0.002 + s.position.x) * 0.005;
            s.rotation.y += 0.01;
        }
    });

    // 2. Target Box Recovery (Elastic)
    targets.forEach(t => {
        t.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    });

    // 3. Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.vel);
        p.scale.multiplyScalar(0.9);
        p.userData.life -= 0.05;
        if (p.userData.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start
game.startSetup();
animate();