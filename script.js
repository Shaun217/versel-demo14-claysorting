// --- Configuration ---
const COLORS = {
    bg: 0x1A2F23,   // Pine Green
    red: 0xD42E2E,  // Christmas Red
    gold: 0xF1C40F, // Bell Gold
    green: 0x27AE60,// Tree Green
    brown: 0x8B4513,// Tree Trunk
    white: 0xFDF8F5,
    darkIcon: 0x1a1a1a // Deep dark silhouette
};

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
        osc.frequency.linearRampToValueAtTime(1000, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.8);
    }
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.8);
}

// --- Game Logic ---
const game = {
    playerName: "Player",
    remaining: 0,
    startTime: 0,
    timerInterval: null,
    
    screens: {
        start: document.getElementById('screen-start'),
        hud: document.getElementById('hud'),
        result: document.getElementById('screen-result')
    },

    showScreen: (name) => {
        Object.values(game.screens).forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none'; 
        });
        
        if(name === 'hud') {
            game.screens.hud.style.display = 'flex';
        } else {
            game.screens[name].style.display = 'flex';
            setTimeout(() => game.screens[name].classList.add('active'), 10);
        }
    },

    init: () => {
        game.showScreen('start');
    },

    startRound: () => {
        const nameInput = document.getElementById('input-name').value;
        game.playerName = nameInput || "Santa's Helper";
        
        game.remaining = SHAPE_COUNT;
        document.getElementById('hud-remaining').innerText = game.remaining;
        
        game.showScreen('hud');
        
        scene3D.clearShapes();
        scene3D.spawnShapes(SHAPE_COUNT);
        
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
        
        document.getElementById('result-name').innerText = game.playerName;
        document.getElementById('result-time').innerText = elapsed.toFixed(2) + 's';
        
        game.showScreen('result');
        playSound('win');
    }
};

document.getElementById('btn-start').onclick = game.startRound;

// --- Three.js Setup ---
const canvas = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.bg);
scene.fog = new THREE.Fog(COLORS.bg, 20, 50);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 1, 100);
camera.position.set(0, 8, 18); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
canvas.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 12, 8);
dirLight.castShadow = true;
scene.add(dirLight);

// Materials
const mats = {
    red: new THREE.MeshStandardMaterial({ color: COLORS.red, roughness: 0.6, metalness: 0.1 }),
    gold: new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.4, metalness: 0.6 }),
    green: new THREE.MeshStandardMaterial({ color: COLORS.green, roughness: 0.8, metalness: 0.0 }),
    brown: new THREE.MeshStandardMaterial({ color: COLORS.brown, roughness: 0.9 }),
    white: new THREE.MeshStandardMaterial({ color: COLORS.white, roughness: 1.0 }),
    icon: new THREE.MeshBasicMaterial({ color: COLORS.darkIcon })
};

// --- Objects Builder ---
const shapes = [];
const particles = [];
const targets = [];

// 1. Christmas Tree
function buildTree() {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.6), mats.brown);
    trunk.position.y = -0.7;
    trunk.castShadow = true;
    group.add(trunk);
    const sizes = [[0.7, 0.8, -0.3], [0.55, 0.7, 0.1], [0.35, 0.6, 0.5]];
    sizes.forEach(s => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(s[0], s[1], 8), mats.green);
        cone.position.y = s[2];
        cone.castShadow = true;
        group.add(cone);
    });
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.12), mats.gold);
    star.position.y = 0.85;
    group.add(star);
    return group;
}

// 2. Bell
function buildBell() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.6, 0.8, 16), mats.gold);
    body.castShadow = true;
    group.add(body);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 4, 16), mats.gold);
    rim.rotation.x = Math.PI/2;
    rim.position.y = -0.4;
    group.add(rim);
    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.2), mats.gold);
    clapper.position.y = -0.4;
    group.add(clapper);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.04, 4, 16), mats.gold);
    ring.position.y = 0.45;
    group.add(ring);
    return group;
}

// 3. Ball
function buildBall() {
    const group = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 32), mats.red);
    ball.castShadow = true;
    group.add(ball);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16), mats.gold);
    cap.position.y = 0.6;
    group.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 4, 16), mats.gold);
    ring.position.y = 0.7;
    group.add(ring);
    return group;
}

function createGeometry(type) {
    if (type === 'tree') return buildTree();
    if (type === 'bell') return buildBell();
    if (type === 'ball') return buildBall();
    return new THREE.Group();
}

// --- Target Boxes (Improved Silhouettes) ---
function createTarget(x, type) {
    const group = new THREE.Group();
    group.position.set(x, -3.5, 0);

    const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), mats.white);
    box.receiveShadow = true;
    group.add(box);

    let icon;
    const shape = new THREE.Shape();

    if (type === 'tree') {
        // Tree Silhouette
        shape.moveTo(0, 0.7); 
        shape.lineTo(0.2, 0.4); shape.lineTo(0.1, 0.4);
        shape.lineTo(0.35, 0.0); shape.lineTo(0.15, 0.0);
        shape.lineTo(0.5, -0.4); shape.lineTo(0.1, -0.4);
        shape.lineTo(0.1, -0.6); shape.lineTo(-0.1, -0.6);
        shape.lineTo(-0.1, -0.4); shape.lineTo(-0.5, -0.4);
        shape.lineTo(-0.15, 0.0); shape.lineTo(-0.35, 0.0);
        shape.lineTo(-0.1, 0.4); shape.lineTo(-0.2, 0.4);
        icon = new THREE.Mesh(new THREE.ShapeGeometry(shape), mats.icon);
    } 
    else if (type === 'bell') {
        // IMPROVED Bell Silhouette (Curvier)
        shape.moveTo(0, 0.55); // Top Ring center
        // Draw Ring
        shape.absarc(0, 0.55, 0.12, Math.PI, 0); 
        
        // Bell Body Start
        shape.lineTo(0.15, 0.45);
        // Curve body outwards (Bezier)
        shape.bezierCurveTo(0.2, 0.25, 0.4, -0.1, 0.55, -0.35);
        
        // Bottom Clapper Area
        shape.lineTo(0.15, -0.35);
        // Clapper bulb
        shape.absarc(0, -0.35, 0.15, 0, Math.PI);
        
        // Left side return
        shape.lineTo(-0.55, -0.35);
        // Curve body back up
        shape.bezierCurveTo(-0.4, -0.1, -0.2, 0.25, -0.15, 0.45);
        
        icon = new THREE.Mesh(new THREE.ShapeGeometry(shape), mats.icon);
    } 
    else {
        // Ball Silhouette
        shape.absarc(0, -0.1, 0.5, 0, Math.PI * 2);
        // Cap
        shape.moveTo(-0.15, 0.35);
        shape.lineTo(0.15, 0.35);
        shape.lineTo(0.15, 0.55);
        shape.lineTo(-0.15, 0.55);
        // Ring
        shape.moveTo(0, 0.65);
        shape.absarc(0, 0.65, 0.1, 0, Math.PI*2);
        
        icon = new THREE.Mesh(new THREE.ShapeGeometry(shape), mats.icon);
    }

    icon.rotation.x = -Math.PI / 2;
    icon.position.y = 0.61;
    // Scale down a bit to fit on box
    icon.scale.set(0.9, 0.9, 0.9);
    group.add(icon);

    scene.add(group);
    targets.push({ type, x, mesh: group });
}

createTarget(-3, 'tree');
createTarget(0, 'bell');
createTarget(3, 'ball');

// --- Spawning ---
const scene3D = {
    spawnShapes: (count) => {
        const types = ['tree', 'bell', 'ball'];
        for(let i=0; i<count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const meshGroup = createGeometry(type);
            
            // Spawn Height: 1.0 to 4.5 (Safe zone)
            const posX = (Math.random() - 0.5) * 8; 
            const posY = 1.0 + Math.random() * 3.5;  
            const posZ = (Math.random() - 0.5) * 2; 
            
            meshGroup.position.set(posX, posY, posZ);
            meshGroup.rotation.set(Math.random(), Math.random(), Math.random());
            meshGroup.userData = { type, originalPos: meshGroup.position.clone(), isReturning: false };
            
            scene.add(meshGroup);
            shapes.push(meshGroup);
        }
    },

    clearShapes: () => {
        shapes.forEach(s => scene.remove(s));
        shapes.length = 0;
    },

    createExplosion: (pos, color) => {
        for(let i=0; i<12; i++) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial({color}));
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

// --- Interaction ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let draggedObject = null;

function onDown(x, y) {
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(shapes, true);

    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while(obj.parent && obj.parent.type !== 'Scene') {
            if(obj.userData.type) break; 
            obj = obj.parent;
        }
        if(obj.userData && obj.userData.type) {
            draggedObject = obj;
            draggedObject.userData.isReturning = false;
        }
    }
}

function onMove(x, y) {
    if (!draggedObject) return;
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), intersectPoint);
    
    if (intersectPoint) {
        draggedObject.position.copy(intersectPoint);
        draggedObject.position.z = 2; 
        draggedObject.rotation.x += 0.05;
        draggedObject.rotation.z += 0.02;
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
            
            let c = COLORS.white;
            if(t.type==='tree') c = COLORS.green;
            if(t.type==='bell') c = COLORS.gold;
            if(t.type==='ball') c = COLORS.red;
            
            scene3D.createExplosion(draggedObject.position, c);
            scene.remove(draggedObject);
            shapes.splice(shapes.indexOf(draggedObject), 1);
            
            t.mesh.scale.set(1.1, 0.9, 1.1); 
            break;
        }
    }
    if (!match) draggedObject.userData.isReturning = true;
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
            s.position.y += Math.sin(Date.now() * 0.002 + s.position.x) * 0.005;
            s.rotation.y += 0.01;
        }
    });
    targets.forEach(t => t.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1));
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.vel);
        p.scale.multiplyScalar(0.9);
        p.userData.life -= 0.05;
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

game.init();
animate();