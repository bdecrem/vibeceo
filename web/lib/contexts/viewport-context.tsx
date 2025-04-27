'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface ViewportState {
  viewportHeight: number;
  viewportWidth: number;
  safeAreaTop: number;
  safeAreaBottom: number;
  keyboardHeight: number;
  isKeyboardOpen: boolean;
  isMobile: boolean;
  isLandscape: boolean;
}

interface ViewportContextType extends ViewportState {
  updateViewport: () => void;
}

const ViewportContext = createContext<ViewportContextType | null>(null);

export function ViewportProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ViewportState>({
    viewportHeight: 0,
    viewportWidth: 0,
    safeAreaTop: 0,
    safeAreaBottom: 0,
    keyboardHeight: 0,
    isKeyboardOpen: false,
    isMobile: false,
    isLandscape: false,
  });

  const updateViewport = () => {
    // Use dynamic viewport height (dvh) when available
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    
    // Get safe area insets
    const safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0');
    const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0');
    
    // Check if mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    setState({
      viewportHeight: vh,
      viewportWidth: vw,
      safeAreaTop: safeTop,
      safeAreaBottom: safeBottom,
      keyboardHeight: 0, // Will be updated by keyboard events
      isKeyboardOpen: false,
      isMobile,
      isLandscape: vw > vh,
    });
  };

  useEffect(() => {
    // Initial update
    updateViewport();

    // Update on resize and orientation change
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    // iOS Safari specific events for dynamic toolbar
    let lastVH = window.innerHeight;
    const checkHeight = () => {
      const currentVH = window.innerHeight;
      if (currentVH !== lastVH) {
        updateViewport();
        lastVH = currentVH;
      }
    };
    window.addEventListener('scroll', checkHeight);
    window.addEventListener('touchmove', checkHeight);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      window.removeEventListener('scroll', checkHeight);
      window.removeEventListener('touchmove', checkHeight);
    };
  }, []);

  return (
    <ViewportContext.Provider value={{ ...state, updateViewport }}>
      {children}
    </ViewportContext.Provider>
  );
}

export function useViewport() {
  const context = useContext(ViewportContext);
  if (!context) {
    throw new Error('useViewport must be used within a ViewportProvider');
  }
  return context;
} 