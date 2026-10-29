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
        Tap to link your portfolio accounts. Linked accounts are highlighted on your public resume showcase.
      </Text>

      {/* Row of Platform Icons */}
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
                size={22}
                color={isLinked ? cfg.color : '#475569'}
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

      {/* Single-field Popover Modal */}
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
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <CloseIcon size={20} color="#94A3B8" />
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
              placeholderTextColor="#64748B"
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
                  <Trash2 size={16} color="#EF4444" />
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
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionSub: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12,
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconTileLinked: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  iconTileUnlinked: {
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  linkedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  modalSub: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    color: '#F8FAFC',
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  deleteBtn: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
