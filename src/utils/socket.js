import { io } from 'socket.io-client';
import { getAuthData } from './auth';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const authData = getAuthData();
    if (!authData?.token) {
      console.warn('No auth token available for socket connection');
      return null;
    }

    this.socket = io('http://localhost:5050', {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('🔗 Socket connected');
      this.isConnected = true;
      
      // Authenticate the socket connection
      this.socket.emit('authenticate', authData.token);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('authError', (error) => {
      console.error('❌ Socket authentication error:', error);
    });

    // Handle notification count updates
    this.socket.on('notificationCount', (data) => {
      this.emit('notificationCount', data);
    });

    // Handle new notifications
    this.socket.on('newNotification', (notification) => {
      this.emit('newNotification', notification);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Get current connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id
    };
  }
}

// Create singleton instance
const socketManager = new SocketManager();

export default socketManager; 