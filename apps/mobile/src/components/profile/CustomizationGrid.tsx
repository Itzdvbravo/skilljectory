import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import {
  Lock,
  Check,
  Sparkles,
  Coins,
  GraduationCap,
  X as CloseIcon,
} from 'lucide-react-native';
import {
  CustomizationOptionDto,
  CustomizationUnlockType,
  CustomizationTier,
} from '@skill-exchange/shared-types';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface CustomizationGridProps {
  items: CustomizationOptionDto[];
  userBalance: number;
  sessionsTaughtCount: number;
  onRefresh: () => void;
}

export const CustomizationGrid: React.FC<CustomizationGridProps> = ({
  items,
  userBalance,
  sessionsTaughtCount,
  onRefresh,
}) => {
  const [selectedItem, setSelectedItem] = useState<CustomizationOptionDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const updateUser = useAuthStore((s) => s.updateUser);

  const handleTilePress = (item: CustomizationOptionDto) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleUnlock = async () => {
    if (!selectedItem) return;
    try {
      setActionLoading(true);
      await api.unlockCustomization(selectedItem.id);
      if (selectedItem.unlockType === CustomizationUnlockType.CREDITS) {
        updateUser({ creditBalance: userBalance - selectedItem.unlockValue });
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      Alert.alert('Unlock Failed', err.message || 'Unable to unlock customization.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedItem) return;
    try {
      setActionLoading(true);
      await api.activateCustomization(selectedItem.id);
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      Alert.alert('Activation Failed', err.message || 'Unable to apply customization.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>SHOWCASE CUSTOMIZATION CATALOG</Text>
        <View style={styles.statPill}>
          <Coins size={14} color="#FBBF24" />
          <Text style={styles.statPillText}>{userBalance} Credits</Text>
        </View>
      </View>

      <Text style={styles.sectionSubtitle}>
        Basic options unlock with credits; Advanced prestigious tiers unlock strictly through campus teaching sessions.
      </Text>

      {/* Grid of Customization Tiles */}
      <View style={styles.grid}>
        {items.map((item) => {
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.tile,
                !item.isUnlocked && styles.tileLocked,
                item.isActive && styles.tileActive,
              ]}
              onPress={() => handleTilePress(item)}
              activeOpacity={0.8}
            >
              {/* Category & Tier Tag */}
              <View style={styles.tileHeader}>
                <Text style={styles.categoryBadge}>{item.category.toUpperCase()}</Text>
                {item.tier === CustomizationTier.ADVANCED ? (
                  <View style={styles.tierTagAdvanced}>
                    <Text style={styles.tierTagText}>ADVANCED</Text>
                  </View>
                ) : (
                  <View style={styles.tierTagBasic}>
                    <Text style={styles.tierTagText}>BASIC</Text>
                  </View>
                )}
              </View>

              <Text style={styles.tileLabel} numberOfLines={2}>
                {item.label}
              </Text>

              {/* Status / Requirement Indicator */}
              <View style={styles.tileFooter}>
                {item.isActive ? (
                  <View style={styles.activePill}>
                    <Check size={12} color="#10B981" />
                    <Text style={styles.activeText}>Active</Text>
                  </View>
                ) : item.isUnlocked ? (
                  <Text style={styles.unlockedText}>Unlocked</Text>
                ) : item.unlockType === CustomizationUnlockType.CREDITS ? (
                  <View style={styles.costRow}>
                    <Coins size={12} color="#FBBF24" />
                    <Text style={styles.costText}>{item.unlockValue} cr</Text>
                  </View>
                ) : (
                  <View style={styles.costRow}>
                    <GraduationCap size={12} color="#38BDF8" />
                    <Text style={styles.costText}>{item.unlockValue} taught</Text>
                  </View>
                )}
              </View>

              {/* Lock Dim Overlay */}
              {!item.isUnlocked && (
                <View style={styles.lockOverlay}>
                  <View style={styles.lockCircle}>
                    <Lock size={16} color="#CBD5E1" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tap-to-Preview Modal (Section 8.2) */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <View style={styles.modalTitleBox}>
                <Text style={styles.modalBadge}>
                  {selectedItem?.category.toUpperCase()} • {selectedItem?.tier.toUpperCase()} TIER
                </Text>
                <Text style={styles.modalTitle}>{selectedItem?.label}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <CloseIcon size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Locked Preview States */}
            {!selectedItem?.isUnlocked && (
              <View style={styles.requirementBox}>
                {selectedItem?.unlockType === CustomizationUnlockType.CREDITS ? (
                  <>
                    <View style={styles.reqHeaderRow}>
                      <Coins size={18} color="#FBBF24" style={{ marginRight: 6 }} />
                      <Text style={styles.reqTitle}>
                        Unlock for {selectedItem.unlockValue} Credit{selectedItem.unlockValue > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={styles.reqSub}>
                      Your balance: <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{userBalance} credits</Text>
                    </Text>

                    {userBalance < (selectedItem?.unlockValue || 0) && (
                      <Text style={styles.shortfallText}>
                        Shortfall: {(selectedItem?.unlockValue || 0) - userBalance} credits needed. Teach a session to earn credits!
                      </Text>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.unlockBtn,
                        userBalance < (selectedItem?.unlockValue || 0) && styles.unlockBtnDisabled,
                      ]}
                      onPress={handleUnlock}
                      disabled={actionLoading || userBalance < (selectedItem?.unlockValue || 0)}
                    >
                      <Text style={styles.unlockBtnText}>
                        {actionLoading ? 'Processing...' : 'Unlock Now'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.reqHeaderRow}>
                      <GraduationCap size={18} color="#38BDF8" style={{ marginRight: 6 }} />
                      <Text style={styles.reqTitle}>
                        Unlock after {selectedItem?.unlockValue} sessions taught
                      </Text>
                    </View>
                    <Text style={styles.reqSub}>
                      Prestigious tier: can only be earned through teaching excellence, never bought with credits.
                    </Text>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressLabelRow}>
                        <Text style={styles.progressText}>Teaching Progress</Text>
                        <Text style={styles.progressTextHighlight}>
                          {Math.min(sessionsTaughtCount, selectedItem?.unlockValue || 0)} of {selectedItem?.unlockValue} sessions taught
                        </Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${Math.min(
                                100,
                                (sessionsTaughtCount / (selectedItem?.unlockValue || 1)) * 100
                              )}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {sessionsTaughtCount >= (selectedItem?.unlockValue || 0) ? (
                      <TouchableOpacity
                        style={styles.unlockBtn}
                        onPress={handleUnlock}
                        disabled={actionLoading}
                      >
                        <Text style={styles.unlockBtnText}>
                          {actionLoading ? 'Claiming...' : 'Claim Achievement Unlock'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.lockedNote}>
                        <Text style={styles.lockedNoteText}>
                          Host { (selectedItem?.unlockValue || 0) - sessionsTaughtCount } more completed session(s) to unlock this tier.
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Unlocked States: Apply or Already Active */}
            {selectedItem?.isUnlocked && (
              <View style={styles.unlockedBox}>
                {selectedItem.isActive ? (
                  <View style={styles.currentlyActiveBox}>
                    <Check size={20} color="#10B981" style={{ marginRight: 8 }} />
                    <Text style={styles.currentlyActiveText}>
                      Currently Active on Your Public Showcase
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={handleActivate}
                    disabled={actionLoading}
                  >
                    <Text style={styles.applyBtnText}>
                      {actionLoading ? 'Applying...' : `Apply to ${selectedItem.category.toUpperCase()}`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statPillText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 12,
    position: 'relative',
    minHeight: 110,
    justifyContent: 'space-between',
  },
  tileLocked: {
    borderColor: '#1E293B',
  },
  tileActive: {
    borderColor: '#10B981',
    backgroundColor: '#062016',
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  tierTagBasic: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierTagAdvanced: {
    backgroundColor: '#311042',
    borderColor: '#A855F7',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierTagText: {
    color: '#C084FC',
    fontSize: 9,
    fontWeight: '800',
  },
  tileLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginVertical: 6,
  },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  unlockedText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    padding: 20,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitleBox: {
    flex: 1,
    paddingRight: 10,
  },
  modalBadge: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  requirementBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
  },
  reqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reqTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  reqSub: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  shortfallText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  unlockBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  unlockBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  progressContainer: {
    marginVertical: 10,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  progressTextHighlight: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
  },
  lockedNote: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  lockedNoteText: {
    color: '#CBD5E1',
    fontSize: 12,
    textAlign: 'center',
  },
  unlockedBox: {
    marginTop: 8,
  },
  currentlyActiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#062016',
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 14,
    borderRadius: 10,
  },
  currentlyActiveText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  applyBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
