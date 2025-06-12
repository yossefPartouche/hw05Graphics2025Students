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

  const sideLineOneAGeometry = new THREE.BoxGeometry(8, 0.1, 0.1);
  const sideLineOneA = new THREE.Mesh(sideLineOneAGeometry, lineMaterial);
  sideLineOneA.position.set(11.0, 0.09, 5); // Position at the center of the court
  scene.add(sideLineOneA);
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