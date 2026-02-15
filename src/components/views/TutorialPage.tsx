import React, { useState, useEffect } from 'react';
import { GameView } from './GameView';
import { useTutorialEngine } from '../../hooks/useTutorialEngine';
import { LayoutType } from '../InventoryGrid';
import { useNavigate } from 'react-router-dom';

export function TutorialPage() {
    const { data, interaction, actions } = useTutorialEngine();
    const navigate = useNavigate();

    const getResponsiveLayout = (): LayoutType => window.innerWidth < 1024 ? 'VERTICAL_LIST' : 'HORIZONTAL_STRIP';
    const [layout, setLayout] = useState<LayoutType>(getResponsiveLayout());

    useEffect(() => {
        const handleResize = () => setLayout(getResponsiveLayout());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="min-h-screen bg-stone-900 text-stone-200 font-sans selection:bg-red-500/30 flex flex-col relative">
            <GameView
                data={data}
                interaction={interaction}
                actions={actions}
                layout={layout}
                onLayoutChange={setLayout}
            />

            {/* Explicit Exit Button for Tutorial */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-4 right-4 z-50 bg-stone-800/80 backdrop-blur text-stone-400 hover:text-stone-200 px-4 py-2 rounded border border-stone-700 hover:border-stone-500 text-xs font-bold uppercase tracking-widest transition-all"
            >
                Exit Tutorial
            </button>
        </div>
    );
}
