'use client';

import { useState } from 'react';

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

const ROOM_DISPLAY_NAMES: Record<string, string> = {
  'Standard':     'Standard Room',
  'Premium':      'Premium Room',
  'Comfort Plus': 'Comfort Plus',
};

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
      const response = await fetch('/api/rooms/toggle-status', {
        method: 'POST',
        body: data,
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.message || 'Failed to update room status.');
        return;
      }
      setMessage(result.message);
      setActiveRooms((prev) =>
        prev.map((room) => (room.room_number === roomNumber ? { ...room, status } : room))
      );
    } catch (err) {
      setError('Could not update room status.');
    } finally {
      setLoadingRoom(null);
    }
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'Available':
        return 'badge-green';
      case 'Booked':
        return 'badge-red';
      case 'Reserved':
        return 'badge-yellow';
      default:
        return '';
    }
  };

  return (
    <div className="grid gap-4">
      {message && <div className="p-3.5 rounded-[12px] bg-[#e9f7ef] text-[#175d30] font-semibold">{message}</div>}
      {error && <div className="error-msg p-3.5 rounded-[12px] bg-[#fdf2f2] text-[#9b1c1c] font-semibold">{error}</div>}

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-background">
                {['Room #', 'Type', 'Rate', 'Status', 'Update Status Actions'].map((heading) => (
                  <th key={heading} className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] text-left font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRooms.map((room) => {
                const badgeClass = getBadgeClass(room.status);
                return (
                  <tr key={room.id} className="bg-surface">
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)] font-bold">
                      Room {room.room_number}
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      {ROOM_DISPLAY_NAMES[room.room_type] || room.room_type}
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      PKR {room.price_per_night}
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      {badgeClass ? (
                        <span className={`badge ${badgeClass}`}>{room.status}</span>
                      ) : (
                        <span className="badge badge-gray">
                          {room.status}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 border-b border-[rgba(0,0,0,0.08)]">
                      <div className="flex gap-2">
                        {['Available', 'Maintenance', 'Reserved', 'Booked'].map((status) => {
                          const isCurrent = room.status === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              className={`btn px-3 py-1.5 min-h-[32px] text-[0.85rem] ${
                                isCurrent
                                  ? 'btn-primary'
                                  : 'btn-outline'
                              } ${loadingRoom === room.room_number ? 'opacity-60' : ''}`}
                              onClick={() => handleStatusChange(room.room_number, status)}
                              disabled={isCurrent || loadingRoom === room.room_number}
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
