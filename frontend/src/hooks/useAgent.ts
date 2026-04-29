import { useState, useEffect } from 'react';

export interface Valuation {
  program: string;
  value: string;
}

export function useAgent() {
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onclose = () => {
      setStatus('disconnected');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'LIVE_DATA_UPDATE' || payload.type === 'FINAL_RESULT') {
            const data = payload.type === 'LIVE_DATA_UPDATE' ? payload.data.valuations : payload.data.strategy.live_valuations;
            if (data && data.length > 0) {
                 setValuations(data);
            }
        }
      } catch (e) {
        console.error("Failed to parse websocket message", e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return { valuations, status };
}
