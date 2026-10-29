import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Tag, Plus, X, Sparkles } from 'lucide-react-native';
import { api } from '../../services/api';

interface SkillsTagSelectorProps {
  selectedTags: string[];
  onChangeTags: (tags: string[]) => void;
  maxTags?: number;
}

const DEFAULT_SUGGESTIONS = [
  'React Native',
  'Python Data Structures',
  'UI/UX Glassmorphic Design',
  'PostgreSQL & Databases',
  'Macroeconomics',
  'Organic Chemistry',
  'Guitar & Music Theory',
  'Public Speaking',
  'Distributed Systems',
  'Machine Learning Basics',
];

export const SkillsTagSelector: React.FC<SkillsTagSelectorProps> = ({
  selectedTags,
  onChangeTags,
  maxTags = 6,
}) => {
  const [inputText, setInputText] = useState('');
  const [backendSkills, setBackendSkills] = useState<string[]>([]);

  useEffect(() => {
    fetchBackendSkills();
  }, []);

  const fetchBackendSkills = async () => {
    try {
      const skills = await api.searchSkills();
      if (Array.isArray(skills) && skills.length > 0) {
        setBackendSkills(skills.map((s: any) => s.displayName || s.display_name || s.name));
      }
    } catch {
      // Use defaults if backend offline
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim();
    if (!clean) return;

    if (selectedTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      Alert.alert('Tag Already Added', `"${clean}" is already in your skills list.`);
      return;
    }

    if (selectedTags.length >= maxTags) {
      Alert.alert('Tag Limit Reached', `You can add up to ${maxTags} skill tags for this session.`);
      return;
    }

    onChangeTags([...selectedTags, clean]);
    setInputText('');
  };

  const handleRemoveTag = (index: number) => {
    onChangeTags(selectedTags.filter((_, i) => i !== index));
  };

  // Combine suggestions, omitting already selected
  const allSuggestions = Array.from(new Set([...backendSkills, ...DEFAULT_SUGGESTIONS]));
  const filteredSuggestions = allSuggestions.filter(
    (s) =>
      !selectedTags.some((t) => t.toLowerCase() === s.toLowerCase()) &&
      (!inputText || s.toLowerCase().includes(inputText.toLowerCase()))
  ).slice(0, 8);

  return (
    <View style={styles.container}>
      {/* Header with counter */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Tag size={16} color="#38BDF8" style={{ marginRight: 6 }} />
          <Text style={styles.title}>Skills To Teach</Text>
        </View>
        <Text style={[styles.counter, selectedTags.length >= maxTags && styles.counterMax]}>
          {selectedTags.length} / {maxTags} tags max
        </Text>
      </View>

      <Text style={styles.subtitle}>
        Select suggested campus topics or type your own custom skills (up to 6 tags).
      </Text>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 ? (
        <View style={styles.selectedTagsContainer}>
          {selectedTags.map((tag, idx) => (
            <View key={idx} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveTag(idx)}
                style={styles.removeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={12} color="#0F172A" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyNotice}>
          <Text style={styles.emptyNoticeText}>No skills selected yet. Add tags below!</Text>
        </View>
      )}

      {/* Input Row */}
      {selectedTags.length < maxTags && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type custom skill tag (e.g. Next.js, Figma, Calculus)..."
            placeholderTextColor="#64748B"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleAddTag(inputText)}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addBtn, !inputText.trim() && styles.addBtnDisabled]}
            onPress={() => handleAddTag(inputText)}
            disabled={!inputText.trim()}
          >
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Suggestions Section */}
      {filteredSuggestions.length > 0 && selectedTags.length < maxTags && (
        <View style={styles.suggestionsBox}>
          <View style={styles.suggestHeader}>
            <Sparkles size={13} color="#FBBF24" style={{ marginRight: 4 }} />
            <Text style={styles.suggestTitle}>Suggested Campus Topics:</Text>
          </View>
          <View style={styles.suggestRow}>
            {filteredSuggestions.map((suggestion, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestChip}
                onPress={() => handleAddTag(suggestion)}
                activeOpacity={0.7}
              >
                <Plus size={11} color="#38BDF8" style={{ marginRight: 3 }} />
                <Text style={styles.suggestChipText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  counter: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  counterMax: {
    color: '#F59E0B',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tagText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 6,
  },
  removeBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyNotice: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyNoticeText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  suggestionsBox: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
  },
  suggestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestTitle: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  suggestChipText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
});
