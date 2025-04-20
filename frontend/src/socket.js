import { io } from "socket.io-client";

export const socket = io("/", {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
}); 