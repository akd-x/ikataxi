import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token || !user) {
      setSocket(null);
      return undefined;
    }

    const instance = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    setSocket(instance);

    return () => {
      instance.disconnect();
      setSocket(null);
    };
  }, [token, user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
