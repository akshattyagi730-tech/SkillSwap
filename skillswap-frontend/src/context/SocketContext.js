import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socketRef  = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    socketRef.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5001', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect',    () => setIsConnected(true));
    socketRef.current.on('disconnect', () => setIsConnected(false));
    window._skillswapSocket = socketRef.current;
    socketRef.current.on('user_online',  ({ userId }) =>
      setOnlineUsers(p => new Set([...p, userId])));
    socketRef.current.on('user_offline', ({ userId }) =>
      setOnlineUsers(p => { const n = new Set(p); n.delete(userId); return n; }));

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, user]);

  const sendMessage = (receiverId, content, onSent, onError) => {
    if (!socketRef.current?.connected) { onError?.('Not connected'); return; }
    socketRef.current.emit('send_message', { receiverId, content });
    socketRef.current.once('message_sent',  (msg) => onSent?.(msg));
    socketRef.current.once('message_error', (err) => onError?.(err.error));
  };

  const onReceiveMessage = (cb) => {
    socketRef.current?.on('receive_message', cb);
    return () => socketRef.current?.off('receive_message', cb);
  };

  const emitTyping = (receiverId, isTyping) => {
    socketRef.current?.emit('typing', { receiverId, isTyping });
  };

  const onTyping = (cb) => {
    socketRef.current?.on('user_typing', cb);
    return () => socketRef.current?.off('user_typing', cb);
  };

  const markRead = (senderId) =>
    socketRef.current?.emit('mark_read', { senderId });

  // ── Call end — dono users ke liye ──────────────────
  const emitCallEnd = (receiverId, roomName, callMsgId, duration) => {
    socketRef.current?.emit('call_end', { receiverId, roomName, callMsgId, duration });
  };

  const onCallEnd = (cb) => {
    socketRef.current?.on('call_ended', cb);
    return () => socketRef.current?.off('call_ended', cb);
  };

  const onCallMsgUpdated = (cb) => {
    socketRef.current?.on('call_msg_updated', cb);
    return () => socketRef.current?.off('call_msg_updated', cb);
  };

  return (
    <SocketContext.Provider value={{
      isConnected, onlineUsers,
      sendMessage, onReceiveMessage,
      emitTyping, onTyping, markRead,
      emitCallEnd, onCallEnd, onCallMsgUpdated,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);