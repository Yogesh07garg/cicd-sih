import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000', {
        auth: {
          userId: user.id,
          role: user.role,
        },
      });

      newSocket.on('connect', () => {
        setConnected(true);
        console.log('Socket connected');
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
        console.log('Socket disconnected');
      });

      // Listen for new notices
      newSocket.on('new_notice', (notice) => {
        toast.success(`New Notice: ${notice.title}`, {
          duration: 5000,
        });
      });

      // Listen for attendance updates
      newSocket.on('attendance_marked', (data) => {
        toast.success(`Attendance marked for ${data.subject}`, {
          duration: 3000,
        });
      });

      // Listen for class session updates
      newSocket.on('class_session_started', (data) => {
        if (user.role === 'STUDENT') {
          toast(`New class session: ${data.subject}`, { duration: 4000 });
        }
      });

      // Listen for session ended notifications
      newSocket.on('class_session_ended', (data) => {
        if (user.role === 'STUDENT') {
          toast(`Class session ended: ${data.subject}`, { duration: 3000 });
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
        setSocket(null);
        setConnected(false);
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};