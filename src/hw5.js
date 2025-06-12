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

  // Note: All court lines, hoops, and other elements have been removed
  // Students will need to implement these features


  

  addLines();
  addBasketBall();
}

function addLines() {
  // Add center line (black line down the horizontal middle)
  const centerLineGeometry = new THREE.BoxGeometry(0.2, 0.01, 15);
  const centerLineMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x000000,  // Black color
    shininess: 100,   // High shininess value
    specular: 0x222222 // Subtle specular highlight
  });
  const centerLine = new THREE.Mesh(centerLineGeometry, centerLineMaterial);
  centerLine.position.set(0, 0.11, 0); // Position at the center of the court
  scene.add(centerLine);

    // Add center circle using RingGeometry
  const innerRadius = 1.6;
  const outerRadius = 1.8;
  const segments = 128;

  const centerCircleGeometry = new THREE.RingGeometry(innerRadius, outerRadius, segments);
  const centerCircleMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x000000,  // Black color
    shininess: 100,   // High shininess value
    specular: 0x222222 // Subtle specular highlight
  });
  const centerCircle = new THREE.Mesh(centerCircleGeometry, centerCircleMaterial);
  centerCircle.rotation.x = -Math.PI / 2; // Lay flat
  centerCircle.position.set(0, 0.11, 0); // Slightly above court to avoid z-fighting
  scene.add(centerCircle);
  const sideLineOneAGeometry = new THREE.BoxGeometry(8, 0.1, 0.1);
  const sideLineOneAMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x000000,  // Black color
    shininess: 100,   // High shininess value
    specular: 0x222222 // Subtle specular highlight
  });
  

/////////////////////////////////////////////////////////////////////////////

addTPointLines();
addBasketBall();



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
  color: 0x000000,
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
  color: 0x000000, 
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
  const loader = new THREE.TextureLoader();

  loader.load('/textures/Leather029_2K-JPG_Color.jpg', (texture) => {
    const ballRadius = 0.24;
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 64, 64);
    const ballMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0.0,
    });

    const basketball = new THREE.Mesh(ballGeometry, ballMaterial);
    basketball.position.set(0, ballRadius + 0.05, 0);
    basketball.castShadow = true;

    scene.add(basketball);
  });
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