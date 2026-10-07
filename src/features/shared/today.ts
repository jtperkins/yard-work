import { useEffect, useState } from 'react';
import { todayCR, type ISODate } from '../../shared/dates';

/**
 * Today's date in Costa Rica. Re-checks every minute so a phone left open overnight rolls over
 * to the new day without a reload.
 */
export function useToday(): ISODate {
  const [today, setToday] = useState(() => todayCR());
  useEffect(() => {
    const timer = setInterval(() => {
      const now = todayCR();
      setToday((prev) => (prev === now ? prev : now));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);
  return today;
}
