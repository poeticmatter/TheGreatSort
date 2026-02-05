import { useEffect, useRef } from 'react';

export function useAssetPreloader(assets: string[], delay: number = 2500) {
    // Use a ref to track if we've initiated preloading to avoid effect re-runs
    // though dependent on assets/delay, strict mode might double invoke.
    const assetsRef = useRef(assets);

    useEffect(() => {
        const timer = setTimeout(() => {
            assetsRef.current.forEach(src => {
                const img = new Image();
                img.src = src;
                img.decode()
                    .then(() => {
                        // Preload success - fire and forget
                    })
                    .catch((e) => {
                        // Preload failed - silent fail
                    });
            });
        }, delay);

        return () => clearTimeout(timer);
    }, [delay]);
}
