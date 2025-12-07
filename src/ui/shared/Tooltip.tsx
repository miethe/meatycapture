/**
 * Tooltip Component
 *
 * Contextual help tooltip that appears on hover/focus.
 * Glass morphism aesthetic with accessible keyboard navigation.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import './Tooltip.css';

interface TooltipProps {
  /** Tooltip content text */
  content: string;
  /** Child element that triggers the tooltip */
  children: React.ReactNode;
  /** Tooltip position relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing tooltip (ms) */
  delay?: number;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
}: TooltipProps): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  const handleFocus = useCallback(() => {
    setIsVisible(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      {isVisible && (
        <div
          className={`tooltip tooltip-${position}`}
          role="tooltip"
          aria-live="polite"
        >
          <div className="tooltip-content">{content}</div>
        </div>
      )}
    </div>
  );
}

export default Tooltip;
