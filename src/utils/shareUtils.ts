/**
 * shareUtils.ts
 * Platform interaction service for sharing content. (Web Share API / Clipboard)
 */

export interface ShareResult {
    success: boolean;
    method: 'share' | 'clipboard' | 'manual' | 'none';
    error?: string;
    debug: string[];
    textForManualCopy?: string;
}

const isMobileDevice = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|ipad|iphone|ipod/i.test(ua);
};

export const performShare = async (text: string): Promise<ShareResult> => {
    const debug: string[] = [];

    const isMobile = isMobileDevice();
    const hasShareAPI = typeof navigator !== 'undefined' && !!navigator.share;
    const hasClipboardAPI = typeof navigator !== 'undefined' && !!navigator.clipboard;

    debug.push(`Mobile: ${isMobile}`);
    debug.push(`ShareAPI: ${hasShareAPI}`);
    debug.push(`ClipboardAPI: ${hasClipboardAPI}`);
    debug.push(`TextLen: ${text.length}`);

    // 1. Try Web Share API (Only on Mobile)
    if (isMobile && hasShareAPI) {
        try {
            debug.push('Trying share...');
            await navigator.share({
                title: 'The Great Sort Audit',
                text: text,
            });
            debug.push('Share OK');
            return { success: true, method: 'share', debug };
        } catch (err: any) {
            debug.push(`Share err: ${err?.name}`);
            if (err?.name === 'AbortError') {
                return { success: true, method: 'share', debug };
            }
        }
    }

    // 2. Clipboard Fallback
    if (hasClipboardAPI) {
        try {
            debug.push('Trying clipboard...');
            await navigator.clipboard.writeText(text);
            debug.push('Clipboard OK');
            return { success: true, method: 'clipboard', debug };
        } catch (err: any) {
            debug.push(`Clipboard err: ${err?.name}`);
        }
    }

    // 3. Manual fallback - no APIs available (likely non-HTTPS)
    debug.push('Fallback: manual copy');
    return { success: true, method: 'manual', debug, textForManualCopy: text };
};
