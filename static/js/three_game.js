let scene, camera, renderer;
let ball, fielders = [], bowler, batsman = [], pitch, stumps = [];
let score = 0, overs = 0, ballsBowled = 0, wickets = 0;

init();
animate();

function init() {
  console.log("Three.js initialized");

  // Scene & Camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x112211);

  camera = new THREE.PerspectiveCamera(75, document.getElementById("three-container").clientWidth / 500, 0.1, 1000);
  camera.position.set(0, 100, 200);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  const container = document.getElementById("three-container");
  renderer.setSize(container.clientWidth, 500);
  container.appendChild(renderer.domElement);

  // Ground (3D Oval Field)
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 90, 60, 0, Math.PI * 2, false, 0);
  const fieldMesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ color: 0x228833, side: THREE.DoubleSide })
  );
  fieldMesh.rotation.x = -Math.PI / 2;
  scene.add(fieldMesh);

  // Pitch
  pitch = new THREE.Mesh(
    new THREE.BoxGeometry(20, 1, 80),
    new THREE.MeshStandardMaterial({ color: 0xb57f43 })
  );
  pitch.position.y = 0.5;
  scene.add(pitch);

  // Stumps (three stumps)
  const stumpMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  for (let i = -5; i <= 5; i += 5) {
    let stump = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 10), stumpMat);
    stump.position.set(i, 5, -40);
    scene.add(stump);
    stumps.push(stump);
  }

  // Ball
  ball = new THREE.Mesh(
    new THREE.SphereGeometry(2, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  ball.position.set(0, 2, 30);
  ball.userData = { vx: 0, vz: 0, launched: false };
  scene.add(ball);

  // Fielders (as spheres; later you may load GLTF models)
  const fielderMat = new THREE.MeshStandardMaterial({ color: 0x2196f3 });
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * 2 * Math.PI;
    const radius = 70;
    const fielder = new THREE.Mesh(new THREE.SphereGeometry(3), fielderMat);
    fielder.position.set(Math.cos(angle) * radius, 2, Math.sin(angle) * radius);
    scene.add(fielder);
    fielders.push(fielder);
  }

  // Batsman (simple: legs + head)
  const batMat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 12), batMat);
  legs.position.set(0, 6, 38);
  const head = new THREE.Mesh(new THREE.SphereGeometry(3), batMat);
  head.position.set(0, 15, 38);
  scene.add(legs);
  scene.add(head);
  batsman.push(legs, head);

  // Bowler (simple sphere)
  const bowlerMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
  bowler = new THREE.Mesh(new THREE.SphereGeometry(4), bowlerMat);
  bowler.position.set(0, 4, 100);
  scene.add(bowler);

  // Lighting
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(0, 100, 100);
  scene.add(light);

  // Event listener for ball launch
  document.addEventListener("keydown", launchBall);
}

function launchBall(e) {
  if (e.code === "Space" && !ball.userData.launched) {
    // Animate bowler run-up
    bowler.position.z = 100;
    const runUp = setInterval(() => {
      bowler.position.z -= 4;
      if (bowler.position.z <= 40) {
        clearInterval(runUp);
        throwBall();
      }
    }, 50);
  }
}

function throwBall() {
  // Set ball velocity (random slight horizontal variation)
  ball.userData.vx = (Math.random() - 0.5) * 2;
  ball.userData.vz = -4;
  ball.userData.launched = true;

  // Update match statistics
  ballsBowled++;
  if (ballsBowled % 6 === 0) overs++;
  updateScoreboard();

  // Optional: Call the AI field prediction (dummy example)
  // You could send shot parameters to your Flask endpoint /predict_field
  fetch("/predict_field", { 
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shot: { vx: ball.userData.vx, vz: ball.userData.vz }})
  })
  .then(response => response.json())
  .then(data => {
    // Data might contain field position adjustments
    // For demo, we adjust fielders slightly based on predicted optimal positions
    if (data.positions) {
      data.positions.forEach((pos, i) => {
        if (fielders[i]) {
          fielders[i].position.x = pos.x;
          fielders[i].position.z = pos.z;
        }
      });
    }
  })
  .catch(err => console.error("AI prediction error:", err));
}

function updateScoreboard() {
  document.getElementById("over-count").innerText = `${overs}.${ballsBowled % 6}`;
  document.getElementById("score").innerText = score;
  document.getElementById("wickets").innerText = wickets;
}

function animate() {
  requestAnimationFrame(animate);

  if (ball.userData.launched) {
    ball.position.x += ball.userData.vx;
    ball.position.z += ball.userData.vz;

    // Animate fielders chasing the ball
    fielders.forEach(f => {
      const dx = ball.position.x - f.position.x;
      const dz = ball.position.z - f.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 2) {
        f.position.x += (dx / dist) * 0.5;
        f.position.z += (dz / dist) * 0.5;
      }
      // Runout detection: if any fielder gets within 5 units while ball is in "running zone"
      if (dist < 5 && ball.position.z > -20 && ball.position.z < 20) {
        wickets++;
        updateScoreboard();
        ball.userData.launched = false;
        resetBall();
        console.log("Runout!");
        return;
      }
    });

    // Boundary check: if ball is outside the field boundary (ellipse based)
    // We use a simple check based on ellipse formula: (x^2/a^2) + (z^2/b^2) > 1
    const a = 90, b = 60;
    const normX = ball.position.x;
    const normZ = ball.position.z;
    if ((normX * normX) / (a * a) + (normZ * normZ) / (b * b) > 1) {
      // Ball reached boundary: determine run (4 or 6)
      const run = Math.random() < 0.5 ? 4 : 6;
      score += run;
      updateScoreboard();
      ball.userData.launched = false;
      resetBall();
    }
  }
  renderer.render(scene, camera);
}

function resetBall() {
  ball.position.set(0, 2, 30);
  ball.userData.vx = 0;
  ball.userData.vz = 0;
  ball.userData.launched = false;
}


