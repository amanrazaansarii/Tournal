import React, { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

interface IOSSwipeToDeleteRowProps {
  onDelete: () => void;
  deleteLabel?: string;
  itemLabel?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard iOS horizontal swipe-to-dismiss row.
 * - Swiping left reveals the red iOS Delete action button (-84px snap).
 * - Swiping further left (< -155px) immediately triggers dismissal.
 */
export const IOSSwipeToDeleteRow: React.FC<IOSSwipeToDeleteRowProps> = ({
  onDelete,
  deleteLabel = 'Delete',
  itemLabel,
  children,
  className = '',
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const baseOffsetRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const SNAP_OPEN_WIDTH = -84;
  const FULL_DISMISS_THRESHOLD = -165;

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    baseOffsetRef.current = offsetX;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontalSwipeRef.current = Math.abs(dx) > Math.abs(dy);
      }
    }

    if (!isHorizontalSwipeRef.current) return;

    const next = Math.min(0, Math.max(-200, baseOffsetRef.current + dx));
    setOffsetX(next);
  };

  const finishSwipe = () => {
    setIsDragging(false);
    startXRef.current = null;
    startYRef.current = null;
    isHorizontalSwipeRef.current = null;

    if (offsetX <= FULL_DISMISS_THRESHOLD) {
      setOffsetX(-320);
      setTimeout(() => {
        onDelete();
      }, 140);
    } else if (offsetX <= SNAP_OPEN_WIDTH / 2) {
      setOffsetX(SNAP_OPEN_WIDTH);
    } else {
      setOffsetX(0);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return; // Handled by touch events
    // Ignore clicks on interactive controls inside the row
    const target = e.target as HTMLElement;
    if (
      target.closest('button, input, select, textarea, a, label')
    ) {
      return;
    }
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    baseOffsetRef.current = offsetX;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || !isDragging || startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) < 5) return;
    const next = Math.min(0, Math.max(-200, baseOffsetRef.current + dx));
    setOffsetX(next);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || !isDragging) return;
    finishSwipe();
  };

  return (
    <div className="relative overflow-hidden select-none">
      {/* Underlying iOS Red Swipe Action Tray */}
      <div
        aria-hidden={offsetX === 0}
        className={`absolute inset-y-0 right-0 flex items-center justify-end bg-[#FF3B30] text-white transition-opacity ${
          offsetX < -4 ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ width: Math.max(Math.abs(offsetX), 84) }}
      >
        <button
          type="button"
          aria-label={itemLabel ? `${deleteLabel} ${itemLabel}` : deleteLabel}
          onClick={() => {
            setOffsetX(0);
            onDelete();
          }}
          className="w-[84px] h-full flex flex-col items-center justify-center gap-1 text-white font-semibold text-[11px] cursor-pointer active:bg-black/15"
        >
          <Trash2 className="w-4 h-4" />
          <span>{deleteLabel}</span>
        </button>
      </div>

      {/* Foreground Row Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishSwipe}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={() => {
          if (offsetX < -10 && !isDragging) {
            setOffsetX(0);
          }
        }}
        style={{
          transform: `translate3d(${offsetX}px, 0, 0)`,
          transition: isDragging
            ? 'none'
            : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`relative z-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
