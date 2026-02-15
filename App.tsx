
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Player, Piece as PieceType, Language, Move, AIDifficulty, UserProfile } from './types';
import { TRANSLATIONS } from './constants';
import { INITIAL_BOARD, getAllAvailableMoves, getBestMove } from './services/gameLogic';
import Square from './components/Square';
import Piece from './components/Piece';

const THINKING_TIME_LIMIT = 120;

interface GameState {
  board: (PieceType | null)[][];
  turn: Player;
}

const App: React.FC = () => {
  const [board, setBoard] = useState<(PieceType | null)[][]>(INITIAL_BOARD());
  const [turn, setTurn] = useState<Player>('white');
  const [history, setHistory] = useState<GameState[]>([]);
  const [difficulty, setDifficulty] = useState<AIDifficulty>('normal');
  const [selected, setSelected] = useState<{r: number, c: number} | null>(null);
  const [lang, setLang] = useState<Language>('tr');
  const [winner, setWinner] = useState<Player | 'draw' | 'timeout' | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(THINKING_TIME_LIMIT);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeSquare, setActiveSquare] = useState<{r: number, c: number} | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('dama_user_profile');
    return saved ? JSON.parse(saved) : { name: '', avatar: null };
  });

  const [showProfileSetup, setShowProfileSetup] = useState(!userProfile.name);

  const timerRef = useRef<any>(null);
  const warningTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[lang];

  const currentAvailableMoves = useMemo(() => {
    if (winner || isAnimating) return [];
    return getAllAvailableMoves(board, turn);
  }, [board, turn, winner, isAnimating]);

  const showWarning = useCallback((msg: string) => {
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    setWarning(msg);
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    warningTimeoutRef.current = setTimeout(() => setWarning(null), 5000);
  }, []);

  const saveProfile = () => {
    if (userProfile.name.trim()) {
      localStorage.setItem('dama_user_profile', JSON.stringify(userProfile));
      setShowProfileSetup(false);
    }
  };

  const undoMove = () => {
    if (history.length === 0 || isAnimating || winner) return;
    const lastState = history[history.length - 1];
    setBoard(lastState.board);
    setTurn(lastState.turn);
    setHistory(prev => prev.slice(0, -1));
    setSelected(null);
  };

  const executeMove = useCallback(async (move: Move) => {
    if (isAnimating) return;
    
    const currentState: GameState = {
      board: board.map(row => [...row]),
      turn: turn
    };
    setHistory(prev => [...prev, currentState]);

    setIsAnimating(true);
    setWarning(null);
    
    let currentBoard = board.map(row => [...row]);
    const movingPiece = { ...currentBoard[move.from.r][move.from.c]! };
    
    currentBoard[move.from.r][move.from.c] = null;
    let lastR = move.from.r;
    let lastC = move.from.c;

    if (move.captured.length > 0) {
      for (let i = 0; i < move.captured.length; i++) {
        const landPos = move.path[i];
        const victimPos = move.captured[i];
        currentBoard[lastR][lastC] = null;
        currentBoard[landPos.r][landPos.c] = movingPiece;
        setBoard([...currentBoard.map(r => [...r])]);
        setActiveSquare({ r: landPos.r, c: landPos.c });
        if ('vibrate' in navigator) navigator.vibrate(20); 
        await new Promise(r => setTimeout(r, 200)); 
        currentBoard[victimPos.r][victimPos.c] = null;
        setBoard([...currentBoard.map(r => [...r])]);
        await new Promise(r => setTimeout(r, 100)); 
        lastR = landPos.r;
        lastC = landPos.c;
      }
    } else {
      currentBoard[move.to.r][move.to.c] = movingPiece;
      setBoard([...currentBoard.map(r => [...r])]);
      setActiveSquare({ r: move.to.r, c: move.to.c });
      if ('vibrate' in navigator) navigator.vibrate(20); 
      await new Promise(r => setTimeout(r, 250));
    }

    if (!movingPiece.isKing) {
      if ((movingPiece.player === 'white' && move.to.r === 0) || (movingPiece.player === 'black' && move.to.r === 7)) {
        currentBoard[move.to.r][move.to.c] = { ...movingPiece, isKing: true };
        setBoard([...currentBoard.map(r => [...r])]);
      }
    }

    setActiveSquare(null);
    setTurn(turn === 'white' ? 'black' : 'white');
    setSelected(null);
    setIsAnimating(false);
  }, [board, turn, isAnimating]);

  const handleSquareClick = (r: number, c: number) => {
    if (winner || isAnimating || showProfileSetup) return;

    const clickedPiece = board[r][c];
    const hasCaptureMandatory = currentAvailableMoves.some(m => m.captured.length > 0);

    if (clickedPiece?.player === turn) {
      const pieceMoves = currentAvailableMoves.filter(m => m.from.r === r && m.from.c === c);
      
      if (hasCaptureMandatory && (pieceMoves.length === 0 || pieceMoves[0].captured.length === 0)) {
        showWarning(t.mandatoryCapture);
        return;
      }

      if (pieceMoves.length > 0) {
        setSelected({ r, c });
      }
      return;
    }

    if (selected) {
      const validMove = currentAvailableMoves.find(m => 
        m.from.r === selected.r && m.from.c === selected.c && 
        m.to.r === r && m.to.c === c
      );

      if (validMove) {
        executeMove(validMove);
      } else {
        if (!clickedPiece) setSelected(null);
      }
    }
  };

  useEffect(() => {
    if (turn === 'black' && !winner && !isAnimating && !showProfileSetup) {
      const bestMove = getBestMove(board, 'black', difficulty);
      if (bestMove) {
        const timeoutId = setTimeout(() => executeMove(bestMove), 800);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [turn, winner, isAnimating, board, difficulty, executeMove, showProfileSetup]);

  useEffect(() => {
    if (winner || isAnimating || showProfileSetup) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(THINKING_TIME_LIMIT);
    timerRef.current = setInterval(() => {
      setTimeLeft(p => p > 0 ? p - 1 : 0);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [turn, winner, isAnimating, showProfileSetup]);

  useEffect(() => {
    if (timeLeft === 0 && !winner) setWinner('timeout');
  }, [timeLeft, winner]);

  useEffect(() => {
    const whiteCount = board.flat().filter(p => p?.player === 'white').length;
    const blackCount = board.flat().filter(p => p?.player === 'black').length;
    if (whiteCount === 0) setWinner('black');
    else if (blackCount === 0) setWinner('white');
    else if (currentAvailableMoves.length === 0 && !isAnimating && !showProfileSetup) {
      setWinner(turn === 'white' ? 'black' : 'white');
    }
  }, [board, turn, currentAvailableMoves, isAnimating, showProfileSetup]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 bg-zinc-950 text-zinc-100 relative">
      
      {/* Profil Kurulumu */}
      {showProfileSetup && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/98 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-black text-center mb-10 tracking-tighter text-white">
              <span className="text-blue-500 italic">PATNOS</span> {t.setupProfile}
            </h2>
            
            <div className="flex flex-col items-center gap-8">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative w-32 h-32 rounded-full bg-zinc-800 border-4 border-dashed border-zinc-700 flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-blue-500"
              >
                {userProfile.avatar ? (
                  <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <i className="fas fa-camera text-3xl text-zinc-500 group-hover:text-blue-400"></i>
                )}
                <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                   <span className="text-[10px] font-black uppercase text-white tracking-widest">{t.choosePhoto}</span>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setUserProfile(prev => ({ ...prev, avatar: reader.result as string }));
                  reader.readAsDataURL(file);
                }
              }} className="hidden" accept="image/*" />

              <div className="w-full">
                <label className="text-[11px] font-black text-blue-500 uppercase tracking-widest mb-3 block text-center">{t.enterName}</label>
                <input 
                  type="text" 
                  value={userProfile.name}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value.substring(0, 15) }))}
                  className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center text-xl"
                />
              </div>

              <button 
                onClick={saveProfile}
                disabled={!userProfile.name.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
              >
                {t.startGame}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Başlık Bölümü */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between mb-8 gap-6 px-2">
        <div className="text-center md:text-left">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter flex items-center gap-3 justify-center md:justify-start">
            <span className="text-blue-500 italic">PATNOS</span> DAMA
          </h1>
          <div className="flex items-center gap-3 mt-2 justify-center md:justify-start">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-xl border-2 border-zinc-700 overflow-hidden relative">
              <img 
                src="https://static.wixstatic.com/media/7e2174_63be697a3dd64d06b050165599965a9a~mv2.png" 
                alt="Logo" 
                className="w-full h-full object-cover block"
              />
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-400 font-black uppercase tracking-widest">{t.subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <select value={lang} onChange={(e) => setLang(e.target.value as Language)} className="bg-zinc-900 border-2 border-zinc-800 rounded-xl px-4 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer text-white">
            <option value="tr">TR</option>
            <option value="ku">KU</option>
            <option value="en">EN</option>
          </select>
          <div className="flex gap-2">
            <button 
              onClick={undoMove} 
              disabled={history.length === 0 || isAnimating || !!winner}
              className="bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-20 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg border border-zinc-700 flex items-center gap-2"
            >
              <i className="fas fa-undo"></i> {t.undo}
            </button>
            <button onClick={() => setShowProfileSetup(true)} className="bg-white text-zinc-900 hover:scale-105 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl font-black">
              {t.restart}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl flex flex-col xl:flex-row gap-8 items-center xl:items-stretch justify-center">
        {/* Oyun Tahtası */}
        <div className="w-full max-w-[550px] xl:max-w-[650px] aspect-square bg-zinc-800 p-2 sm:p-5 rounded-[2.5rem] shadow-2xl border-[6px] border-zinc-700 relative overflow-hidden">
          
          {warning && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none w-[90%] text-center">
              <div className="bg-red-600 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.1em] shadow-[0_0_30px_rgba(220,38,38,0.5)] border-2 border-red-400">
                <i className="fas fa-exclamation-circle mr-3"></i>
                {warning}
              </div>
            </div>
          )}

          <div className="board-grid w-full h-full rounded-2xl overflow-hidden bg-zinc-900 relative shadow-inner">
            {board.map((row, r) => 
              row.map((piece, c) => {
                const isPossibleMove = selected && currentAvailableMoves.some(m => 
                  m.from.r === selected.r && m.from.c === selected.c && 
                  m.to.r === r && m.to.c === c
                );
                const isSelectable = !winner && !isAnimating && currentAvailableMoves.some(m => m.from.r === r && m.from.c === c);
                const hasCaptureMandatory = currentAvailableMoves.some(m => m.captured.length > 0);

                return (
                  <Square 
                    key={`${r}-${c}`}
                    isDark={(r + c) % 2 !== 0}
                    onDrop={(e: any) => {
                      e.preventDefault();
                      if (selected) {
                        const move = currentAvailableMoves.find(m => m.from.r === selected.r && m.from.c === selected.c && m.to.r === r && m.to.c === c);
                        if (move) executeMove(move);
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => handleSquareClick(r, c)}
                  >
                    {activeSquare?.r === r && activeSquare?.c === c && (
                      <div className="absolute inset-0 bg-blue-500/40 animate-pulse z-20 pointer-events-none" />
                    )}
                    {isPossibleMove && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-lg" />
                      </div>
                    )}
                    {isSelectable && hasCaptureMandatory && (
                      <div className="absolute inset-0 border-[6px] border-red-500 rounded-full animate-pulse z-0" />
                    )}
                    {piece && (
                      <Piece 
                        piece={piece} 
                        isSelected={selected?.r === r && selected?.c === c}
                        onDragStart={(e) => {
                          if (!isSelectable) e.preventDefault();
                          else setSelected({r, c});
                        }}
                      />
                    )}
                  </Square>
                );
              })
            )}
          </div>

          {winner && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-md rounded-[2rem] p-8 text-center">
              <div className="animate-in zoom-in duration-500">
                <i className={`fas ${winner === 'timeout' ? 'fa-hourglass-end text-red-500' : 'fa-crown text-amber-500'} text-7xl mb-8`}></i>
                <h2 className="text-5xl font-black mb-4 text-white italic tracking-tighter uppercase">
                  {winner === 'timeout' ? t.timeout : t.winner}
                </h2>
                <p className="text-3xl font-black text-blue-400 mb-12 uppercase tracking-widest">
                  {winner === 'white' ? userProfile.name : t.black}
                </p>
                <button onClick={() => window.location.reload()} className="bg-white text-zinc-900 px-14 py-5 rounded-2xl font-black uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 hover:scale-105">
                  {t.restart}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Yan Panel Kontrolleri */}
        <div className="w-full xl:w-[420px] flex flex-col gap-6 pb-10">
          <div className="bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-800 relative overflow-hidden shadow-2xl">
            <div className={`absolute bottom-0 left-0 h-2 transition-all duration-1000 ${timeLeft < (THINKING_TIME_LIMIT * 0.2) ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-blue-500 shadow-[0_0_15px_#3b82f6]'}`} style={{ width: `${(timeLeft / THINKING_TIME_LIMIT) * 100}%` }} />
            
            <div className="flex justify-between items-center mb-8">
              <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em]">{t.turn}</span>
              <div className="flex items-center gap-3 bg-black px-5 py-2 rounded-2xl border border-zinc-800">
                 <div className={`w-2 h-2 rounded-full ${timeLeft < (THINKING_TIME_LIMIT * 0.2) ? 'bg-red-500 animate-ping' : 'bg-blue-500'}`} />
                 <span className={`text-2xl font-mono font-black ${timeLeft < (THINKING_TIME_LIMIT * 0.2) ? 'text-red-500' : 'text-blue-400'}`}>
                   {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                 </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] flex items-center justify-center transition-all shadow-2xl rotate-3 border-4 overflow-hidden ${turn === 'white' ? 'bg-blue-600 border-blue-400' : 'bg-yellow-500 border-yellow-300'}`}>
                {turn === 'white' ? (
                  userProfile.avatar ? (
                    <img src={userProfile.avatar} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fas fa-user text-white text-4xl"></i>
                  )
                ) : (
                  <i className="fas fa-robot text-zinc-900 text-4xl"></i>
                )}
              </div>
              <div className="flex-1">
                <p className="text-2xl sm:text-3xl font-black leading-tight tracking-tighter uppercase text-white truncate">{turn === 'white' ? userProfile.name : t.black}</p>
                <p className="text-[10px] text-zinc-500 mt-2 font-black uppercase tracking-widest">{t.moveHelp}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-800 shadow-2xl flex flex-col gap-5">
            <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em]">{t.difficulty}</h2>
            <div className="flex gap-3">
              {(['beginner', 'normal', 'expert'] as AIDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                    difficulty === d 
                      ? 'bg-white border-white text-zinc-950 shadow-xl scale-105'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {t[d]}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 text-[10px] text-zinc-700 font-black text-center uppercase tracking-[0.5em] opacity-60 mt-auto">
            PATNOS DAMA • İzmir Patnoslular Derneği • v5.4
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
