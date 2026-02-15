
import React from 'react';
import { Piece as PieceType } from '../types';

interface PieceProps {
  piece: PieceType;
  isSelected: boolean;
  onDragStart: (e: React.DragEvent) => void;
}

const Piece: React.FC<PieceProps> = ({ piece, isSelected, onDragStart }) => {
  const isWhite = piece.player === 'white';
  
  return (
    <div 
      draggable
      onDragStart={onDragStart}
      className={`
        relative w-[80%] h-[80%] rounded-full flex items-center justify-center transition-all duration-200
        ${isWhite 
          ? 'bg-blue-600 shadow-[0_5px_0_#1e3a8a,0_10px_20px_rgba(0,0,0,0.4)] border-2 border-blue-300' 
          : 'bg-yellow-500 shadow-[0_5px_0_#854d0e,0_10px_20px_rgba(0,0,0,0.4)] border-2 border-yellow-200'}
        ${isSelected 
          ? 'scale-110 -translate-y-2 ring-4 ring-white z-30 brightness-110' 
          : 'hover:scale-105 z-10'}
        cursor-grab active:cursor-grabbing
      `}
    >
      {/* Taş üzerindeki dekoratif halkalar - netlik artırıldı */}
      <div className="w-[85%] h-[85%] rounded-full border border-black/20 flex items-center justify-center">
        <div className="w-[70%] h-[70%] rounded-full border-2 border-black/10 flex items-center justify-center">
           <div className="w-[30%] h-[30%] rounded-full bg-black/5" />
        </div>
      </div>
      
      {piece.isKing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <i className={`fas fa-crown text-xl sm:text-2xl drop-shadow-lg ${isWhite ? 'text-white' : 'text-zinc-900'}`} />
        </div>
      )}

      {isSelected && (
        <div className={`absolute -inset-2 rounded-full blur-md opacity-30 animate-pulse ${isWhite ? 'bg-blue-400' : 'bg-yellow-400'}`} />
      )}
    </div>
  );
};

export default Piece;