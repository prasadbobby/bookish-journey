// src/components/3d/Scene3D.js
'use client';

import { useState, useEffect } from 'react';
import SimpleFallback from './SimpleFallback';

// Dynamic imports with error handling
const loadThreeComponents = async () => {
  try {
    const [
      { Canvas },
      { OrbitControls, Float, Environment, PerspectiveCamera },
      { useFrame },
      THREE
    ] = await Promise.all([
      import('@react-three/fiber'),
      import('@react-three/drei'),
      import('@react-three/fiber'),
      import('three')
    ]);
    
    return { Canvas, OrbitControls, Float, Environment, PerspectiveCamera, useFrame, THREE };
  } catch (error) {
    console.error('Failed to load Three.js components:', error);
    throw error;
  }
};

// Simple 3D Village House Component
function VillageHouse({ position, rotation, scale = 1, useFrame }) {
  const { useRef } = require('react');
  const houseRef = useRef();
  
  useFrame((state) => {
    if (houseRef.current) {
      houseRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={houseRef} position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.8, 1, 4]} />
        <meshStandardMaterial color="#CD853F" />
      </mesh>
      
      <mesh position={[0, -0.2, 1.01]}>
        <boxGeometry args={[0.4, 0.8, 0.1]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      
      <mesh position={[-0.6, 0.2, 1.01]}>
        <boxGeometry args={[0.3, 0.3, 0.1]} />
        <meshStandardMaterial color="#87CEEB" />
      </mesh>
      <mesh position={[0.6, 0.2, 1.01]}>
        <boxGeometry args={[0.3, 0.3, 0.1]} />
        <meshStandardMaterial color="#87CEEB" />
      </mesh>
    </group>
  );
}

// Floating Particles
function FloatingParticles({ useFrame, Float }) {
  const { useRef } = require('react');
  const particlesRef = useRef();
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.002;
    }
  });

  const particles = [];
  for (let i = 0; i < 30; i++) {
    particles.push(
      <Float key={i} speed={2} rotationIntensity={1} floatIntensity={2}>
        <mesh position={[
          (Math.random() - 0.5) * 20,
          Math.random() * 10,
          (Math.random() - 0.5) * 20
        ]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.2} />
        </mesh>
      </Float>
    );
  }

  return <group ref={particlesRef}>{particles}</group>;
}

// 3D Scene Content
function Scene3DContent({ components }) {
  const { OrbitControls, Float, Environment, PerspectiveCamera, useFrame } = components;
  
  try {
    return (
      <>
        <PerspectiveCamera makeDefault position={[0, 5, 10]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[-10, 10, 5]} intensity={0.5} />
        
        <Environment preset="sunset" />
        
        <VillageHouse position={[-3, 0, 0]} rotation={[0, 0.5, 0]} useFrame={useFrame} />
        <VillageHouse position={[0, 0, -2]} rotation={[0, 0, 0]} scale={0.8} useFrame={useFrame} />
        <VillageHouse position={[3, 0, 1]} rotation={[0, -0.5, 0]} scale={1.2} useFrame={useFrame} />
        
        <FloatingParticles useFrame={useFrame} Float={Float} />
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </>
    );
  } catch (error) {
    console.error('3D Scene Content Error:', error);
    return null;
  }
}

// Main 3D Scene with comprehensive error handling
function Scene3D() {
  const [components, setComponents] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const initializeThree = async () => {
      try {
        const threeComponents = await loadThreeComponents();
        if (mounted) {
          setComponents(threeComponents);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize Three.js:', error);
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializeThree, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  if (loading || error || !components || typeof window === 'undefined') {
    return <SimpleFallback />;
  }

  try {
    const { Canvas } = components;
    const { Suspense } = require('react');
    
    return (
      <Canvas 
        className="w-full h-full" 
        gl={{ antialias: true, alpha: true }}
        onError={() => setError(true)}
        fallback={<SimpleFallback />}
      >
        <Suspense fallback={null}>
          <Scene3DContent components={components} />
        </Suspense>
      </Canvas>
    );
  } catch (error) {
    console.error('3D Scene Render Error:', error);
    return <SimpleFallback />;
  }
}

export default Scene3D;