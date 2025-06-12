import {OrbitControls} from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set background color
scene.background = new THREE.Color(0x000000);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

// Create basketball court
function createBasketballCourt() {
  // Court floor - just a simple brown surface
  const courtGeometry = new THREE.BoxGeometry(30, 0.2, 15);
  const courtMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xc68642,  // Brown wood color
    shininess: 50
  });
  const court = new THREE.Mesh(courtGeometry, courtMaterial);
  court.receiveShadow = true;
  scene.add(court);

  addLines();
  addBasketballHoops();
  addTPointLines();
  addBasketBall();
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
  scene.add(centerLine);

    // Add center circle using RingGeometry
  const innerRadius = 1.6;
  const outerRadius = 1.8;
  const segments = 128;

  const centerCircleGeometry = new THREE.RingGeometry(innerRadius, outerRadius, segments);
  const centerCircle = new THREE.Mesh(centerCircleGeometry, lineMaterial);
  centerCircle.rotation.x = -Math.PI / 2; // Lay flat
  centerCircle.position.set(0, 0.11, 0); // Slightly above court to avoid z-fighting
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
scene.add(arcMesh);

const arcMeshMirror = new THREE.Mesh(arcGeometry, arcMaterial);
arcMeshMirror.rotation.x = -Math.PI / 2; // Flat on court
arcMeshMirror.rotation.y = Math.PI;     // Face the opposite direction
arcMeshMirror.position.set(13.5, 0.11, 0); // Opposite side of court
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
scene.add(leftLine);

const rightLine = new THREE.Mesh(verticalGeometry, verticalMaterial);
rightLine.position.set(-15 + lineLength / 2, 0.11, 6.69); // mirror on Z
scene.add(rightLine);

const leftLineMirror = new THREE.Mesh(verticalGeometry, verticalMaterial);
leftLineMirror.position.set(15 - lineLength / 2, 0.11, -6.69);
scene.add(leftLineMirror);

const rightLineMirror = new THREE.Mesh(verticalGeometry, verticalMaterial);
rightLineMirror.position.set(15 - lineLength / 2, 0.11, 6.69);
scene.add(rightLineMirror);
}

function addBasketBall() {
  const ballRadius = 0.3;
  const ballGeometry = new THREE.SphereGeometry(ballRadius, 64, 64);

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Fill orange background
  ctx.fillStyle = '#FF6600';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add leather grain noise for bumpiness (gray-scale)
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 1.5 + 0.5;

    const gray = 150 + Math.random() * 50;
    ctx.fillStyle = `rgba(${gray},${gray},${gray},0.1)`;
    ctx.fillRect(x, y, size, size);
  }

  // Draw basketball seam lines as vertical and horizontal stripes to wrap nicely
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';

  // Vertical seams (simulate main black lines)
  for (let i = 0; i <= 6; i++) {
    const x = (canvas.width / 6) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  //OPTIONAL UNTIL BETTER SOLUTION
   // Horizontal seam (center line around the ball)
  //const centerY = canvas.height / 2; // Calculate the vertical center of the canvas
  //ctx.beginPath();
  //ctx.moveTo(0, centerY); // Start at the left edge of the canvas
  //ctx.lineTo(canvas.width, centerY); // Draw a line to the right edge of the canvas
  //ctx.stroke();

  // Create texture & bump map (using same canvas)
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  // For bump map, create a grayscale version (you can simplify by reusing canvas)
  // Here just reuse same texture for bump for quick effect (not ideal)
  const bumpMap = new THREE.CanvasTexture(canvas);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    bumpMap: bumpMap,
    bumpScale: 0.05,
    roughness: 0.8,
    metalness: 0.0,
  });

  const basketball = new THREE.Mesh(ballGeometry, material);
  basketball.position.set(0, ballRadius + 0.1, 0);
  basketball.castShadow = true;
  scene.add(basketball);
}

function addBasketballHoops() {
  // 1. Constants
  const hoopHeight = 3.048;                // 10 ft
  const courtWidth = 30;                  // from your court geometry
  const halfCourt = courtWidth / 2;       // 7.5 m
  const backboardWidth = 1.8;              // NBA spec ≈ 1.83 m
  const backboardHeight = 1.05;            // ≈ 1.05 m
  const backboardThickness = 0.05;
  const rimRadius = 0.45;                  // ≈ 0.45 m
  const rimTubeRadius = 0.02;
  const netDepth = 0.5;                    // how far the net hangs down
  const poleRadius = 0.1;
  const poleHeight = hoopHeight;     // pole goes up just under rim
  const armLength = 1.0; 

  // Materials
  const boardMaterial   = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, shininess: 100 });
  const rimMaterial     = new THREE.MeshPhongMaterial({ color: 0xff4500 });
  const supportMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });

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
    
    scene.add(rim);

    // Net 
    const netGroup = new THREE.Group();
    const segments     = 16;
    const rimCenterX   = xSign * (halfCourt - armLength - rimRadius + backboardThickness*2);
    const yTop         = hoopHeight - rimTubeRadius;
    const bottomHeight = yTop - netDepth;
    const topRadius    = rimRadius;
    const bottomRadius = rimRadius * 0.9;  // slightly tighter at bottom

    // Net - top & bottom ring points
    const topPoints    = [];
    const bottomPoints = [];
    for (let i = 0; i < segments; i++) {
      const θ  = (i/segments) * Math.PI * 2;
      const cx = Math.cos(θ), sz = Math.sin(θ);
      topPoints.push(
        new THREE.Vector3(rimCenterX + cx*topRadius,    yTop,        sz*topRadius)
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
      netGroup.add(new THREE.Line(g, rimMaterial));
    }

    // Net - forward diagonal mesh lines
    for (let i = 0; i < segments; i++) {
      const top = topPoints[i];
      const bottom = bottomPoints[(i+1)%segments];
      const g = new THREE.BufferGeometry().setFromPoints([top, bottom]);
      netGroup.add(new THREE.Line(g, rimMaterial));
    }

    // Net - backward diagonal mesh lines
    for (let i = 0; i < segments; i++) {
      const top = topPoints[i];
      const bottom = bottomPoints[(i-1+segments)%segments];
      const g = new THREE.BufferGeometry().setFromPoints([top, bottom]);
      netGroup.add(new THREE.Line(g,rimMaterial))
    }
    
    scene.add(netGroup);

    // Pole
    const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 12);
    const pole = new THREE.Mesh(poleGeo, supportMaterial);
    pole.position.set(
      xSign * (halfCourt + poleRadius),
      poleHeight / 2,
      0
    );
    scene.add(pole);

    // Arm
    const armGeo = new THREE.BoxGeometry(armLength, 0.1, 0.1);
    const arm = new THREE.Mesh(armGeo, supportMaterial);
    arm.position.set(xSign * (halfCourt - poleRadius * 2 - 0.2), hoopHeight - 0.07,0);
    scene.add(arm);
  }
  
  //create two hoops
  createHoop(+1);
  createHoop(-1);
}

function createBleachers() {
  const bleacherMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
  
  const courtHalfWidth = 7.5;    // adapt to your court size
  const stepDepth     = 1.5;     // how “deep” each row is
  const stepHeight    = 0.5;     // how tall each row is
  const stepWidth     = 30;      // spans the length of the court
  const numRows       = 8;       // number of seating tiers

  for (let side of [1, -1]) {    // build on both sides (front/back)
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

function makeScoreTexture(text) {
  // first measure how wide the text will be...
  const temp = document.createElement('canvas');
  const tctx = temp.getContext('2d');
  tctx.font = 'bold 200px Arial';
  const textWidth = tctx.measureText(text).width;

  // give yourself a little padding on each side
  const padding = 50;
  const width  = Math.ceil(textWidth + padding*2);
  const height = 300; // enough for your 200px font

  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // draw centered
  ctx.font         = 'bold 200px Arial';
  ctx.fillStyle    = 'lime';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width/2, height/2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createScoreboard() {
  const tex = makeScoreTexture('00 : 00');
  const mat = new THREE.SpriteMaterial({ map: tex });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(10, 4, 1);
  sprite.position.set(0, 8, -25);
  scene.add(sprite);
}

// Create all elements
createBasketballCourt();

// Set camera position for better view
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 15, 30);
camera.applyMatrix4(cameraTranslate);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// Instructions display
const instructionsElement = document.createElement('div');
instructionsElement.style.position = 'absolute';
instructionsElement.style.bottom = '20px';
instructionsElement.style.left = '20px';
instructionsElement.style.color = 'white';
instructionsElement.style.fontSize = '16px';
instructionsElement.style.fontFamily = 'Arial, sans-serif';
instructionsElement.style.textAlign = 'left';
instructionsElement.innerHTML = `
  <h3>Controls:</h3>
  <p>O - Toggle orbit camera</p>
`;
document.body.appendChild(instructionsElement);

// Handle key events
function handleKeyDown(e) {
  if (e.key === "o") {
    isOrbitEnabled = !isOrbitEnabled;
  }
}

document.addEventListener('keydown', handleKeyDown);

// Animation function
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls
  controls.enabled = isOrbitEnabled;
  controls.update();
  
  renderer.render(scene, camera);
}

animate();