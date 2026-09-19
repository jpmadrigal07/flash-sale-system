import { useEffect, useMemo, useState } from 'react';
import type { SaleStatusResponse } from '@flash-sale/shared';

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (days > 0 || hours > 0) {
    parts.push(`${hours}h`);
  }
  if (days > 0 || hours > 0 || minutes > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

interface SaleStatusProps {
  data: SaleStatusResponse | undefined;
  dataUpdatedAt: number;
  isLoading: boolean;
  error: Error | null;
}

export function SaleStatus({ data, dataUpdatedAt, isLoading, error }: SaleStatusProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const countdown = useMemo(() => {
    if (!data) {
      return null;
    }
    const alignedNow = Date.parse(data.serverTime) + Math.max(0, now - dataUpdatedAt);
    if (data.status === 'upcoming') {
      return `Starts in ${formatDuration(Date.parse(data.startTime) - alignedNow)}`;
    }
    if (data.status === 'active') {
      return `Ends in ${formatDuration(Date.parse(data.endTime) - alignedNow)}`;
    }
    return 'Sale has ended';
  }, [data, dataUpdatedAt, now]);

  if (isLoading) {
    return <section className="sale-status">Loading sale status…</section>;
  }
  if (error || !data) {
    return <section className="sale-status">Unable to load sale status.</section>;
  }

  return (
    <section className="sale-status">
      <p>
        Status: <strong>{data.status}</strong>
      </p>
      <p>
        Remaining stock: <strong>{data.remainingStock}</strong> / {data.totalStock}
      </p>
      <p>{countdown}</p>
    </section>
  );
}
