// --- Configuration ---
const COLORS = {
    bg: 0x2D2D3A,
    pink: 0xFFB7B2,
    blue: 0xA2E1DB,
    yellow: 0xE2F0CB,
    white: 0xFFFFFF,
    darkIcon: 0x4A4A5E
};

// 修改点 1：将积木总数改为 10
const SHAPE_COUNT = 10;

// --- Audio ---
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
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.linearRampToValueAtTime(1000, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);
    }
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
}

// --- Game Logic ---
const game = {
    players: [],
    totalPlayers: 2,
    currIdx: 0,
    remaining: 0,
    startTime: 0,
    timerInterval: null,
    
    screens: {
        setup: document.getElementById('screen-setup'),
        ready: document.getElementById('screen-ready'),
        hud: document.getElementById('hud'),
        transition: document.getElementById('screen-transition'),
        leaderboard: document.getElementById('screen-leaderboard')
    },

    showScreen: (name) => {
        ['setup', 'ready', 'transition', 'leaderboard'].forEach(key => {
            if (game.screens[key]) game.screens[key].classList.remove('active');
        });
        if (game.screens.hud) game.screens.hud.style.display = 'none';

        if (name === 'hud') {
            game.screens.hud.style.display = 'flex';
        } else if (game.screens[name]) {
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
        game.players[game.currIdx] = { name: nameInput, time: 0 };
        
        // Reset Game Data
        game.remaining = SHAPE_COUNT;
        document.getElementById('hud-remaining').innerText = game.remaining;
        
        game.showScreen('hud');
        
        // Spawn shapes
        scene3D.clearShapes();
        scene3D.spawnShapes(SHAPE_COUNT);
        
        // Start Stopwatch
        game.startTime = Date.now();
        clearInterval(game.timerInterval);
        
        game.timerInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - game.startTime) / 1000;
            document.getElementById('hud-timer').innerText = elapsed.toFixed(1) + 's';
        }, 100);
    },

    onShapeSorted: () => {
        game.remaining--;
        document.getElementById('hud-remaining').innerText = game.remaining;
        playSound('pop');
        
        if (game.remaining <= 0) {
            game.endRound();
        }
    },

    endRound: () => {
        clearInterval(game.timerInterval);
        const elapsed = (Date.now() - game.startTime) / 1000;
        game.players[game.currIdx].time = elapsed;
        
        document.getElementById('round-time').innerText = elapsed.toFixed(2) + 's';
        
        // 修改点 2：判断是否为最后一位玩家，改变按钮文案
        const btn = document.getElementById('btn-next-player');
        if (game.currIdx + 1 >= game.totalPlayers) {
            btn.innerText = "🏆 View Results";
            btn.style.backgroundColor = COLORS.yellow; // 可选：让按钮变个色提示结束
            btn.style.color = "#555";
        } else {
            btn.innerText = "Next Player";
            btn.style.backgroundColor = ""; // 重置颜色
            btn.style.color = "";
        }

        game.showScreen('transition');
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
        
        const sorted = [...game.players].sort((a,b) => a.time - b.time);
        const container = document.getElementById('podium-container');
        container.innerHTML = '';
        
        const order = [1, 0, 2];
        order.forEach(rankIdx => {
            if(sorted[rankIdx]) {
                const p = sorted[rankIdx];
                const div = document.createElement('div');
                div.className = `podium-step rank-${rankIdx+1}`;
                div.innerHTML = `
                    <div class="podium-name">${p.name}</div>
                    <div class="podium-bar">${rankIdx+1}</div>
                    <div class="podium-score">${p.time.toFixed(2)}s</div>
                `;
                container.appendChild(div);
            }
        });
    }
};

// UI Listeners
let tempPlayers = 2;
window.updatePlayers = (delta) => {
    tempPlayers = Math.max(1, Math.min(10, tempPlayers + delta));
    document.getElementById('player-count-display').innerText = tempPlayers;
};
document.getElementById('btn-setup-confirm').onclick = () => { game.totalPlayers = tempPlayers; game.startPlayerPrep(); };
document.getElementById('btn-start-game').onclick = game.startRound;
document.getElementById('btn-next-player').onclick = game.nextPlayer;


// --- Three.js Logic ---
const canvas = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.bg);
scene.fog = new THREE.Fog(COLORS.bg, 20, 50);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 1, 100);
camera.position.set(0, 5, 20);
camera.lookAt(0, 1, 0); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
canvas.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 12, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

const matBase = { roughness: 1.0, metalness: 0.0 };
const mats = {
    pink: new THREE.MeshStandardMaterial({ color: COLORS.pink, ...matBase }),
    blue: new THREE.MeshStandardMaterial({ color: COLORS.blue, ...matBase }),
    yellow: new THREE.MeshStandardMaterial({ color: COLORS.yellow, ...matBase }),
    white: new THREE.MeshStandardMaterial({ color: COLORS.white, ...matBase }),
    icon: new THREE.MeshBasicMaterial({ color: COLORS.darkIcon })
};

const shapes = [];
const particles = [];
const targets = [];

function createTarget(x, type) {
    const group = new THREE.Group();
    group.position.set(x, -3.5, 0);

    const geo = new THREE.BoxGeometry(2.2, 1.2, 2.2);
    const mesh = new THREE.Mesh(geo, mats.white);
    mesh.receiveShadow = true;
    group.add(mesh);

    let iconGeo;
    if (type === 'cube') iconGeo = new THREE.PlaneGeometry(1, 1);
    if (type === 'cone') iconGeo = new THREE.CircleGeometry(0.6, 3);
    if (type === 'sphere') iconGeo = new THREE.CircleGeometry(0.5, 32);

    const icon = new THREE.Mesh(iconGeo, mats.icon);
    icon.rotation.x = -Math.PI / 2;
    icon.position.y = 0.61;
    if (type === 'cone') icon.rotation.z = Math.PI;
    group.add(icon);

    scene.add(group);
    targets.push({ type, x, mesh: group });
}

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: COLORS.bg, roughness: 1 })
);
floor.rotation.x = -Math.PI/2;
floor.position.y = -5;
floor.receiveShadow = true;
scene.add(floor);

createTarget(-3, 'cube');
createTarget(0, 'cone');
createTarget(3, 'sphere');

const scene3D = {
    spawnShapes: (count) => {
        const types = ['cube', 'cone', 'sphere'];
        
        for(let i=0; i<count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            let geo, mat;
            
            if (type === 'cube') { geo = new THREE.BoxGeometry(0.8, 0.8, 0.8); mat = mats.blue; }
            if (type === 'cone') { geo = new THREE.ConeGeometry(0.5, 1, 32); mat = mats.pink; }
            if (type === 'sphere') { geo = new THREE.SphereGeometry(0.5, 32, 32); mat = mats.yellow; }

            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            
            const posX = (Math.random() - 0.5) * 8;
            const posY = 2.5 + Math.random() * 4;
            const posZ = (Math.random() - 0.5) * 2;
            
            mesh.position.set(posX, posY, posZ);
            mesh.rotation.set(Math.random(), Math.random(), Math.random());
            
            mesh.userData = { type, originalPos: mesh.position.clone(), isReturning: false };
            
            scene.add(mesh);
            shapes.push(mesh);
        }
    },

    clearShapes: () => {
        shapes.forEach(s => scene.remove(s));
        shapes.length = 0;
    },

    createExplosion: (pos, color) => {
        for(let i=0; i<8; i++) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), new THREE.MeshBasicMaterial({color}));
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

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let draggedObject = null;

function onDown(x, y) {
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(shapes);

    if (intersects.length > 0) {
        draggedObject = intersects[0].object;
        draggedObject.userData.isReturning = false;
    }
}

function onMove(x, y) {
    if (!draggedObject) return;

    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersectPoint = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    raycaster.ray.intersectPlane(plane, intersectPoint);
    
    if (intersectPoint) {
        draggedObject.position.copy(intersectPoint);
        draggedObject.position.z = 1;
        draggedObject.rotation.x += 0.05;
        draggedObject.rotation.y += 0.05;
    }
}

function onUp() {
    if (!draggedObject) return;

    let match = false;
    for (const t of targets) {
        const dx = draggedObject.position.x - t.x;
        const dy = draggedObject.position.y - t.mesh.position.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 1.8 && draggedObject.userData.type === t.type) {
            match = true;
            game.onShapeSorted();
            
            scene3D.createExplosion(draggedObject.position, draggedObject.material.color);
            scene.remove(draggedObject);
            shapes.splice(shapes.indexOf(draggedObject), 1);
            
            t.mesh.scale.set(1.2, 0.8, 1.2);
            break;
        }
    }

    if (!match) {
        draggedObject.userData.isReturning = true;
    }

    draggedObject = null;
}

window.addEventListener('mousedown', e => onDown(e.clientX, e.clientY));
window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
window.addEventListener('mouseup', onUp);
window.addEventListener('touchstart', e => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
window.addEventListener('touchmove', e => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
window.addEventListener('touchend', onUp);

function animate() {
    requestAnimationFrame(animate);

    shapes.forEach(s => {
        if (s === draggedObject) return;
        if (s.userData.isReturning) {
            s.position.lerp(s.userData.originalPos, 0.1);
            if (s.position.distanceTo(s.userData.originalPos) < 0.1) s.userData.isReturning = false;
        } else {
            s.position.y += Math.sin(Date.now() * 0.002 + s.position.x * 10) * 0.002;
            s.rotation.z += 0.002;
        }
    });

    targets.forEach(t => t.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1));

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.vel);
        p.scale.multiplyScalar(0.92);
        p.userData.life -= 0.05;
        if (p.userData.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

game.startSetup();
animate();