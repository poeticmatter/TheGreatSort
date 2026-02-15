import React, { useState, useEffect } from 'react';
import { GameView } from './GameView';
import { useTutorialEngine } from '../../hooks/useTutorialEngine';
import { LayoutType } from '../InventoryGrid';


export function TutorialPage() {
    const { data, interaction, actions } = useTutorialEngine();


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


        </div>
    );
}
