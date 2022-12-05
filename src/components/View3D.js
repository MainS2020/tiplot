import { useEffect, useRef } from "react";
import "../css/cesium.css";
import Entity from "../models/Entity.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function View3D({ socket }) {
  const mount = useRef(0);
  var renderer = new THREE.WebGLRenderer();
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(75, 1, 0.0001, 10000);
  camera.up.set(0, 0, -1);
  // camera.position.set(-20, 0, 0);

  camera.position.set(-15, -5, -10);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  const stalker = new THREE.Vector3();
  const entities = [];

  // Scene setup
  var gridx = new THREE.GridHelper(1000, 100);
  gridx.rotation.x = Math.PI / 2;
  scene.add(gridx);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  scene.add(new THREE.AxesHelper(5));

  // scene.add(new THREE.AxesHelper(5));

  const dirLight = new THREE.DirectionalLight(0xefefff, 1.5);
  dirLight.position.set(10, 10, 10);
  scene.add(dirLight);

  useEffect(() => {
    // Getting the entities
    socket.emit("get_entities_props");
    socket.on("entities_props", (raw_entities) => {
      raw_entities.forEach(initEntity);
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    if (mount.current.childElementCount === 0) {
      mount.current.appendChild(renderer.domElement);
    }
    renderer.setAnimationLoop(animation);

    return () => {
      window.location.reload();
    };
    // eslint-disable-next-line
  }, []);

  const initEntity = (e, index) => {
    entities.push(new Entity(e));
    entities[index].loadPath(scene, index);
    entities[index].loadObj(scene, index);
  };

  const updateEntities = () => {
    const target = entities[0];
    if (!target.mesh) return;
    stalker.subVectors(camera.position, target.mesh.position);
    entities.forEach((e) => e.update());
    orbit.object.position.copy(target.mesh.position).add(stalker);
    orbit.target.copy(target.mesh.position);
    orbit.update();
  };

  const animation = () => {
    if (entities.length === 0) return;
    updateEntities();
    resizeCanvasToDisplaySize();
    renderer.render(scene, camera);
  };

  const resizeCanvasToDisplaySize = () => {
    const view = document.getElementById("view-3d");
    const canvas = renderer.domElement;

    const width = view.clientWidth;
    const height = view.clientHeight;

    if (canvas.width !== width || canvas.height !== height) {
      renderer.setSize(width, height, false);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  };

  return (
    <div id="view-3d">
      <div ref={mount} />
    </div>
  );
}

export default View3D;
