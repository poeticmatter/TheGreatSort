import React from 'react';
import { calculateRelativeEfficiency, calculateBatchScore } from '../utils/gameLogic';
import { TOOLS } from '../constants';
import { CheckCircle, AlertTriangle, ArrowDown, FileText } from 'lucide-react';
import InventoryGrid from './InventoryGrid';
import { useDailyAudit } from '../hooks/useDailyAudit';
import { FlavorText as FlavorTextComponent } from './FlavorText';

interface DailyAuditProps {
  date: string;
  userHighScore: number;
  onClose: () => void;
  onDetectResistance: () => void;
  flavorText?: string;
}

export const DailyAudit: React.FC<DailyAuditProps> = ({ date, userHighScore, onClose, onDetectResistance, flavorText }) => {
  const { loading, solution, timeline, initialList, stats } = useDailyAudit(date, userHighScore);
  const { userScore, optimalScore, worstScore } = stats;
  const [isPlanExpanded, setIsPlanExpanded] = React.useState(false);

  // Responsive Logic
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate Adherence
  const passed = solution ? userScore >= optimalScore : false;
  const adherence = solution
    ? calculateRelativeEfficiency(userScore, optimalScore, worstScore)
    : 0;

  // Determine Interrogation Status
  // If user score is worse than the initial board state score
  const initialScore = initialList.length > 0 ? calculateBatchScore(initialList) : 0;
  const isInterrogation = userScore < initialScore;

  if (loading || !solution) {
    return (
      <div className="flex flex-col items-center justify-center p-12 w-full h-full min-h-[50vh]">
        <div className="bg-stone-900/50 border-2 border-amber-900/30 p-8 rounded shadow-xl animate-pulse flex flex-col items-center">
          <FileText className="w-12 h-12 text-amber-500/50 mb-4" />
          <p className="text-amber-500 font-mono text-xl tracking-widest">AUDITING RECORDS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto text-stone-100 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">

      {/* Main Report Card */}
      <div className="w-full max-w-full bg-transparent relative overflow-hidden">

        {/* Watermark */}
        <div className="absolute top-0 right-0 p-32 opacity-5 pointer-events-none">
          <FileText className="w-64 h-64 text-stone-100" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-3xl font-black uppercase tracking-wide text-amber-500 mb-2 flex items-center gap-3">
            <FileText className="w-8 h-8" />
            Daily Audit: {date}
          </h1>
          <p className="text-stone-400 font-mono text-sm mb-8 max-w-2xl text-center">
            Official performance review of sorting efficiency for the designated cycle.
          </p>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 w-full">
            <div className="bg-stone-900/80 p-5 border border-stone-600 rounded">
              <div className="text-xs uppercase text-stone-500 mb-1">Citizen Yield</div>
              <div className="text-3xl font-bold text-stone-200">{userScore}</div>
            </div>
            <div className="bg-stone-900/80 p-5 border border-stone-600 rounded">
              <div className="text-xs uppercase text-stone-500 mb-1">Optimal Yield</div>
              <div className="text-3xl font-bold text-amber-500">{optimalScore}</div>
            </div>
            <div className={`bg-stone-900/80 p-5 border rounded flex flex-col justify-center relative overflow-hidden ${adherence >= 100 ? 'border-amber-400/50'
              : adherence >= 90 ? 'border-amber-700/50'
                : 'border-red-900/50'
              }`}>
              <div className="text-xs uppercase text-stone-500 mb-1">Adherence Rating</div>
              <div className={`text-3xl font-black ${adherence >= 100 ? 'text-amber-400'
                : adherence >= 90 ? 'text-amber-600'
                  : 'text-red-500'
                }`}>
                {adherence}%
              </div>
              {/* Stamp */}
              <div className={`absolute top-1/2 right-4 transform -translate-y-1/2 -rotate-12 border-2 text-xs font-black px-2 py-1 opacity-50 select-none pointer-events-none
                   ${adherence >= 100 ? 'border-amber-400 text-amber-400'
                  : adherence >= 90 ? 'border-amber-700 text-amber-700'
                    : 'border-red-600 text-red-600'
                }`}>
                {
                  adherence >= 100 ? 'PASSED'
                    : adherence >= 90 ? 'SATISFACTORY'
                      : isInterrogation ? 'INTERROGATION'
                        : 'PROBATION'
                }
              </div>
            </div>
          </div>

          {/* Flavor Text */}
          {flavorText && (
            <div className="my-6 w-full flex justify-center border-t border-b border-stone-800 py-4">
              <FlavorTextComponent mood="DONE" text={flavorText} />
            </div>
          )}

          {passed ? (
            <div className="bg-amber-900/10 border border-amber-500/30 p-6 rounded flex items-center gap-4 w-full">
              <CheckCircle className="w-10 h-10 text-amber-500 shrink-0" />
              <div>
                <h3 className="text-amber-500 font-bold uppercase tracking-wide">Audit Passed</h3>
                <p className="text-amber-200/50 text-sm">No infractions detected. Productivity within acceptable parameters.</p>
              </div>
            </div>
          ) : (
            <div className="w-full mt-4 flex flex-col items-center">

              {/* Interactive Divider */}
              <button
                onClick={() => setIsPlanExpanded(!isPlanExpanded)}
                className="w-full border-t-2 border-dashed border-red-900/30 my-8 relative group cursor-pointer focus:outline-none"
              >
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#1c1917] px-6 py-1 text-red-500 group-hover:text-red-400 group-hover:scale-105 transition-all font-bold uppercase tracking-wide md:tracking-widest text-sm md:text-xl flex items-center gap-3 whitespace-nowrap border border-transparent group-hover:border-red-900/30 rounded-full">
                  <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />
                  {isPlanExpanded ? "Hide Corrective Plan" : "View Corrective Plan"}
                  {isPlanExpanded ? <ArrowDown className="rotate-180 w-4 h-4 ml-2 opacity-50" /> : <ArrowDown className="w-4 h-4 ml-2 opacity-50" />}
                </div>
              </button>

              {isPlanExpanded && (
                <div className="flex flex-col gap-12 mt-4 w-full animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex flex-col gap-0 items-center w-full">
                    {timeline.map((step, idx) => {
                      // Determine highlights based on the NEXT move (if current step has a move)
                      const highlightIndices = step.move
                        ? [step.move.index, step.move.targetIndex].filter(x => x !== undefined) as number[]
                        : [];

                      return (
                        <React.Fragment key={idx}>
                          {/* Board State */}
                          <div className="w-full flex flex-col items-center">
                            <InventoryGrid
                              cards={step.list.map((item, idx) => ({
                                ...item,
                                key: item.id,
                                isSelected: highlightIndices.includes(idx),
                                isCandidate: false,
                                isDisabled: false,
                                mirrorLabel: null
                              }))}
                              layout={isMobile ? "VERTICAL_LIST" : "HORIZONTAL_STRIP"}
                            />
                          </div>

                          {/* Arrow / Action */}
                          {step.move && (
                            <div className={`flex flex-col items-center z-10 ${isMobile ? "my-8 gap-1" : "my-2"}`}>
                              <div className="h-6 w-px bg-stone-600"></div>
                              <div className="bg-stone-800 border border-stone-600 text-stone-300 px-4 py-2 rounded-full text-sm font-mono shadow-xl flex items-center gap-3">
                                {(() => {
                                  const ToolIcon = TOOLS[step.move.tool.toUpperCase()]?.icon;
                                  return ToolIcon ? <ToolIcon size={16} className="text-amber-500" /> : null;
                                })()}
                                <span className="text-amber-500 font-bold uppercase tracking-wider">{step.move.tool}</span>
                                <span className="text-stone-500">
                                  {(() => {
                                    const isAdjacent = ['swap', 'merge', 'sink', 'cycle'].includes(step.move.tool);
                                    if (isAdjacent && step.move.targetIndex === undefined) {
                                      return `Index ${step.move.index} & ${step.move.index + 1}`;
                                    }
                                    if (step.move.targetIndex !== undefined) {
                                      return `${step.move.index} ↔ ${step.move.targetIndex}`;
                                    }
                                    return `Index ${step.move.index}`;
                                  })()}
                                </span>
                              </div>
                              <div className="h-6 w-px bg-stone-600"></div>
                              <ArrowDown className="text-stone-600 -mt-2" size={16} />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
