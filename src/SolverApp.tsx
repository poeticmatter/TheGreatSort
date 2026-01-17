import React, { useState } from 'react';
import { CardItem, ToolType } from '../types';
import { generateLevel, findOptimalSolution, Solution, Move } from '../utils/gameLogic';
import Card from '../components/Card';
import { ArrowRight, ArrowRightToLine, ArrowLeftToLine, Trash2, ArrowRightLeft } from 'lucide-react';

export default function SolverApp() {
  const [seqLength, setSeqLength] = useState(5);
  const [sequence, setSequence] = useState<CardItem[]>([]);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [isSolving, setIsSolving] = useState(false);

  const handleGenerate = () => {
    const newSeq = generateLevel(seqLength);
    setSequence(newSeq);
    setSolution(null);
  };

  const handleSolve = () => {
    if (sequence.length === 0) return;
    setIsSolving(true);
    // Use timeout to allow UI to update
    setTimeout(() => {
      const sol = findOptimalSolution(sequence);
      setSolution(sol);
      setIsSolving(false);
    }, 100);
  };

  const renderToolIcon = (tool: ToolType) => {
    switch(tool) {
        case 'demote': return <ArrowLeftToLine size={16} />;
        case 'promote': return <ArrowRightToLine size={16} />;
        case 'purge': return <Trash2 size={16} />;
        case 'swap': return <ArrowRightLeft size={16} />;
        default: return null;
    }
  };

  // Helper to reconstruct state after moves
  const getStepStates = (initialSeq: CardItem[], moves: Move[]) => {
    const states: { move: Move | null, seq: CardItem[] }[] = [];
    let currentSeq = [...initialSeq];

    // Initial state
    states.push({ move: null, seq: currentSeq });

    moves.forEach(move => {
        const nextSeq = [...currentSeq];
        if (move.tool === 'purge') {
            nextSeq.splice(move.index!, 1);
        } else if (move.tool === 'demote') {
            const [moved] = nextSeq.splice(move.index!, 1);
            nextSeq.unshift(moved);
        } else if (move.tool === 'promote') {
            const [moved] = nextSeq.splice(move.index!, 1);
            nextSeq.push(moved);
        } else if (move.tool === 'swap') {
             [nextSeq[move.index!], nextSeq[move.index!+1]] = [nextSeq[move.index!+1], nextSeq[move.index!]];
        }
        states.push({ move, seq: nextSeq });
        currentSeq = nextSeq;
    });

    return states;
  };

  const stepStates = solution ? getStepStates(sequence, solution.moves) : [];

  return (
    <div className="min-h-screen bg-stone-900 text-stone-200 font-sans p-8">
      <h1 className="text-3xl font-[Cinzel] text-amber-500 mb-8 border-b border-stone-700 pb-4">
        The Great Sort: Solution Verifier
      </h1>

      <div className="flex flex-col gap-6 max-w-4xl mx-auto">

        {/* Controls */}
        <div className="bg-stone-800 p-6 rounded border border-stone-600 flex gap-4 items-end">
            <div>
                <label className="block text-stone-400 text-sm mb-1">Length</label>
                <input
                    type="number"
                    min="3"
                    max="12"
                    value={seqLength}
                    onChange={(e) => setSeqLength(parseInt(e.target.value))}
                    className="bg-stone-900 border border-stone-600 px-3 py-2 rounded w-20 text-center"
                />
            </div>
            <button
                onClick={handleGenerate}
                className="bg-stone-700 hover:bg-stone-600 px-4 py-2 rounded text-white font-semibold transition"
            >
                Generate Sequence
            </button>
            <button
                onClick={handleSolve}
                disabled={sequence.length === 0 || isSolving}
                className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded text-stone-900 font-bold transition ml-auto"
            >
                {isSolving ? 'Solving...' : 'Solve Sequence'}
            </button>
        </div>

        {/* Initial Sequence */}
        {sequence.length > 0 && (
            <div className="bg-stone-950 p-6 rounded border border-stone-800">
                <h2 className="text-stone-500 uppercase tracking-widest text-sm mb-4">Initial Sequence</h2>
                <div className="flex gap-2 flex-wrap">
                    {sequence.map((item) => (
                        <Card key={item.id} item={item} onClick={() => {}} />
                    ))}
                </div>
            </div>
        )}

        {/* Solution */}
        {solution && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-amber-900/20 border border-amber-900/50 p-4 rounded flex items-center justify-between">
                    <span className="text-amber-500 font-bold text-xl">Optimal Yield: {solution.score}</span>
                    <span className="text-stone-400 text-sm">Moves: {solution.moves.length}</span>
                </div>

                <div className="space-y-8">
                    {stepStates.map((step, idx) => (
                        <div key={idx} className="relative pl-8 border-l-2 border-stone-700">
                            {/* Step Indicator */}
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-stone-700 border-2 border-stone-900"></div>

                            {step.move ? (
                                <div className="mb-2 flex items-center gap-2 text-amber-400 font-mono text-sm">
                                    <span className="bg-stone-800 px-2 py-1 rounded border border-stone-600 flex items-center gap-2">
                                        {renderToolIcon(step.move.tool)}
                                        {step.move.tool.toUpperCase()}
                                    </span>
                                    <span>{step.move.description}</span>
                                </div>
                            ) : (
                                <div className="mb-2 text-stone-500 font-mono text-sm">Start</div>
                            )}

                            <div className="flex gap-2 flex-wrap opacity-90 scale-90 origin-top-left">
                                {step.seq.map((item) => (
                                    <Card key={item.id} item={item} onClick={() => {}} />
                                ))}
                            </div>

                            {/* Arrow for next step */}
                            {idx < stepStates.length - 1 && (
                                <div className="mt-4 text-stone-600">
                                    <ArrowRight size={20} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
