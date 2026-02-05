/**
 * shareUtils.ts
 * Platform interaction service for sharing content. (Web Share API / Clipboard)
 */

export interface ShareResult {
    success: boolean;
    method: 'share' | 'clipboard' | 'manual';
    textForManualCopy?: string;
}

const isMobileDevice = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|ipad|iphone|ipod/i.test(ua);
};

export const performShare = async (text: string): Promise<ShareResult> => {
    const isMobile = isMobileDevice();
    const hasShareAPI = typeof navigator !== 'undefined' && !!navigator.share;
    const hasClipboardAPI = typeof navigator !== 'undefined' && !!navigator.clipboard;

    // 1. Try Web Share API (Only on Mobile)
    if (isMobile && hasShareAPI) {
        try {
            await navigator.share({
                title: 'The Great Sort Audit',
                text: text,
            });
            return { success: true, method: 'share' };
        } catch (err: any) {
            // User cancellation is expected behavior
            if (err?.name === 'AbortError') {
                return { success: true, method: 'share' };
            }
            // Fall through to clipboard
        }
    }

    // 2. Clipboard Fallback
    if (hasClipboardAPI) {
        try {
            await navigator.clipboard.writeText(text);
            return { success: true, method: 'clipboard' };
        } catch {
            // Fall through to manual
        }
    }

    // 3. Manual fallback - no APIs available (likely non-HTTPS)
    return { success: true, method: 'manual', textForManualCopy: text };
};
