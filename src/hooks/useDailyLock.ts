import { useState, useEffect } from 'react';

const LOCK_PREFIX = 'tgs_daily_lock_';

export function useDailyLock(dateKey: string, onLockConfirmed: () => void) {
  const [isLocked, setIsLocked] = useState(false);
  const [isWarningOpen, setIsWarningOpen] = useState(false);

  useEffect(() => {
    const locked = localStorage.getItem(`${LOCK_PREFIX}${dateKey}`) === 'true';
    setIsLocked(locked);
  }, [dateKey]);

  const requestAudit = () => {
    // If already locked, we just proceed (user is viewing audit again)
    // If not locked, we warn them
    if (isLocked) {
        onLockConfirmed();
    } else {
        setIsWarningOpen(true);
    }
  };

  const confirmAuditLock = () => {
      setIsLocked(true);
      localStorage.setItem(`${LOCK_PREFIX}${dateKey}`, 'true');
      setIsWarningOpen(false);
      onLockConfirmed();
  };

  const cancelAuditLock = () => {
      setIsWarningOpen(false);
  };

  return { 
      isLocked, 
      isWarningOpen, 
      requestAudit, 
      confirmAuditLock,
      cancelAuditLock 
  };
}
