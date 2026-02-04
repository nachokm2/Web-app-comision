import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const NotificationContext = createContext(null);
const PENDING_KEYWORDS = ['pendiente', 'espera', 'revision', 'revisión'];
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

function isPendingStatus (value = '') {
  const normalized = value.toLowerCase();
  return PENDING_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function uniqueId (prefix = 'notif') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function NotificationProvider ({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const navigatorRef = useRef(null);
  const notificationsRef = useRef([]);
  const socketRef = useRef(null);
  const realtimeListenersRef = useRef(new Set());
  const audioContextRef = useRef(null);
  const pendingStateRef = useRef({ ids: new Set(), initialized: false });
  const pendingNavigationRef = useRef(null);

  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const resumeAudio = () => {
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    };
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach((eventName) => {
      window.addEventListener(eventName, resumeAudio, { once: true, passive: true });
    });
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, resumeAudio));
    };
  }, []);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const playTone = (frequency, startOffset = 0, duration = 0.22) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        const startTime = ctx.currentTime + startOffset;
        const endTime = startTime + duration;
        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.08, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start(startTime);
        oscillator.stop(endTime + 0.02);
      };

      // Pequeña secuencia ascendente (660 Hz seguido de 880 Hz)
      playTone(660, 0, 0.18);
      playTone(880, 0.18, 0.22);
    } catch (error) {
      console.warn('No se pudo reproducir el sonido de notificación', error);
    }
  }, [getAudioContext]);

  const pushNotification = useCallback((notification, { openPanel = false, playSound = true } = {}) => {
    if (!notification) return;
    setNotifications((prev) => {
      const filtered = prev.filter((item) => item.id !== notification.id);
      const next = [notification, ...filtered];
      return next.sort((a, b) => b.timestamp - a.timestamp);
    });
    if (playSound) {
      playNotificationSound();
    }
    if (openPanel) {
      setIsPanelOpen(true);
    }
  }, [playNotificationSound]);

  const buildNotificationPayload = useCallback((type, payload = {}) => {
    const record = payload.record || payload.commission || {};
    const originalPayload = payload.payload || {};
    const fallbackSubject = payload.fallbackTitle || originalPayload.nombres || originalPayload.rut || record.rut_estudiante;
    const subject = record.title || fallbackSubject || 'Sin referencia';
    let baseTitle = 'Actualización';
    if (type === 'record-created') baseTitle = 'Registro agregado';
    if (type === 'record-updated') baseTitle = 'Registro editado';
    const description = payload.description || (type === 'record-created'
      ? 'Se ingresó un registro manualmente'
      : 'Se actualizó un registro existente');
    return {
      id: payload.id || uniqueId(type),
      category: type,
      title: `${baseTitle} · ${subject}`,
      description,
      timestamp: payload.timestamp || Date.now(),
      read: payload.read ?? false,
      targetId: record.id || payload.entryId || null,
      targetRut: record.rut_estudiante || originalPayload.rut || null,
      meta: {
        status: record.status || originalPayload.estadoPago || null,
        amount: record.amount || originalPayload.valorComision || null
      }
    };
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  }, []);

  const openNotification = useCallback((notificationId) => {
    setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)));
    const target = notificationsRef.current.find((item) => item.id === notificationId);
    if (target) {
      pendingNavigationRef.current = target;
      if (typeof navigatorRef.current === 'function') {
        navigatorRef.current(target);
        pendingNavigationRef.current = null;
      } else if (location.pathname !== '/') {
        navigate('/');
      }
    }
    setIsPanelOpen(false);
  }, [location.pathname, navigate]);

  const registerNavigator = useCallback((handler) => {
    navigatorRef.current = handler;
    if (handler && pendingNavigationRef.current) {
      handler(pendingNavigationRef.current);
      pendingNavigationRef.current = null;
    }
    return () => {
      if (navigatorRef.current === handler) {
        navigatorRef.current = null;
      }
    };
  }, []);

  const syncPendingCases = useCallback((records = []) => {
    setNotifications((prev) => {
      const pendingRecords = records.filter((record) => isPendingStatus(record.status));
      const pendingIds = new Set(pendingRecords.map((record) => `pending-${record.id}`));
      const prevMap = new Map(prev.map((notification) => [notification.id, notification]));
      const next = [];

      const pendingState = pendingStateRef.current;
      const hadPending = pendingState.ids;
      const hasNewPending = pendingRecords.some((record) => !hadPending.has(`pending-${record.id}`));
      pendingState.ids = pendingIds;
      if (pendingState.initialized && hasNewPending) {
        playNotificationSound();
      }
      if (!pendingState.initialized) {
        pendingState.initialized = true;
      }

      pendingRecords.forEach((record) => {
        const id = `pending-${record.id}`;
        const existing = prevMap.get(id);
        next.push({
          id,
          category: 'pending-case',
          title: record.title || record.rut_estudiante || 'Caso sin título',
          description: `Pendiente · ${record.asesor || 'Sin asesor'}`,
          timestamp: existing?.timestamp || Date.now(),
          read: existing?.read ?? false,
          targetId: record.id,
          targetRut: record.rut_estudiante,
          meta: {
            amount: record.amount,
            status: record.status
          }
        });
      });

      prev.forEach((notification) => {
        if (notification.category === 'pending-case' && !pendingIds.has(notification.id)) {
          return;
        }
        if (pendingIds.has(notification.id)) {
          return;
        }
        next.push(notification);
      });

      return next.sort((a, b) => b.timestamp - a.timestamp);
    });
  }, [playNotificationSound]);

  const notifyEvent = useCallback((type, payload = {}) => {
    const notification = buildNotificationPayload(type, payload);
    pushNotification(notification, { openPanel: true, playSound: true });
  }, [buildNotificationPayload, pushNotification]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.on('record-event', (event) => {
      if (event?.type === 'record-created' || event?.type === 'record-updated') {
        const notification = buildNotificationPayload(event.type, {
          record: event.record,
          id: event.id,
          timestamp: event.timestamp ? Date.parse(event.timestamp) : Date.now(),
          description: event.description
        });
        pushNotification(notification, { playSound: true });
      }
      realtimeListenersRef.current.forEach((listener) => {
        try {
          listener(event);
        } catch (listenerError) {
          console.error('Listener de notificaciones falló', listenerError);
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [buildNotificationPayload, pushNotification]);

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  const registerRealtimeListener = useCallback((listener) => {
    if (typeof listener !== 'function') {
      return () => {};
    }
    realtimeListenersRef.current.add(listener);
    return () => {
      realtimeListenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    isPanelOpen,
    togglePanel,
    closePanel,
    markAllAsRead,
    openNotification,
    syncPendingCases,
    notifyEvent,
    registerNavigator,
    registerRealtimeListener
  }), [notifications, unreadCount, isPanelOpen, togglePanel, closePanel, markAllAsRead, openNotification, syncPendingCases, notifyEvent, registerNavigator, registerRealtimeListener]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications () {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  }
  return ctx;
}
