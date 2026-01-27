import React from 'react';

const DailyCompletionNotice: React.FC = () => {
  return (
    <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
      <p className="text-zinc-500 font-serif italic text-sm tracking-wide">
        Daily quota complete, comrade. Your duties lie with your family now, come back tomorrow for more work.
      </p>
      <div className="w-12 h-px bg-zinc-800 mx-auto mt-4" />
    </div>
  );
};

export default DailyCompletionNotice;
