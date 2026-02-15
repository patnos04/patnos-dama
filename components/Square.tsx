
import React from 'react';

interface SquareProps {
  isDark: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onClick: () => void;
  children?: React.ReactNode;
}

const Square: React.FC<SquareProps> = ({ isDark, onDrop, onDragOver, onClick, children }) => {
  return (
    <div 
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      style={{ touchAction: 'none' }}
      className={`
        relative flex items-center justify-center select-none w-full h-full
        ${isDark ? 'bg-zinc-900' : 'bg-zinc-300'}
        transition-colors duration-150
        cursor-pointer
        border border-black/10
      `}
    >
      {/* Hafif bir derinlik hissi için gölge efekti */}
      {!isDark && <div className="absolute inset-0 bg-white/10 pointer-events-none" />}
      {children}
    </div>
  );
};

export default Square;