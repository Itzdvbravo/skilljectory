import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import {
  Instagram,
  Twitter,
  Linkedin,
  Github,
  Youtube,
  Globe,
  Link2,
  Trash2,
  Check,
  X as CloseIcon,
} from 'lucide-react-native';
import { SocialPlatform, UserSocialLinkDto } from '@skill-exchange/shared-types';
import { api } from '../../services/api';

interface SocialLinksEditorProps {
  links: UserSocialLinkDto[];
  onLinksUpdated: () => void;
}

const PLATFORM_CONFIG: {
  platform: SocialPlatform;
  label: string;
  icon: any;
  color: string;
  placeholder: string;
}[] = [
  {
    platform: SocialPlatform.INSTAGRAM,
    label: 'Instagram',
    icon: Instagram,
    color: '#E1306C',
    placeholder: 'https://instagram.com/username',
  },
  {
    platform: SocialPlatform.X,
    label: 'X (Twitter)',
    icon: Twitter,
    color: '#1DA1F2',
    placeholder: 'https://x.com/username',
  },
  {
    platform: SocialPlatform.LINKEDIN,
    label: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    placeholder: 'https://linkedin.com/in/username',
  },
  {
    platform: SocialPlatform.GITHUB,
    label: 'GitHub',
    icon: Github,
    color: '#94A3B8',
    placeholder: 'https://github.com/username',
  },
  {
    platform: SocialPlatform.YOUTUBE,
    label: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    placeholder: 'https://youtube.com/@channel',
  },
  {
    platform: SocialPlatform.PERSONAL_SITE,
    label: 'Website',
    icon: Globe,
    color: '#10B981',
    placeholder: 'https://mysite.edu',
  },
  {
    platform: SocialPlatform.OTHER,
    label: 'Other',
    icon: Link2,
    color: '#8B5CF6',
    placeholder: 'https://portfolio.me',
  },
];

export const SocialLinksEditor: React.FC<SocialLinksEditorProps> = ({
  links,
  onLinksUpdated,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<any | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const linkedMap = new Map<SocialPlatform, UserSocialLinkDto>();
  links.forEach((l) => linkedMap.set(l.platform, l));

  const handleIconPress = (config: any) => {
    setSelectedPlatform(config);
    const existing = linkedMap.get(config.platform);
    setUrlInput(existing ? existing.url : '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedPlatform) return;
    if (!urlInput.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid web URL.');
      return;
    }

    try {
      setLoading(true);
      await api.addSocialLink({
        platform: selectedPlatform.platform,
        url: urlInput.trim(),
      });
      setIsModalOpen(false);
      onLinksUpdated();
    } catch (err: any) {
      Alert.alert('Validation Error', err.message || 'Failed to link URL.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlatform) return;
    const existing = linkedMap.get(selectedPlatform.platform);
    if (!existing) return;

    try {
      setLoading(true);
      await api.deleteSocialLink(existing.id);
      setIsModalOpen(false);
      onLinksUpdated();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>VERIFIED SOCIAL PROFILES</Text>
      <Text style={styles.sectionSub}>
        Tap to link accounts. Linked ones show on your public resume.
      </Text>

      {/* Row of Platform Icons (Artboard Page 10 Mint Container) */}
      <View style={styles.iconsRow}>
        {PLATFORM_CONFIG.map((cfg) => {
          const isLinked = linkedMap.has(cfg.platform);
          const IconComponent = cfg.icon;

          return (
            <TouchableOpacity
              key={cfg.platform}
              style={[
                styles.iconTile,
                isLinked ? styles.iconTileLinked : styles.iconTileUnlinked,
              ]}
              onPress={() => handleIconPress(cfg)}
              activeOpacity={0.7}
            >
              <IconComponent
                size={20}
                color={isLinked ? '#0E6245' : '#18201D'}
                strokeWidth={isLinked ? 2.2 : 1.8}
              />
              {isLinked && (
                <View style={styles.linkedBadge}>
                  <Check size={8} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Single-field Popover Modal (Artboard Clean Light Theme) */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPlatform ? selectedPlatform.label : 'Social Link'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <CloseIcon size={20} color="#5A6561" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Enter your verified {selectedPlatform?.label} URL:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder={selectedPlatform?.placeholder || 'https://...'}
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.modalActions}>
              {linkedMap.has(selectedPlatform?.platform) && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  disabled={loading}
                >
                  <Trash2 size={16} color="#DC2626" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={loading}
              >
                <Text style={styles.saveBtnText}>
                  {loading ? 'Saving...' : 'Save Profile Link'}
                </Text>
              </TouchableOpacity>
            </View>
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
  sectionHeader: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionSub: {
    color: '#5A6561',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EBF7F0',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4EAD9',
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconTileLinked: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0E6245',
    elevation: 2,
    shadowColor: '#0E6245',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  iconTileUnlinked: {
    backgroundColor: 'transparent',
  },
  linkedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0E6245',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    color: '#5A6561',
    fontSize: 13,
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: '#F8FAF9',
    borderWidth: 1.5,
    borderColor: '#E2E8E5',
    borderRadius: 12,
    color: '#111827',
    padding: 12,
    fontSize: 14,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  deleteBtn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#0E6245',
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
