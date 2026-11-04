import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { OnlineUser } from '../types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: OnlineUser[];
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, logout } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    // If not logged in, disconnect socket if open
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Old sessions saved before tokens were required: make the user log in again
    if (!token) {
      logout();
      return;
    }

    const s = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      auth: { token },
    });

    s.on('connect_error', (err) => {
      if (err.message === 'Unauthorized') {
        logout();
      }
    });

    s.on('connect', () => {
      setIsConnected(true);
      // Announce user
      s.emit('user:join', {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        channelId: 'general',
      });
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('presence:update', (data: { onlineUsers: OnlineUser[] }) => {
      setOnlineUsers(data.onlineUsers || []);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user?.id, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
