// src/components/3d/Scene3D.js - Better error handling
'use client';

import { useState, useEffect } from 'react';
import SimpleFallback from './SimpleFallback';

// Dynamic imports with comprehensive error handling
const loadThreeComponents = async () => {
  try {
    // Check if we're in the browser and if WebGL is supported
    if (typeof window === 'undefined') {
      throw new Error('Not in browser environment');
    }

    // Test WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }

    const [
      { Canvas },
      { OrbitControls, Float, Environment, PerspectiveCamera },
      { useFrame },
      THREE
    ] = await Promise.all([
      import('@react-three/fiber').catch(() => {
        throw new Error('Failed to load @react-three/fiber');
      }),
      import('@react-three/drei').catch(() => {
        throw new Error('Failed to load @react-three/drei');
      }),
      import('@react-three/fiber').catch(() => {
        throw new Error('Failed to load useFrame from @react-three/fiber');
      }),
      import('three').catch(() => {
        throw new Error('Failed to load three.js');
      })
    ]);
    
    return { Canvas, OrbitControls, Float, Environment, PerspectiveCamera, useFrame, THREE };
  } catch (error) {
    console.error('Failed to load Three.js components:', error);
    throw error;
  }
};

// Rest of your Scene3D component remains the same...
function Scene3D() {
  const [components, setComponents] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const initializeThree = async () => {
      try {
        // Add a small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const threeComponents = await loadThreeComponents();
        if (mounted) {
          setComponents(threeComponents);
          setError(false);
        }
      } catch (error) {
        console.error('Failed to initialize Three.js:', error);
        if (mounted) {
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeThree();

    return () => {
      mounted = false;
    };
  }, []);

  // Always show fallback if there's an error, loading, or no components
  if (loading || error || !components || typeof window === 'undefined') {
    return <SimpleFallback />;
  }

  try {
    const { Canvas } = components;
    const { Suspense } = require('react');
    
    return (
      <Canvas 
        className="w-full h-full" 
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        onError={(error) => {
          console.error('Canvas error:', error);
          setError(true);
        }}
        onCreated={() => {
          console.log('✅ Three.js Canvas created successfully');
        }}
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