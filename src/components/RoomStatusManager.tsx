'use client';

import { useState } from 'react';
import { ROOM_DISPLAY_NAMES } from '@/utils/roomTypes';

interface RoomRow {
  id: number;
  room_number: string;
  room_type: string;
  status: string;
  price_per_night: number;
}

interface RoomStatusManagerProps {
  rooms: RoomRow[];
}



const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Available: { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)', dot: '#34d399' },
  Booked:    { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)', dot: '#f87171' },
  Reserved:  { bg: 'rgba(234,179,8,0.12)', text: '#facc15', border: 'rgba(234,179,8,0.3)', dot: '#facc15' },
  Maintenance:{ bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)', dot: '#fbbf24' },
};
const DEFAULT_STYLE = { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', border: 'rgba(100,116,139,0.3)', dot: '#94a3b8' };

export default function RoomStatusManager({ rooms }: RoomStatusManagerProps) {
  const [activeRooms, setActiveRooms] = useState(rooms);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingRoom, setLoadingRoom] = useState<string | null>(null);

  const handleStatusChange = async (roomNumber: string, status: string) => {
    setLoadingRoom(roomNumber);
    setError(null);
    setMessage(null);

    const data = new FormData();
    data.append('room_number', roomNumber);
    data.append('status', status);

    try {
      const response = await fetch('/api/rooms/toggle-status', { method: 'POST', body: data });
      const result = await response.json();
      if (!result.success) {
        setError(result.message || 'Failed to update room status.');
        return;
      }
      setMessage(result.message);
      setActiveRooms((prev) =>
        prev.map((room) => (room.room_number === roomNumber ? { ...room, status } : room))
      );
    } catch {
      setError('Could not update room status.');
    } finally {
      setLoadingRoom(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {message && <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium">✓ {message}</div>}
      {error && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-medium">✕ {error}</div>}

      <div className="bg-[#16283f] border border-white/10 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[780px] text-sm">
            <thead>
              <tr className="bg-[#0e1e33] text-left text-xs font-semibold text-[#b7c0cb] uppercase tracking-wider">
                {['Room #', 'Type', 'Rate / Night', 'Current Status', 'Update Status'].map((h) => (
                  <th key={h} className="border-b border-white/10 whitespace-nowrap" style={{ padding: '18px 22px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeRooms.map((room) => {
                const s = STATUS_STYLES[room.status] || DEFAULT_STYLE;
                return (
                  <tr key={room.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="font-bold text-white whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>Room {room.room_number}</td>
                    <td className="text-slate-300 whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>{ROOM_DISPLAY_NAMES[room.room_type] || room.room_type}</td>
                    <td className="text-slate-200 font-medium whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>PKR {Number(room.price_per_night).toLocaleString()}</td>
                    <td className="whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>
                      <span className="inline-flex items-center gap-2 rounded-lg text-xs font-semibold border" style={{ background: s.bg, color: s.text, borderColor: s.border, paddingLeft: '14px', paddingRight: '14px', paddingTop: '6px', paddingBottom: '6px' }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.dot }} />{room.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap align-middle" style={{ padding: '18px 22px' }}>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {['Available', 'Maintenance', 'Reserved', 'Booked'].map((status) => {
                          const isCurrent = room.status === status;
                          const isLoading = loadingRoom === room.room_number;
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleStatusChange(room.room_number, status)}
                              disabled={isCurrent || isLoading}
                              className={`rounded-xl text-xs font-semibold transition-all border whitespace-nowrap shadow-sm ${
                                isCurrent
                                  ? 'bg-[#d9b571]/20 border-[#d9b571]/50 text-[#d9b571] cursor-default'
                                  : 'bg-white/10 border-white/20 text-slate-200 hover:border-white/30 hover:text-white hover:bg-white/20'
                              } ${isLoading ? 'opacity-50' : ''}`}
                              style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '7px', paddingBottom: '7px' }}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
