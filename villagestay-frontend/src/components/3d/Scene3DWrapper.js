// src/components/3d/Scene3DWrapper.js
'use client';

import { Suspense, lazy, useState, useEffect } from 'react';
import SimpleFallback from './SimpleFallback';

// Only attempt to load 3D scene if we're sure it's supported
const Scene3D = lazy(() => 
  import('./Scene3D').catch(error => {
    console.warn('3D Scene failed to load:', error);
    // Return a component that renders the fallback
    return { default: SimpleFallback };
  })
);

const Scene3DWrapper = () => {
  const [isClient, setIsClient] = useState(false);
  const [canRender3D, setCanRender3D] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Check if WebGL is supported
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (gl) {
      setCanRender3D(true);
    } else {
      console.warn('WebGL not supported, using 2D fallback');
    }
  }, []);

  // Don't render anything on server-side
  if (!isClient) {
    return <SimpleFallback />;
  }

  // If WebGL is not supported, use fallback
  if (!canRender3D) {
    return <SimpleFallback />;
  }

  return (
    <Suspense fallback={<SimpleFallback />}>
      <Scene3D />
    </Suspense>
  );
};

export default Scene3DWrapper;