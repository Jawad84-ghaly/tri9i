import { useEffect, useRef, useState } from 'react';
import { config } from '../constants/config';
import { demoAlerts } from '../data/demo';
import { fetchAlertSnapshot, validAlerts } from '../services/alertsService';
import type { Coordinate, RoadAlert } from '../types/navigation';

export function useAlerts(center: Coordinate | null, foreground: boolean) {
  const [alerts, setAlerts] = useState<RoadAlert[]>(config.demo ? demoAlerts : []);
  const [status, setStatus] = useState<'live' | 'offline' | 'disabled'>(config.demo || config.alertsUrl ? 'offline' : 'disabled');
  const [partner, setPartner] = useState<'live' | 'offline' | 'disabled'>('disabled');
  const centerRef = useRef(center); centerRef.current = center;
  const available = !!center;
  useEffect(() => {
    if (!foreground || !available) return;
    let cancelled = false, timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      if (config.demo) { setStatus('live'); setAlerts(previous => validAlerts(previous)); }
      else if (config.alertsUrl && centerRef.current) {
        try {
          const result = await fetchAlertSnapshot(centerRef.current, controller.signal);
          if (!cancelled) { setAlerts(result.alerts); setPartner(result.partner); setStatus('live'); }
        } catch { if (!cancelled) { setStatus('offline'); setPartner(previous => previous === 'disabled' ? previous : 'offline'); setAlerts(previous => validAlerts(previous)); } }
      }
      if (!cancelled) timer = setTimeout(poll, config.alertPollMs);
    };
    void poll();
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [foreground, available]);
  return { alerts, status, partner, add: (alert: RoadAlert) => setAlerts(previous => validAlerts([...previous, alert])) };
}
