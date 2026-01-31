import { useState, useEffect } from 'react';

const LOCK_PREFIX = 'tgs_daily_lock_';

export function useDailyLock(dateKey: string, onLockConfirmed: () => void) {
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const locked = localStorage.getItem(`${LOCK_PREFIX}${dateKey}`) === 'true';
    setIsLocked(locked);
  }, [dateKey]);

  const requestAudit = () => {
    // Immediately lock and confirm
    if (!isLocked) {
      setIsLocked(true);
      localStorage.setItem(`${LOCK_PREFIX}${dateKey}`, 'true');
    }
    onLockConfirmed();
  };

  const lockSession = () => {
    setIsLocked(true);
    localStorage.setItem(`${LOCK_PREFIX}${dateKey}`, 'true');
  };

  return {
    isLocked,
    requestAudit,
    lockSession
  };
}
