import React, { useState } from 'react';
import { calculateBatchScore, gradeLevel } from '../engine';
import { calculateRelativeEfficiency, verifyResistanceMission } from '../utils/gameLogic';
import { ResistanceStatus } from '../../types';
import { TOOLS } from '../constants';
import { CheckCircle, AlertTriangle, ArrowDown, FileText, Share2, Clipboard, Mail } from 'lucide-react';
import InventoryGrid from './InventoryGrid';
import { useDailyAudit } from '../hooks/useDailyAudit';
import { FlavorText as FlavorTextComponent } from './FlavorText';
import { useShareResult } from '../hooks/useShareResult';
import { performShare } from '../utils/shareUtils';
import { useSystemMood, SystemMood } from '../hooks/useSystemMood';
import { FooterAttribution } from './FooterAttribution';

import { getResistanceFlavor } from '../utils/resistanceFlavor';
import { FLAVOR_DATABASE } from '../config/flavorText';
import { getStatusConfig } from '../config/resistanceStatusConfig';

interface DailyAuditProps {
  date: string;
  userHighScore: number;
  onClose: () => void;
  onDetectResistance: () => void;
  flavorText?: string;
  onShareSuccess?: () => void;
}

export const DailyAudit: React.FC<DailyAuditProps> = ({ date, userHighScore, onClose, onDetectResistance, flavorText: propFlavorText, onShareSuccess }) => {
  const { loading, solution, timeline, initialList, initialTools, userFinalList, stats } = useDailyAudit(date, userHighScore);
  const { userScore, optimalScore, worstScore, resistanceStatus: rawResistanceStatus } = stats;
  const [isPlanExpanded, setIsPlanExpanded] = React.useState(false);
  const joinedResistance = typeof window !== 'undefined' && localStorage.getItem('joinedResistance') === 'true';

  // Share Feedback State
  const [shareFeedback, setShareFeedback] = useState<'IDLE' | 'COPIED' | 'MANUAL'>('IDLE');
  const [manualCopyText, setManualCopyText] = useState<string>('');

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

  // Calculate compliance
  const passed = solution ? userScore >= optimalScore : false;
  const compliance = solution
    ? calculateRelativeEfficiency(userScore, optimalScore, worstScore)
    : 0;

  // Determine Mood for Share
  // We use the actual compliance value to determine the performance mood.
  // We pass 'false' for isDailyCompleted to get the graded mood (SOLVED/ADEQUATE/etc) instead of generic "DONE".
  const mood = useSystemMood(compliance, 100, false);

  // Resistance Verification
  // Checking `stats`:
  const resistanceOutcome = React.useMemo(() => {
    // Verify the USER'S final list logic
    if (!userFinalList || userFinalList.length === 0) return ResistanceStatus.ACTIVE;

    // We need the graded version to check survivors
    const { gradedList } = gradeLevel(userFinalList);

    return verifyResistanceMission(
      gradedList,
      ResistanceStatus.ACTIVE,
      userFinalList.length,
      stats.userScore, // using userScore as yield proxy if needed, though fn uses item values
      stats.resistanceTarget || 0
    );
  }, [userFinalList, stats.resistanceTarget, stats.userScore]);

  // Resistance Status & Flavor Calculation
  const resistanceStatus = rawResistanceStatus as ResistanceStatus | undefined;
  const isResistanceActive = rawResistanceStatus !== undefined;

  // Use Resistance Flavor if applicable, otherwise use prop passed or fallback
  let displayFlavorText = propFlavorText;
  let shareMood = mood;

  // If we have resistance, override the generic "DONE" flavor with specific resistance outcome flavor
  if (joinedResistance && isResistanceActive && resistanceOutcome) {
    const flavorKey = getResistanceFlavor(compliance, resistanceOutcome);
    if (flavorKey) {
      shareMood = flavorKey as SystemMood;

      const entries = FLAVOR_DATABASE[flavorKey];
      if (entries && entries.length > 0) {
        // Deterministic pick based on seed/date
        // Since we don't have seed readily available as number here (it's date string), 
        // let's use userScore + compliance as salt
        const salt = userScore + Math.floor(compliance);
        const index = salt % entries.length;
        displayFlavorText = entries[index].text;
      }
    }
  }

  const { generatePayload } = useShareResult();

  const handleShare = async () => {
    if (!solution || !timeline || timeline.length === 0) return;

    let resistanceStatusText: string | undefined;
    if (joinedResistance && isResistanceActive && resistanceOutcome) {
      resistanceStatusText = getStatusConfig(resistanceOutcome).text;
    }

    const text = generatePayload({
      userScore,
      compliancePercentage: compliance,
      mood: shareMood,
      initialList,
      initialTools,
      date: date,
      resistanceStatusText
    });

    const result = await performShare(text);

    if (result.method === 'manual' && result.textForManualCopy) {
      setManualCopyText(result.textForManualCopy);
      setShareFeedback('MANUAL');
      if (onShareSuccess) onShareSuccess();
    } else if (result.success) {
      setShareFeedback('COPIED');
      setTimeout(() => setShareFeedback('IDLE'), 2500);
      if (onShareSuccess) onShareSuccess();
    }
  };

  // Determine Interrogation Status
  // If user score is worse than the initial board state score
  const initialScore = initialList.length > 0 ? calculateBatchScore(initialList) : 0;
  const isInterrogation = userScore < initialScore;

  // Reuse logic for Badge? No, Badge uses resistanceOutcome (Solution).
  // We want to render the USER'S Status.


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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wide text-amber-500 mb-8 flex items-center gap-2 sm:gap-3 whitespace-nowrap">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
            Daily Audit: {date}
          </h1>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 w-full">
            <div className="bg-stone-900/80 p-4 md:p-5 border border-stone-600 rounded">
              <div className="text-[11px] md:text-xs uppercase text-stone-500 mb-1">Citizen Yield</div>
              <div className="text-2xl md:text-3xl font-bold text-stone-200">{userScore}</div>
            </div>
            <div className="bg-stone-900/80 p-4 md:p-5 border border-stone-600 rounded">
              <div className="text-[11px] md:text-xs uppercase text-stone-500 mb-1">Optimal Yield</div>
              <div className="text-2xl md:text-3xl font-bold text-amber-500">{optimalScore}</div>
            </div>
            <div className={`col-span-2 md:col-span-1 bg-stone-900/80 p-5 border rounded flex flex-col justify-center relative overflow-hidden ${compliance >= 100 ? 'border-amber-400/50'
              : compliance >= 90 ? 'border-amber-700/50'
                : 'border-red-900/50'
              }`}>
              <div className="text-xs uppercase text-stone-500 mb-1">compliance Rating</div>
              <div className={`text-3xl font-black ${compliance >= 100 ? 'text-amber-400'
                : compliance >= 90 ? 'text-amber-600'
                  : 'text-red-500'
                }`}>
                {compliance}%
              </div>
              {/* compliance Stamp */}
              <div className={`absolute top-1/2 right-4 transform -translate-y-1/2 -rotate-12 border-2 text-xs font-black px-2 py-1 opacity-50 select-none pointer-events-none
                   ${compliance >= 100 ? 'border-amber-400 text-amber-400'
                  : compliance >= 90 ? 'border-amber-700 text-amber-700'
                    : 'border-red-600 text-red-600'
                }`}>
                {
                  compliance >= 100 ? 'PASSED'
                    : compliance >= 90 ? 'SATISFACTORY'
                      : isInterrogation ? 'INTERROGATION'
                        : 'PROBATION'
                }
              </div>
            </div>
          </div>

          {/* Resistance Mission Status */}
          {resistanceStatus && resistanceStatus !== ResistanceStatus.INACTIVE && (
            (() => {
              // Use the calculated outcome (based on math) rather than the persisted status (which might be stale/buggy)
              // to ensure the banner matches the badge and the actual score.
              const config = getStatusConfig(resistanceOutcome);
              const StatusIcon = config.icon;

              // Map simple color names to Tailwind classes
              const borderColor = 'border-blue-500/50';
              const bgColor = 'bg-blue-900/20';
              const textColor = 'text-blue-400';

              return (
                <div className={`w-full mb-6 p-4 border-2 rounded relative overflow-hidden flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 crt-overlay
                    ${borderColor} ${bgColor}
                 `}>
                  <StatusIcon className={`${textColor} w-8 h-8 z-10`} />

                  <div className="flex flex-col items-center z-10">
                    <div
                      className={`text-xl font-black uppercase tracking-widest ${textColor} glitch-text`}
                      data-text={config.text}
                    >
                      {config.text}
                    </div>
                    {config.description && (
                      <div className={`text-xs md:text-sm font-mono mt-1 ${textColor} opacity-80 max-w-[90%] md:max-w-none text-center`}>
                        {config.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}

        </div>



        {/* Share Button Section */}
        <div className="w-full flex flex-col items-center mb-8 gap-2">
          {shareFeedback === 'MANUAL' ? (
            <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500/50 p-4 rounded flex flex-col gap-3">
              <div className="text-amber-500 font-bold uppercase tracking-wide text-sm text-center">
                Long-press to select, then copy:
              </div>
              <textarea
                readOnly
                value={manualCopyText}
                className="w-full h-40 bg-stone-950 border border-stone-700 p-3 text-stone-300 font-mono text-xs rounded resize-none"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={() => {
                  setShareFeedback('IDLE');
                  setManualCopyText('');
                }}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-300 uppercase tracking-wide text-sm font-bold rounded"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleShare}
                disabled={shareFeedback !== 'IDLE'}
                className={`relative group px-12 py-4 border-4 transition-all duration-200 uppercase tracking-widest font-black text-xl flex items-center gap-3 overflow-hidden
                        ${shareFeedback === 'COPIED'
                    ? 'border-green-500 bg-green-900/20 text-green-500'
                    : 'border-stone-500 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-400'
                  }
                    `}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

                {shareFeedback === 'COPIED' ? (
                  <>
                    <Clipboard className="w-6 h-6 animate-bounce" />
                    <span>COPIED TO CLIPBOARD</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span>Share Report</span>
                  </>
                )}

                {/* Decorative Corners */}
                <div className="absolute top-0 left-0 w-2 h-2 bg-current"></div>
                <div className="absolute top-0 right-0 w-2 h-2 bg-current"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 bg-current"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-current"></div>
              </button>
            </>
          )}
        </div>

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
                      ? (() => {
                        const { tool, index, targetIndex } = step.move;
                        const t = tool.toUpperCase();
                        const indices = [index];

                        if (targetIndex !== undefined) {
                          indices.push(targetIndex);
                        } else if (['SINK', 'SWAP', 'MERGE'].includes(t)) {
                          // Implicit adjacent operation
                          indices.push(index + 1);
                        }
                        return indices;
                      })()
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
                                const isDirectional = ['PROMOTE', 'DEMOTE', 'SWAP', 'MIRROR'].includes(step.move.tool.toUpperCase());
                                return ToolIcon ? <ToolIcon size={16} className={`text-amber-500 ${isMobile && isDirectional ? 'rotate-90' : ''}`} /> : null;
                              })()}
                              <span className="text-amber-500 font-bold uppercase tracking-wider">{step.move.tool}</span>
                              <span className="text-stone-500">
                                {(() => {
                                  const isAdjacent = ['swap', 'merge', 'sink', 'cycle'].includes(step.move.tool);
                                  if (isAdjacent && step.move.targetIndex === undefined) {
                                    return `Index ${step.move.index} & ${step.move.index + 1}`;
                                  }
                                  if (step.move.targetIndex !== undefined) {
                                    return `${step.move.targetIndex} ↔ ${step.move.index}`;
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

        <div className="flex gap-8 justify-center mt-10 mb-2">
          <a href="https://discord.gg/PpzQeQ5TNn" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-[#5865F2] transition-colors w-12 h-12 flex items-center justify-center bg-stone-900/80 rounded-full border border-amber-600/40 hover:border-[#5865F2]/60 shadow-lg hover:shadow-[#5865F2]/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
          </a>
          <a href="https://timeshapers.com/#newsletter" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-amber-500 transition-colors w-12 h-12 flex items-center justify-center bg-stone-900/80 rounded-full border border-amber-600/40 hover:border-amber-500/60 shadow-lg hover:shadow-amber-500/20">
            <Mail size={24} />
          </a>
        </div>

        {/* Attribution */}
        <div className="w-full flex justify-center mt-12 mb-4 hover:opacity-100 transition-opacity">
          <FooterAttribution />
        </div>

      </div>
    </div >
  );
};

