import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import ThreeTypeableText from "../"

var camera, scene, renderer, light, controls;

var elements = [];

var canvasWidth = window.innerWidth;
var canvasHeight = window.innerHeight;

function initThree()
{
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, canvasWidth / canvasHeight, 0.1, 1000);
    camera.position.set(0, 1, 10);
    camera.lookAt(scene.position);
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({ antialias : true });
    renderer.setClearColor(0x000000, 1);

    light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    renderer.setSize(canvasWidth, canvasHeight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableKeys = false

    document.body.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);

    var textureLoader = new THREE.TextureLoader();
    var floorTexture = textureLoader.load('./img/checkerboard.jpg');
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(10, 10);
    
    var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
    var floorGeometry = new THREE.PlaneGeometry(10, 10, 10, 10);
    var floor = new THREE.Mesh(floorGeometry, floorMaterial);
    
    floor.rotation.x = Math.PI / 2;

    scene.add(floor);
}

async function init()
{
    var fontLoader = new THREE.FontLoader();
    var font = await fontLoader.loadAsync('font/helvetiker.json');

    var textField = new ThreeTypeableText({
        camera: camera,
        font: font,
        string: 'Hello text!\nThree Typeable Text',
        material: new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }),
        align: 'center',
    });

    textField.group.position.setY(2)
    
    scene.add(textField.group);
    elements.push(textField);
}

function render()
{
    requestAnimationFrame(render);

    controls.update();

    for(let element of elements)
        element.updateCursor()

    renderer.render(scene, camera);
}

function onWindowResize()
{
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    camera.aspect = canvasWidth / canvasHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(canvasWidth, canvasHeight);
}

initThree()
init();
render();
