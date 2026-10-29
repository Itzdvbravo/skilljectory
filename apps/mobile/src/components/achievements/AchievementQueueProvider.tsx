import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { NotificationDto } from '@skill-exchange/shared-types';
import { AchievementToast } from './AchievementToast';
import { api } from '../../services/api';

interface AchievementQueueContextType {
  enqueue: (notification: NotificationDto) => void;
  refetchUnseen: () => Promise<void>;
}

const AchievementQueueContext = createContext<AchievementQueueContextType>({
  enqueue: () => {},
  refetchUnseen: async () => {},
});

export const useAchievementQueue = () => useContext(AchievementQueueContext);

interface ProviderProps {
  children: ReactNode;
}

export const AchievementQueueProvider: React.FC<ProviderProps> = ({ children }) => {
  const [queue, setQueue] = useState<NotificationDto[]>([]);
  const [currentToast, setCurrentToast] = useState<NotificationDto | null>(null);

  const refetchUnseen = async () => {
    try {
      const unseen = await api.getNotifications();
      if (Array.isArray(unseen) && unseen.length > 0) {
        setQueue((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const newItems = unseen.filter((i) => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      }
    } catch {
      // Quiet fail if server unreachable
    }
  };

  useEffect(() => {
    refetchUnseen();
  }, []);

  // Show next item in queue when current toast is null
  useEffect(() => {
    if (!currentToast && queue.length > 0) {
      const next = queue[0];
      setCurrentToast(next);
      setQueue((prev) => prev.slice(1));
    }
  }, [currentToast, queue]);

  const handleDismiss = async () => {
    if (currentToast) {
      try {
        await api.ackNotification(currentToast.id);
      } catch {
        // Ignored
      }
      setCurrentToast(null);
    }
  };

  const enqueue = (notification: NotificationDto) => {
    setQueue((prev) => [...prev, notification]);
  };

  return (
    <AchievementQueueContext.Provider value={{ enqueue, refetchUnseen }}>
      <View style={styles.wrapper}>
        {children}
        {currentToast && (
          <AchievementToast
            notification={currentToast}
            onDismiss={handleDismiss}
          />
        )}
      </View>
    </AchievementQueueContext.Provider>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
