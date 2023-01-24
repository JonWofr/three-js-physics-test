import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import CANNON from 'cannon';
import GUI from 'lil-gui';
import hitSoundUrl from './assets/sounds/hit.mp3';
import floorTextureDiffuseUrl from './assets/textures/laminate_floor_03_diff_1k.jpg';
import floorTextureAmbientOcclusionUrl from './assets/textures/laminate_floor_03_ao_1k.jpg';
import floorTextureRoughnessUrl from './assets/textures/laminate_floor_03_rough_1k.jpg';
import floorTextureNormalUrl from './assets/textures/laminate_floor_03_nor_gl_1k.jpg';
import skyBoxTopUrl from './assets/textures/py.png';
import skyBoxBottomUrl from './assets/textures/ny.png';
import skyBoxLeftUrl from './assets/textures/nx.png';
import skyBoxRightUrl from './assets/textures/px.png';
import skyBoxFrontUrl from './assets/textures/pz.png';
import skyBoxBackUrl from './assets/textures/nz.png';
import sphereTextureDiffuseUrl from './assets/textures/leather_white_diff_1k.jpg';
import sphereTextureAmbientOcclusionUrl from './assets/textures/leather_white_ao_1k.jpg';
import sphereTextureRoughnessUrl from './assets/textures/leather_white_rough_1k.jpg';

// Textures
const textureLoadingManager = new THREE.LoadingManager(
  () => console.log('Successfully loaded all textures'),
  undefined,
  (err) => console.error('An error occured trying to load the textures', err)
);
const textureLoader = new THREE.TextureLoader(textureLoadingManager);
const floorTextureDiffuse = textureLoader.load(floorTextureDiffuseUrl);
const floorTextureAmbientOcclusion = textureLoader.load(
  floorTextureAmbientOcclusionUrl
);
const floorTextureRoughness = textureLoader.load(floorTextureRoughnessUrl);
const floorTextureNormal = textureLoader.load(floorTextureNormalUrl);
const sphereTextureDiffuse = textureLoader.load(sphereTextureDiffuseUrl);
const sphereTextureAmbientOcclusion = textureLoader.load(
  sphereTextureAmbientOcclusionUrl
);
const sphereTextureRoughness = textureLoader.load(sphereTextureRoughnessUrl);
const cubeTextureLoader = new THREE.CubeTextureLoader(textureLoadingManager);
const cubeTexture = cubeTextureLoader.load([
  skyBoxRightUrl,
  skyBoxLeftUrl,
  skyBoxTopUrl,
  skyBoxBottomUrl,
  skyBoxFrontUrl,
  skyBoxBackUrl,
]);

const dimensions = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Scene
const scene = new THREE.Scene();
scene.background = cubeTexture;

// World
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Earth's gravity
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  dimensions.width / dimensions.height
);
camera.position.z = 4;
camera.position.x = 4;
camera.position.y = 3;
camera.lookAt(new THREE.Vector3(0, 0, 0));

const canvas = document.querySelector('.webgl');

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
});
renderer.setSize(dimensions.width, dimensions.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

// Responsiveness
window.addEventListener('resize', () => {
  dimensions.width = window.innerWidth;
  dimensions.height = window.innerHeight;
  camera.aspect = dimensions.width / dimensions.height;
  camera.updateProjectionMatrix();
  renderer.setSize(dimensions.width, dimensions.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Cannon materials
const defaultMaterial = new CANNON.Material('default');
const concretePlasticContactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.1,
    restitution: 0.7,
  }
);
world.addContactMaterial(concretePlasticContactMaterial);

// Sounds
const hitSound = new Audio(hitSoundUrl);
const playSound = (impact) => {
  const impactVelocity = impact.contact.getImpactVelocityAlongNormal();
  if (impactVelocity < 0.5) return;
  hitSound.currentTime = 0;
  hitSound.volume = Math.min(impactVelocity / 5, 1);
  hitSound.play();
};

// Objects
// One geometry and one material for all meshes to improve performance
const sphereGeometry = new THREE.SphereGeometry();
const sphereMaterial = new THREE.MeshStandardMaterial();
sphereMaterial.map = sphereTextureDiffuse;
sphereMaterial.aoMap = sphereTextureAmbientOcclusion;
sphereMaterial.roughnessMap = sphereTextureRoughness;
sphereMaterial.roughness = 0.75;

const objects = [];
const addSphere = (radius, position) => {
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.scale.set(radius, radius, radius);
  sphere.position.copy(position);
  sphere.castShadow = true;
  sphere.geometry.setAttribute(
    'uv2',
    new THREE.BufferAttribute(sphere.geometry.attributes.uv.array, 2)
  );
  scene.add(sphere);

  const sphereBody = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(),
    shape: new CANNON.Sphere(radius),
    material: defaultMaterial,
  });
  sphereBody.position.copy(position);
  sphereBody.addEventListener('collide', playSound);
  world.addBody(sphereBody);
  objects.push({
    mesh: sphere,
    body: sphereBody,
  });
};
addSphere(0.5, { x: 0, y: 2, z: 0 });

const boxDimensions = {
  width: 5,
  height: 0.1,
  depth: 5,
};
const boxGeometry = new THREE.BoxGeometry(
  boxDimensions.width,
  boxDimensions.height,
  boxDimensions.depth,
  100,
  100
);
const boxMaterial = new THREE.MeshStandardMaterial();
boxMaterial.map = floorTextureDiffuse;
boxMaterial.aoMap = floorTextureAmbientOcclusion;
boxMaterial.roughnessMap = floorTextureRoughness;
boxMaterial.roughness = 1;
boxMaterial.normalMap = floorTextureNormal;
boxMaterial.normalScale = new THREE.Vector2(4, 4);
const box = new THREE.Mesh(boxGeometry, boxMaterial);
box.receiveShadow = true;
box.geometry.setAttribute(
  'uv2',
  new THREE.BufferAttribute(box.geometry.attributes.uv.array, 2)
);
box.position.y = -0.05;
scene.add(box);

const planeBody = new CANNON.Body({
  mass: 0,
  position: new CANNON.Vec3(0, -boxDimensions.height, 0),
  shape: new CANNON.Box(
    new CANNON.Vec3(
      boxDimensions.width / 2,
      boxDimensions.depth / 2,
      boxDimensions.height
    )
  ),
  material: defaultMaterial,
});
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
world.addBody(planeBody);

// Reset
const reset = () => {
  objects.forEach((object) => {
    scene.remove(object.mesh);
    object.body.removeEventListener('collide', playSound);
    world.removeBody(object.body);
  });
  objects.splice(0, objects.length);
};

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Lights and shadows
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(-2, 2, 3);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.top = 2;
directionalLight.shadow.camera.right = 3;
directionalLight.shadow.camera.bottom = -2;
directionalLight.shadow.camera.left = -3;
directionalLight.shadow.camera.far = 8;
directionalLight.shadow.camera.near = 1;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Helpers
// const axesHelper = new THREE.AxesHelper(2);
// scene.add(axesHelper);

// const directionalLightHelper = new THREE.DirectionalLightHelper(
//   directionalLight
// );
// scene.add(directionalLightHelper);

// const directionalLightCameraHelper = new THREE.CameraHelper(
//   directionalLight.shadow.camera
// );
// scene.add(directionalLightCameraHelper);

// GUI
const parameters = {
  addSpheres: () => {
    const count = 5;
    const yOffsets = [];
    for (let i = 0; i < count; i++) {
      let yOffset;
      while (true) {
        yOffset = Math.floor(Math.random() * count);
        if (!yOffsets.includes(yOffset)) {
          yOffsets.push(yOffset);
          break;
        }
      }
      addSphere(0.2 + Math.random() * 0.3, {
        x: (Math.random() - 0.5) * 2,
        y: 2 + yOffset,
        z: (Math.random() - 0.5) * 2,
      });
    }
  },
  reset,
};
const gui = new GUI();
gui.add(parameters, 'addSpheres').name('Add 5 spheres');
gui.add(parameters, 'reset').name('Reset');

// Game loop
const clock = new THREE.Clock();
let previousElapsedTime = 0;
const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousElapsedTime;
  previousElapsedTime = elapsedTime;

  objects.forEach((object) => object.mesh.position.copy(object.body.position));

  controls.update();

  // Update physics
  // 60 frames per second (will also work on higher frame screens)
  world.step(1 / 60, deltaTime, 3);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
};
tick();
