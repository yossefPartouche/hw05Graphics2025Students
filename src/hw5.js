import {OrbitControls} from './OrbitControls.js'
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

// Physics constants
const GRAVITY     = -9.8;
const RESTITUTION = 0.6;
const BALL_RADIUS = 0.3;
const RIM_RADIUS = 0.45;

// Movement constants
const moveSpeed = 10;

// Globals
let ball;
let isOrbitEnabled = true;
const keyState = {};
const clock = new THREE.Clock();
let shotPower    = 0.5; // 50% default
const POWER_STEP = 0.02; // +/–2% per keypress
const MIN_POWER  = 0.0;
const MAX_POWER  = 1.0;
const MIN_SHOT_SPEED = 5;   // m/s at 0% power
const MAX_SHOT_SPEED = 15;  // m/s at 100% power
const RIM_TUBE_RADIUS = 0.02;
const FRICTION = 0.8;
const rimMeshes = []; // Array to store rim meshes for collision
const UP = new THREE.Vector3(0, 1, 0);

// — Shooting state & physics —
let ballLaunched = false;
let ballVelocity = new THREE.Vector3();
const hoopCenters = [];

// ── Scoring globals ──
let shotAttempts = 0;
let shotsMade = 0;
let totalScore = 0;
let hasScoredThisShot = false;
let prevBallY = BALL_RADIUS + 0.1;
let currentHoop = null;
let scoreSprite, scoreTexture, scoreCanvas, scoreCtx;
let comboStreak = 0;
let comboBonus  = 0;

// add sky background
const size = 512;                        
const skyCanvas = document.createElement('canvas');
skyCanvas.width = skyCanvas.height = size;
const ctx = skyCanvas.getContext('2d');

const grad = ctx.createLinearGradient(0, 0, 0, size);
grad.addColorStop(0, '#87CEEB');
grad.addColorStop(1, '#ffffff');  
ctx.fillStyle = grad;
ctx.fillRect(0, 0, size, size);

const skyTexture = new THREE.CanvasTexture(skyCanvas);
scene.background = skyTexture;

// add grass plane
const gsize = 200;
const groundGeo = new THREE.PlaneGeometry(gsize, gsize);
const groundMat = new THREE.MeshStandardMaterial({ 
  color: 0x444444,   
  side: THREE.DoubleSide
});

const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = - Math.PI / 2; 
ground.position.y = -0.01;         
ground.receiveShadow = true;        
scene.add(ground);

const cvs = document.createElement('canvas');
cvs.width = cvs.height = gsize;
const gctx = cvs.getContext('2d');
gctx.fillStyle = '#4A7C0E';
gctx.fillRect(0, 0, gsize, gsize);
gctx.strokeStyle = '#3A5F0B';
gctx.lineWidth = 1;
for (let i = 0; i < 800; i++) {
  const x = Math.random() * gsize;
  const y = Math.random() * gsize;
  const h = Math.random() * 12 + 4;
  gctx.beginPath();
  gctx.moveTo(x, y);
  gctx.lineTo(x + (Math.random() - 0.5) * 2, y - h);
  gctx.stroke();
}

const grassCanvasTex = new THREE.CanvasTexture(cvs);
grassCanvasTex.wrapS = grassCanvasTex.wrapT = THREE.RepeatWrapping;
grassCanvasTex.repeat.set(50, 50);
ground.material.map = grassCanvasTex;
ground.material.needsUpdate = true;

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

const hemi = new THREE.HemisphereLight(0xaaaaee /* sky color */, 0x444422 /* ground color */, 0.6 /* intensity */);
scene.add(hemi);

const spot = new THREE.SpotLight(0xffffff, 1);
spot.angle = Math.PI / 6;
spot.penumbra = 0.2;
spot.decay = 2;
spot.distance = 50;
spot.position.set(0, 10, 10);
spot.target.position.set(13.5,3,0);
spot.shadow.mapSize.width = spot.shadow.mapSize.height = 1024;
scene.add(spot, spot.target);

const spot2 = new THREE.SpotLight(0xffffff, 1);
spot2.angle = Math.PI / 6;
spot2.penumbra = 0.2;
spot2.decay = 2;
spot2.distance = 50;
spot2.position.set(0, 10, 10);
spot2.target.position.set(-13.5,3,0);
spot2.shadow.mapSize.width = spot2.shadow.mapSize.height = 1024;
scene.add(spot2, spot2.target);

// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;
spot.castShadow = true
spot2.castShadow = true

const d = 16
const s = d * 1.2;
directionalLight.shadow.camera.left   = -s;
directionalLight.shadow.camera.right  =  s;
directionalLight.shadow.camera.top    =  s;
directionalLight.shadow.camera.bottom = -s;
directionalLight.shadow.camera.near   =  0.5;
directionalLight.shadow.camera.far    =  50;

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

const loader = new THREE.TextureLoader();

// add wood floor
const woodColor = loader.load('/textures/wood_floor_diff_4k.jpg');
const woodNormal = loader.load('/textures/wood_floor_nor_gl_4k.jpg');
const woodRough = loader.load('/textures/wood_floor_rough_4k.jpg');

woodColor.encoding = THREE.sRGBEncoding;
woodNormal.encoding = THREE.LinearEncoding;
woodRough.encoding  = THREE.LinearEncoding;

// make the wood repeat instead of stretch
[woodColor, woodNormal, woodRough].forEach(tex => {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
});

// Create basketball court
function createBasketballCourt() {
  const courtGeometry = new THREE.BoxGeometry(30, 0.2, 15);
  const courtMaterial = new THREE.MeshPhongMaterial({ 
    map: woodColor,
    normalMap: woodNormal,
    roughnessMap: woodRough,
    roughness: 0.6,
    metalness: 0.1
  });

  const court = new THREE.Mesh(courtGeometry, courtMaterial);
  court.receiveShadow = true;
  scene.add(court);

  addLines();
  addBasketballHoops();
  addTPointLines();
  addBasketBall2();
  createBleachers();
  createScoreboard();
}

function addLines() {
  // Add center line (black line down the horizontal middle)
  const centerLineGeometry = new THREE.BoxGeometry(0.2, 0.01, 15);
  const lineMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffffff,  // white color
    shininess: 100,   // High shininess value
    specular: 0x222222 // Subtle specular highlight
  });

  const centerLine = new THREE.Mesh(centerLineGeometry, lineMaterial);
  centerLine.position.set(0, 0.11, 0); // Position at the center of the court
  centerLine.receiveShadow = true;
  scene.add(centerLine);

  // Add center circle using RingGeometry
  const innerRadius = 1.6;
  const outerRadius = 1.8;
  const segments = 128;

  const centerCircleGeometry = new THREE.RingGeometry(innerRadius, outerRadius, segments);
  const centerCircle = new THREE.Mesh(centerCircleGeometry, lineMaterial);
  centerCircle.rotation.x = -Math.PI / 2; // Lay flat
  centerCircle.position.set(0, 0.11, 0); // Slightly above court to avoid z-fighting
  centerCircle.receiveShadow = true;
  scene.add(centerCircle);

}

function addTPointLines () {
  const arcRadius = 6.75;
  const arcWidth = 0.2;
  const innerRadius = arcRadius - arcWidth / 2;
  const outerRadius = arcRadius + arcWidth / 2;
  const thetaStart = -Math.PI / 2 + 0.1;
  const thetaLength = Math.PI - 0.2;

  const arcGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64, 1, thetaStart, thetaLength);
  const arcMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    shininess: 100,
    specular: 0x222222
  });
  const arcMesh = new THREE.Mesh(arcGeometry, arcMaterial);
  arcMesh.rotation.x = -Math.PI / 2; // Lay flat on court
  arcMesh.position.set(-13.5, 0.11, 0); // Adjust hoopX for baseline + offset
  arcMesh.receiveShadow = true;
  scene.add(arcMesh);

  const arcMeshMirror = new THREE.Mesh(arcGeometry, arcMaterial);
  arcMeshMirror.rotation.x = -Math.PI / 2; // Flat on court
  arcMeshMirror.rotation.y = Math.PI;     // Face the opposite direction
  arcMeshMirror.position.set(13.5, 0.11, 0); // Opposite side of court
  arcMeshMirror.receiveShadow = true;
  scene.add(arcMeshMirror);

  const lineLength = 2.5;      // Length of the line along X
  const lineThickness = 0.2;   // Thickness across Z
  const lineHeight = 0.01;

  const verticalGeometry = new THREE.BoxGeometry(lineLength, lineHeight, lineThickness);
  const verticalMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffffff, 
    shininess: 100, 
    specular: 0x222222 
  });

  // Now these run along X instead of Z
  const leftLine = new THREE.Mesh(verticalGeometry, verticalMaterial);
  leftLine.position.set(-15 + lineLength / 2, 0.11, -6.69); // adjust Z to arc radius
  leftLine.receiveShadow = true;
  scene.add(leftLine);

  const rightLine = new THREE.Mesh(verticalGeometry, verticalMaterial);
  rightLine.position.set(-15 + lineLength / 2, 0.11, 6.69); // mirror on Z
  rightLine.receiveShadow = true;
  scene.add(rightLine);

  const leftLineMirror = new THREE.Mesh(verticalGeometry, verticalMaterial);
  leftLineMirror.position.set(15 - lineLength / 2, 0.11, -6.69);
  leftLineMirror.receiveShadow = true;
  scene.add(leftLineMirror);

  const rightLineMirror = new THREE.Mesh(verticalGeometry, verticalMaterial);
  rightLineMirror.position.set(15 - lineLength / 2, 0.11, 6.69);
  rightLineMirror.receiveShadow = true;
  scene.add(rightLineMirror);
}

function addBasketBall2() {
  const ballRadius = 0.3;
  const ballGeometry = new THREE.SphereGeometry(ballRadius, 128, 128);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('/textures/balldimpled2.png', (texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 16;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      bumpMap: texture,       // optionally reuse for bump
      bumpScale: 0.05,
      roughness: 0.8,
      metalness: 0.0,
    });

    const basketball = new THREE.Mesh(ballGeometry, material);
    basketball.position.set(0, ballRadius + 0.1, 0);
    basketball.castShadow = true;
    basketball.receiveShadow = true;

    ball = basketball;

    scene.add(basketball);
  });
}

function addBasketballHoops() {
  // Constants
  const hoopHeight = 3.048;
  const courtWidth = 30;                  
  const halfCourt = courtWidth / 2;       
  const backboardWidth = 1.8;              
  const backboardHeight = 1.05;     
  const backboardThickness = 0.05;
  const rimRadius = 0.45;          
  const rimTubeRadius = 0.02;
  const netDepth = 0.5;            
  const poleRadius = 0.1;
  const poleHeight = hoopHeight;
  const armLength = 1.0; 

  // Materials
  const boardMaterial   = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, shininess: 100 });
  const rimMaterial     = new THREE.MeshPhongMaterial({ color: 0xff4500 });
  const netMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  
  const supportColor    = loader.load('/textures/Metal_Color.jpg');
  const supportNormal   = loader.load('/textures/Metal_Normal.jpg');
  const supportRough    = loader.load('/textures/Metal_Roughness.jpg');
  const supportMaterial = new THREE.MeshStandardMaterial({
    map:          supportColor,
    normalMap:    supportNormal,
    roughnessMap: supportRough,
    metalness:    0.7,
    roughness:    0.8
  });

  // create hoop at x sign position
  function createHoop(xSign) {
    // Backboard
    const boardGeometry = new THREE.BoxGeometry(backboardWidth, backboardHeight, backboardThickness);
    const backboard = new THREE.Mesh(boardGeometry, boardMaterial);
    backboard.position.set(
      xSign * (halfCourt - armLength + backboardThickness*2),
      poleHeight + backboardHeight / 2 - 0.4,
      0
    );
    backboard.rotation.y = xSign * Math.PI/2;
    backboard.castShadow = true;
    backboard.receiveShadow = true;
    scene.add(backboard);

    //Rim
    const rimGeometry = new THREE.TorusGeometry(rimRadius, rimTubeRadius, 16, 100);
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(
      xSign * (halfCourt - armLength - rimRadius + backboardThickness*2),
      hoopHeight,
      0
    );

    rim.castShadow = true;
    rim.receiveShadow = true;
  
    scene.add(rim);

    hoopCenters.push(rim.position.clone());
    rimMeshes.push(rim);

    // Net 
    const netGroup = new THREE.Group();
    const segments     = 16;
    const rimCenterX   = xSign * (halfCourt - armLength - rimRadius + backboardThickness*2);
    const yTop         = hoopHeight - rimTubeRadius;
    const bottomHeight = yTop - netDepth;
    const topRadius    = rimRadius;
    const bottomRadius = rimRadius * 0.7;  // slightly tighter at bottom

    // Net - top & bottom ring points
    const topPoints    = [];
    const bottomPoints = [];
    for (let i = 0; i < segments; i++) {
      const θ  = (i/segments) * Math.PI * 2;
      const cx = Math.cos(θ), sz = Math.sin(θ);
      topPoints.push(
        new THREE.Vector3(rimCenterX + cx*topRadius, yTop, sz*topRadius)
      );
      bottomPoints.push(
        new THREE.Vector3(rimCenterX + cx*bottomRadius, bottomHeight, sz*bottomRadius)
      );
    }

    // Net - bottom ring (horizontal circle)
    for (let i = 0; i < segments; i++) {
      const p1 = bottomPoints[i];
      const p2 = bottomPoints[(i+1)%segments];
      const g = new THREE.BufferGeometry().setFromPoints([p1,p2]);
      netGroup.add(new THREE.Line(g, netMaterial));
    }

    // Net - forward diagonal mesh lines
    for (let i = 0; i < segments; i++) {
      const top = topPoints[i];
      const bottom = bottomPoints[(i+1)%segments];
      const g = new THREE.BufferGeometry().setFromPoints([top, bottom]);
      netGroup.add(new THREE.Line(g, netMaterial));
    }

    // Net - backward diagonal mesh lines
    for (let i = 0; i < segments; i++) {
      const top = topPoints[i];
      const bottom = bottomPoints[(i-1+segments)%segments];
      const g = new THREE.BufferGeometry().setFromPoints([top, bottom]);
      const line = new THREE.Line(g,netMaterial)
      line.castShadow = true
      netGroup.add(line)
    }
    
    netGroup.castShadow = true;
    netGroup.receiveShadow = true;
    scene.add(netGroup);

    // Pole
    const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 12);
    const pole = new THREE.Mesh(poleGeo, supportMaterial);
    pole.position.set(
      xSign * (halfCourt + poleRadius),
      poleHeight / 2,
      0
    );
    pole.castShadow = true;
    pole.receiveShadow = true;
    scene.add(pole);

    // Arm
    const armGeo = new THREE.BoxGeometry(armLength, 0.1, 0.1);
    const arm = new THREE.Mesh(armGeo, supportMaterial);
    arm.position.set(xSign * (halfCourt - poleRadius * 2 - 0.2), hoopHeight - 0.07,0);
    arm.castShadow = true;
    arm.receiveShadow = true;
    scene.add(arm);
  }
  
  //create two hoops
  createHoop(+1);
  createHoop(-1);
}

function createBleachers() {
  const seatColor    = loader.load('/textures/Metal_Color.jpg');
  const seatNormal   = loader.load('/textures/Metal_Normal.jpg');
  const seatRough    = loader.load('/textures/Metal_Roughness.jpg');
  const bleacherMaterial = new THREE.MeshStandardMaterial({
    map:          seatColor,
    normalMap:    seatNormal,
    roughnessMap: seatRough,
    metalness:    0.7,
    roughness:    0.8
  });
  
  const courtHalfWidth = 7.5; 
  const stepDepth     = 1.5; // how “deep” each row is
  const stepHeight    = 0.5; // how tall each row is
  const stepWidth     = 30;
  const numRows       = 8; // number of seating tiers

  // build on both sides (front/back)
  for (let side of [1, -1]) {  
    for (let i = 0; i < numRows; i++) {
      const geom = new THREE.BoxGeometry(
        stepWidth,
        stepHeight,
        stepDepth
      );
      const mesh = new THREE.Mesh(geom, bleacherMaterial);
      mesh.castShadow    = true;
      mesh.receiveShadow = true;

      // position:
      mesh.position.set(
        0,
        // raise each row by its half‐height plus the stack below
        (i + 0.5) * stepHeight,
        side * (courtHalfWidth + stepDepth/2 + i * stepDepth)
      );

      scene.add(mesh);
    }
  }
}

function createScoreboard() {
  // Create a persistent canvas
  scoreCanvas = document.createElement('canvas');
  const padding = 50;
  scoreCanvas.width  = 200; 
  scoreCanvas.height = 100;
  scoreCtx = scoreCanvas.getContext('2d');

  // Draw initial text
  drawScoreOnCanvas("00 : 00");

  scoreTexture = new THREE.CanvasTexture(scoreCanvas);
  scoreTexture.needsUpdate = true;

  // Create sprite
  const mat = new THREE.SpriteMaterial({ map: scoreTexture });
  scoreSprite = new THREE.Sprite(mat);
  scoreSprite.scale.set(10, 4, 1);
  scoreSprite.position.set(0, 8, -25);
  scene.add(scoreSprite);
}

function drawScoreOnCanvas(text) {
  const w = scoreCanvas.width, h = scoreCanvas.height;
  // background
  scoreCtx.fillStyle = 'black';
  scoreCtx.fillRect(0, 0, w, h);

  // text
  scoreCtx.font         = 'bold 48px Arial';
  scoreCtx.fillStyle    = 'lime';
  scoreCtx.textAlign    = 'center';
  scoreCtx.textBaseline = 'middle';
  scoreCtx.fillText(text, w/2, h/2);
}

// Create all elements
createBasketballCourt();

// Set camera position for better view
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 15, 30);
camera.applyMatrix4(cameraTranslate);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);

// Instructions display
const instructionsElement = document.createElement('div');
instructionsElement.style.position = 'absolute';
instructionsElement.style.bottom = '20px';
instructionsElement.style.left   = '20px';
instructionsElement.style.top    = 'auto';
instructionsElement.style.right  = 'auto';
instructionsElement.style.color = 'white';
instructionsElement.style.fontSize = '16px';
instructionsElement.style.fontFamily = 'Arial, sans-serif';
instructionsElement.style.textAlign = 'left';
instructionsElement.innerHTML = `
  <h3>Controls:</h3>
  <p>O - Toggle orbit camera</p>
`;
instructionsElement.innerHTML = `
  <h3 style="margin:0 0 5px;">Controls</h3>
  <ul style="list-style:none; padding:0; margin:0; line-height:1.5;">
    <li>⬅️/➡️/⬆️/⬇️ : Move ball</li>
    <li>🔋 W / S     : Adjust power</li>
    <li>🚀 Space     : Shoot</li>
    <li>🔄 R         : Reset</li>
    <li>📷 O         : Camera</li>
  </ul>
`;

instructionsElement.style.background   = 'rgba(0, 0, 0, 0.6)';
instructionsElement.style.padding      = '10px 15px';
instructionsElement.style.borderRadius = '8px';
instructionsElement.style.boxShadow    = '0 0 10px rgba(0,0,0,0.5)';
instructionsElement.style.lineHeight   = '1.4';
document.body.appendChild(instructionsElement);

// Power UI
const powerContainer = document.createElement('div');
powerContainer.style.position = 'absolute';
powerContainer.style.bottom   = '200px';
powerContainer.style.left     = '20px';
powerContainer.style.width    = '200px';
powerContainer.style.height   = '20px';
powerContainer.style.border   = '2px solid white';
powerContainer.style.background = 'rgba(0,0,0,0.6)';
powerContainer.style.borderRadius = '6px';
powerContainer.style.boxShadow = '0 0 8px rgba(0,0,0,0.4)';

const powerBar = document.createElement('div');
powerBar.id = 'powerBar';
powerBar.style.height = '100%';
powerBar.style.width  = `${shotPower * 100}%`; 
powerBar.style.background = 'lime';

powerContainer.appendChild(powerBar);
document.body.appendChild(powerContainer);

const powerLabel = document.createElement('div');
powerLabel.style.position    = 'absolute';
powerLabel.style.bottom      = '204px';
powerLabel.style.left        = '30px';
powerLabel.style.color       = 'white';
powerLabel.style.fontSize    = '14px';
powerLabel.style.fontFamily  = 'Arial, sans-serif';
powerLabel.innerText         = `Power: ${(shotPower * 100).toFixed(0)}%`;
document.body.appendChild(powerLabel);

function updatePowerUI() {
  const pct = Math.round(shotPower * 100);
  powerBar.style.width  = `${pct}%`;
  powerLabel.innerText  = `Power: ${pct}%`;
}

function computeShotSpeed() {
  return MIN_SHOT_SPEED + (MAX_SHOT_SPEED - MIN_SHOT_SPEED) * shotPower;
}

// ── Stats UI ──
const statsContainer = document.createElement('div');
statsContainer.style.position = 'absolute';
statsContainer.style.top    = '20px';
statsContainer.style.right  = '20px';
statsContainer.style.left   = 'auto';
statsContainer.style.bottom = 'auto';
statsContainer.style.color    = 'white';
statsContainer.style.fontSize = '16px';
statsContainer.style.fontFamily = 'Arial, sans-serif';
statsContainer.innerHTML = `
  <div>Score: <span id="score">0</span></div>
  <div>Attempts: <span id="attempts">0</span></div>
  <div>Made: <span id="made">0</span></div>
  <div>Accuracy: <span id="accuracy">0%</span></div>
  <div>Combo: <span id="combo">0</span></div>
`;
statsContainer.style.background    = 'rgba(0, 0, 0, 0.6)';
statsContainer.style.padding       = '10px 15px';
statsContainer.style.borderRadius  = '8px';
statsContainer.style.boxShadow     = '0 0 10px rgba(0,0,0,0.5)';
statsContainer.style.lineHeight    = '1.4';
statsContainer.style.textAlign     = 'left';

document.body.appendChild(statsContainer);

function updateStatsUI() {
  document.getElementById('score').innerText    = totalScore;
  document.getElementById('attempts').innerText = shotAttempts;
  document.getElementById('made').innerText     = shotsMade;
  const pct = shotAttempts > 0
    ? Math.round((shotsMade / shotAttempts) * 100)
    : 0;
  document.getElementById('accuracy').innerText = `${pct}%`;
  document.getElementById('combo').innerText = comboStreak;
  // update the canvas scoreboard:
  const minutes = String(Math.floor(totalScore/60)).padStart(2,'0');
  const seconds = String(totalScore % 60).padStart(2,'0');
  const newText = `${minutes} : ${seconds}`;  // or `${totalScore}` if you just want points
  drawScoreOnCanvas(newText);
  scoreTexture.needsUpdate = true;
}

// ── Message UI ──
const messageEl = document.createElement('div');
messageEl.style.position   = 'absolute';
messageEl.style.top        = '60px';
messageEl.style.left       = '50%';
messageEl.style.transform  = 'translateX(-50%)';
messageEl.style.padding    = '10px 20px';
messageEl.style.color      = 'black';
messageEl.style.background = 'lime';
messageEl.style.fontSize   = '18px';
messageEl.style.fontFamily = 'Arial, sans-serif';
messageEl.style.opacity    = '0';
messageEl.style.transition = 'opacity 0.5s';
messageEl.style.background = '#ffd700';   // gold for visibility
messageEl.style.color      = '#000';      // black text
messageEl.style.padding    = '8px 12px';
messageEl.style.borderRadius = '6px';
messageEl.style.boxShadow  = '0 0 8px rgba(0,0,0,0.4)';
messageEl.style.fontWeight = 'bold';
messageEl.style.top        = '50%';
messageEl.style.left       = '50%';
messageEl.style.transform  = 'translate(-50%, -50%)';

document.body.appendChild(messageEl);

let messageTimeout;
function showMessage(text, success = true) {
  clearTimeout(messageTimeout);
  messageEl.innerText = text;
  messageEl.style.background = success ? '#7CFC00' : '#FF4500';
  messageEl.style.opacity    = '1';
  messageTimeout = setTimeout(() => {
    messageEl.style.opacity = '0';
  }, 2000);
}

function shootBall() {
  if (!ball || ballLaunched) return;

  // mark this shot attempt  
  shotAttempts++;
  hasScoredThisShot = false;
  updateStatsUI();

  // 2) Pick & record the nearest hoop
  currentHoop = hoopCenters.reduce((c0, c1) =>
    ball.position.distanceToSquared(c1) < ball.position.distanceToSquared(c0)
      ? c1
      : c0,
    hoopCenters[0]
  );

  // 3) Initialize prevBallY for scoring logic
  prevBallY   = ball.position.y;
  
  ballLaunched = true;

  // Choose nearest hoop
  const target = hoopCenters.reduce(
    (c0, c1) =>
      ball.position.distanceToSquared(c1) < ball.position.distanceToSquared(c0)
        ? c1
        : c0,
    hoopCenters[0]
  );

  // Horizontal direction (X/Z)
  const dir = new THREE.Vector3(
    target.x - ball.position.x,
    0,
    target.z - ball.position.z
  ).normalize();

  // Total shot speed from power
  const speed = computeShotSpeed();

  // Compute “clearance” arc angle
  const dxz     = Math.hypot(target.x - ball.position.x, target.z - ball.position.z);
  const apexH   = target.y + 1.5; 
  const angle   = Math.atan2(apexH - ball.position.y, dxz);

  // Split into velocity components
  ballVelocity.x = speed * Math.cos(angle) * dir.x;
  ballVelocity.z = speed * Math.cos(angle) * dir.z;
  ballVelocity.y = speed * Math.sin(angle);
}

function resetBall() {
  if (!ball) return;
  ballLaunched    = false;
  ballVelocity.set(0, 0, 0);
  shotPower       = 0.5;
  updatePowerUI();
  ball.position.set(0, BALL_RADIUS + 0.1, 0);
}

// Handle key events
function handleKeyDown(e) {
  switch(e.key.toLowerCase()) {
    case 'o':
      isOrbitEnabled = !isOrbitEnabled;
      break;

    case 'w':
      shotPower = Math.min(MAX_POWER, shotPower + POWER_STEP);
      updatePowerUI();
      break;

    case 's':
      shotPower = Math.max(MIN_POWER, shotPower - POWER_STEP);
      updatePowerUI();
      break;
    
    case ' ':
      shootBall();
      break;
    
    case 'r':
      resetBall();
      break;

    // spacebar, R, etc. will go here in later phases…
  }
}

document.addEventListener('keydown', handleKeyDown);

// track arrow‐key presses for movement
document.addEventListener('keydown',  e => { keyState[e.key] = true;  });
document.addEventListener('keyup',    e => { keyState[e.key] = false; });


// Animation function
function animate() {
  requestAnimationFrame(animate);

  // Get time since last frame
  const delta = clock.getDelta();
  const v = moveSpeed * delta;  

  if (ball) {
    if (!ballLaunched) {
      if (keyState['ArrowLeft'])  ball.position.x -= v;
      if (keyState['ArrowRight']) ball.position.x += v;
      if (keyState['ArrowUp'])    ball.position.z -= v;
      if (keyState['ArrowDown'])  ball.position.z += v;

      // clamp to court bounds
      const r = BALL_RADIUS;
      const maxX = 15 - r, minX = -15 + r;
      const maxZ =  7.5 - r, minZ = -7.5 + r;
      ball.position.x = THREE.MathUtils.clamp(ball.position.x, minX, maxX);
      ball.position.z = THREE.MathUtils.clamp(ball.position.z, minZ, maxZ);

      // Compute horizontal move direction
      const hDir = new THREE.Vector3(
        (keyState['ArrowRight'] ? 1 : 0) - (keyState['ArrowLeft'] ? 1 : 0),
        0,
        (keyState['ArrowDown']  ? 1 : 0) - (keyState['ArrowUp']   ? 1 : 0)
      );
      
      if (hDir.lengthSq() > 0) {
        hDir.normalize();
        // rotation axis = hDir × UP
        const axis = new THREE.Vector3().crossVectors(hDir, UP).normalize();
        // angular speed ω = v / r  (rad/sec)
        const ω = moveSpeed / BALL_RADIUS;
        // rotate by ω·delta
        ball.rotateOnAxis(axis, ω * delta);
      }

    } else {
      // apply gravity
      ballVelocity.y += GRAVITY * delta;
      
      // move ball by its velocity vector
      ball.position.addScaledVector(ballVelocity, delta);
      
      // Ground collision
      if (ball.position.y <= BALL_RADIUS) {
        ball.position.y      = BALL_RADIUS;
        ballVelocity.y       = -ballVelocity.y * RESTITUTION;
        ballVelocity.x      *= FRICTION;
        ballVelocity.z      *= FRICTION;
      }

      // Rim collision
      rimMeshes.forEach(rim => {
        // vector from rim center to ball
        const toBall = new THREE.Vector3().subVectors(ball.position, rim.position);
        const dist   = toBall.length();
        if (dist <= BALL_RADIUS + RIM_TUBE_RADIUS) {
          // reflect velocity about the collision normal
          const normal = toBall.normalize();
          const vDotN  = ballVelocity.dot(normal);
          // v' = v - 2(v·n)n, then apply restitution
          ballVelocity.addScaledVector(normal, -2 * vDotN);
          ballVelocity.multiplyScalar(RESTITUTION);
        }
      });

      if (ballVelocity.lengthSq() > 0) {
        // direction of travel
        const vDir = ballVelocity.clone().normalize();
        // axis = vDir × UP
        const axis = new THREE.Vector3().crossVectors(vDir, UP).normalize();
        // angular speed from |v|/r
        const ω    = ballVelocity.length() / BALL_RADIUS;
        ball.rotateOnAxis(axis, ω * delta);
      }

      if (!hasScoredThisShot) {
        // 1) Check downward motion through rim plane
        const rimY = currentHoop.y;      
        const prevYAbove = prevBallY > rimY;
        const nowBelow = ball.position.y <= rimY;
        const movingDown = ballVelocity.y < 0;

        // 2) Horizontal proximity to center
        const dx = ball.position.x - currentHoop.x;
        const dz = ball.position.z - currentHoop.z;
        const horizDist = Math.hypot(dx, dz);

        // rimRadius from your createBasketballCourt()
        if (prevYAbove && nowBelow && movingDown && horizDist <= RIM_RADIUS) {
          // Successful shot!
          hasScoredThisShot = true;
          shotsMade++;
          // bump up streak & compute bonus
          comboStreak++;
          comboBonus = comboStreak - 1;          
          // award base points + bonus
          totalScore += 2 + comboBonus;
          if (comboBonus > 0) {
            showMessage(`🏀 SHOT MADE! Combo ${comboStreak} (+${comboBonus})`, true);
          } else {
            showMessage(`🏀 SHOT MADE!`, true);
          }
          updateStatsUI();
        } else if (ball.position.y <= BALL_RADIUS) {
          hasScoredThisShot = true;  // end this attempt
          showMessage("❌ MISSED SHOT", false);

          // reset combo
          comboStreak = 0;
          comboBonus  = 0;
          updateStatsUI();
        }
      }
      // store for next frame’s comparison
      prevBallY = ball.position.y;
    }
  }

  controls.enabled = isOrbitEnabled;
  controls.update();
  renderer.render(scene, camera);
}


animate();