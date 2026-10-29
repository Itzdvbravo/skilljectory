import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert as RNAlert,
  AlertButton,
  Dimensions,
} from 'react-native';

interface AlertData {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

let alertHandler: ((data: AlertData) => void) | null = null;

/**
 * Replace the native Alert.alert globally with in-app clean modal popup.
 */
RNAlert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
  if (alertHandler) {
    alertHandler({ title, message, buttons });
  }
};

export const showModalAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
  RNAlert.alert(title, message, buttons);
};

export const CustomModalAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAlert, setCurrentAlert] = useState<AlertData | null>(null);

  useEffect(() => {
    alertHandler = (data: AlertData) => {
      setCurrentAlert(data);
    };

    return () => {
      alertHandler = null;
    };
  }, []);

  const handleButtonPress = (btn?: AlertButton) => {
    setCurrentAlert(null);
    if (btn && btn.onPress) {
      setTimeout(() => {
        btn.onPress?.();
      }, 50);
    }
  };

  const buttons = currentAlert?.buttons && currentAlert.buttons.length > 0
    ? currentAlert.buttons
    : [{ text: 'OK' }];

  const isStacked = buttons.length > 2;

  return (
    <>
      {children}
      <Modal
        visible={currentAlert !== null}
        transparent
        animationType="fade"
        onRequestClose={() => handleButtonPress()}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>{currentAlert?.title}</Text>
            {currentAlert?.message ? (
              <Text style={styles.message}>{currentAlert.message}</Text>
            ) : null}

            <View style={[styles.btnContainer, isStacked && styles.btnContainerStacked]}>
              {buttons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.btn,
                      isCancel && styles.cancelBtn,
                      isDestructive && styles.destructiveBtn,
                      isStacked && styles.btnStacked,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleButtonPress(btn)}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        isCancel && styles.cancelBtnText,
                        isDestructive && styles.destructiveBtnText,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  btnContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  btnContainerStacked: {
    flexDirection: 'column',
  },
  btn: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnStacked: {
    flex: undefined,
    width: '100%',
  },
  cancelBtn: {
    backgroundColor: '#334155',
  },
  destructiveBtn: {
    backgroundColor: '#DC2626',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtnText: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  destructiveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
