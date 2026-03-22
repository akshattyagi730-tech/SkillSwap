import { useEffect, useCallback } from 'react';

// ── Request browser notification permission ──────────
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied')  return 'denied';
  const result = await Notification.requestPermission();
  return result;
};

// ── Show a browser notification ──────────────────────
export const showBrowserNotification = (title, options = {}) => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notif = new Notification(title, {
    icon:   '/favicon.ico',
    badge:  '/favicon.ico',
    silent: false,
    ...options,
  });

  // Auto close after 5s
  setTimeout(() => notif.close(), 5000);

  // Click opens the app
  notif.onclick = () => {
    window.focus();
    if (options.url) window.location.href = options.url;
    notif.close();
  };

  return notif;
};

// ── Custom hook — use in App or any component ────────
export const useNotifications = (socket) => {

  // Ask permission once on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // New message
  const notifyMessage = useCallback((fromName, preview) => {
    // Don't notify if tab is focused
    if (document.visibilityState === 'visible') return;
    showBrowserNotification(`💬 New message from ${fromName}`, {
      body: preview?.slice(0, 80) || 'You have a new message',
      tag:  'message',
      url:  '/chat',
    });
  }, []);

  // New match
  const notifyMatch = useCallback((matchName) => {
    showBrowserNotification(`🔥 New match: ${matchName}!`, {
      body: 'You have a new skill match. Start chatting!',
      tag:  'match',
      url:  '/matches',
    });
  }, []);

  // New review
  const notifyReview = useCallback((fromName, rating) => {
    showBrowserNotification(`⭐ ${fromName} rated you ${rating}/5`, {
      body: 'Check your profile to see the review.',
      tag:  'review',
      url:  '/profile',
    });
  }, []);

  // Session reminder
  const notifySession = useCallback((skill, otherName) => {
    showBrowserNotification(`⏰ Session reminder: ${skill}`, {
      body: `Your session with ${otherName} is coming up!`,
      tag:  'session',
      url:  '/chat',
    });
  }, []);

  return { notifyMessage, notifyMatch, notifyReview, notifySession };
};