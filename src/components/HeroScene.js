"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";

function SculpturalForms() {
  const [hover, setHover] = useState([0, 0]);
  const { invalidate } = useThree();
  const wave = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.4, -0.2, 0), new THREE.Vector3(-0.9, 0.45, 0.08), new THREE.Vector3(-0.1, 0.65, 0.1), new THREE.Vector3(0.5, 0.15, 0), new THREE.Vector3(1.2, 0.28, -0.1), new THREE.Vector3(1.55, 0.8, -0.05),
  ]), []);
  return <group rotation={[0, hover[0] * 0.08, 0]} onPointerMove={(event) => { setHover([event.pointer.x, event.pointer.y]); invalidate(); }}>
    <mesh position={[0.45, -0.2, -0.2]} rotation={[Math.PI / 2.8, 0.2, 0]}>
      <torusGeometry args={[1.05, 0.065, 16, 120, Math.PI * 1.6]} />
      <meshStandardMaterial color="#8ab9a5" metalness={0.52} roughness={0.27} />
    </mesh>
    <mesh position={[0.3, -0.3, -0.38]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.76, 0.94, 0.2, 64, 1, true]} />
      <meshPhysicalMaterial color="#477e72" roughness={0.18} metalness={0.22} transmission={0.22} thickness={0.5} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0.2, 0.1, 0.12]}>
      <tubeGeometry args={[wave, 90, 0.055, 9, false]} />
      <meshStandardMaterial color="#d9e79a" metalness={0.32} roughness={0.28} />
    </mesh>
    <mesh position={[-0.35, 0.86, 0.15]} rotation={[0.2, 0, 0.6]}>
      <sphereGeometry args={[0.2, 24, 20]} />
      <meshStandardMaterial color="#e78a70" roughness={0.24} />
    </mesh>
    <mesh position={[1.18, 0.9, 0.18]} scale={[0.17, 0.27, 0.13]} rotation={[0.1, 0.4, -0.35]}>
      <sphereGeometry args={[1, 24, 20]} />
      <meshStandardMaterial color="#d4ddd1" metalness={0.58} roughness={0.2} />
    </mesh>
    <mesh position={[-1, -0.8, 0.1]} rotation={[0, 0.2, 0]}>
      <torusGeometry args={[0.5, 0.04, 12, 72, Math.PI * 1.45]} />
      <meshStandardMaterial color="#e78a70" metalness={0.28} roughness={0.3} />
    </mesh>
  </group>;
}

export default function HeroScene() {
  return <Canvas aria-hidden="true" dpr={[1, 1.35]} camera={{ position: [0, 0, 5], fov: 42 }} frameloop="demand" gl={{ alpha: true, antialias: true, powerPreference: "low-power" }} fallback={null}>
    <ambientLight intensity={1.25} />
    <directionalLight position={[3, 4, 5]} intensity={2.2} />
    <SculpturalForms />
  </Canvas>;
}
