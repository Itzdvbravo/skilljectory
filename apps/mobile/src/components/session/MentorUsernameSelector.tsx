import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Users, Plus, X, ShieldCheck, UserCheck } from 'lucide-react-native';
import { api } from '../../services/api';
import { AvatarWithBadgeFrame } from '../common/ThemeSystem';

export interface MentorUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
}

interface MentorUsernameSelectorProps {
  selectedMentors: MentorUser[];
  onMentorsChange: (mentors: MentorUser[]) => void;
  maxCoMentors?: number;
}

export const MentorUsernameSelector: React.FC<MentorUsernameSelectorProps> = ({
  selectedMentors,
  onMentorsChange,
  maxCoMentors = 3,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MentorUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    searchMentors(query);
  }, [query]);

  const searchMentors = async (q: string) => {
    try {
      setLoading(true);
      const data = await api.searchMentors(q);
      setResults(data || []);
    } catch {
      // Fallback default mentors from dataset
      const datasetFallback: MentorUser[] = [
        { id: 'usr_sarah_chen', name: 'Sarah Chen', username: 'sarahc', avatarUrl: null },
        { id: 'usr_marcus_vance', name: 'Marcus Vance', username: 'marcusv', avatarUrl: null },
        { id: 'usr_priya_sharma', name: 'Priya Sharma', username: 'priyasharma', avatarUrl: null },
      ];
      setResults(
        datasetFallback.filter(
          (m) =>
            !q ||
            m.name.toLowerCase().includes(q.toLowerCase()) ||
            m.username.toLowerCase().includes(q.toLowerCase())
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddMentor = (mentor: MentorUser) => {
    if (selectedMentors.some((m) => m.id === mentor.id || m.username === mentor.username)) {
      return;
    }
    if (selectedMentors.length >= maxCoMentors) {
      return;
    }
    onMentorsChange([...selectedMentors, mentor]);
    setQuery('');
  };

  const handleRemoveMentor = (id: string) => {
    onMentorsChange(selectedMentors.filter((m) => m.id !== id));
  };

  const filteredResults = results.filter(
    (r) => !selectedMentors.some((sm) => sm.id === r.id || sm.username === r.username)
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Users size={16} color="#A855F7" style={{ marginRight: 6 }} />
          <Text style={styles.title}>Co-Host Mentors</Text>
        </View>
        <Text style={styles.counter}>
          {selectedMentors.length} / {maxCoMentors} co-hosts
        </Text>
      </View>

      <Text style={styles.subtext}>
        Search mentors by @username or real name. They must exist in the campus dataset and will receive an invitation request.
      </Text>

      {/* Selected Co-Hosts List */}
      {selectedMentors.length > 0 ? (
        <View style={styles.selectedRow}>
          {selectedMentors.map((m) => (
            <View key={m.id} style={styles.mentorChip}>
              <AvatarWithBadgeFrame name={m.name} size={24} style={{ marginRight: 6 }} />
              <View>
                <Text style={styles.mentorChipName}>{m.name}</Text>
                <Text style={styles.mentorChipUsername}>@{m.username}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveMentor(m.id)}
                style={styles.removeBtn}
              >
                <X size={13} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No co-hosts selected. Search below to invite mentors!</Text>
        </View>
      )}

      {/* Search Input */}
      {selectedMentors.length < maxCoMentors && (
        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="Search mentor username (e.g. sarahc, marcusv)..."
            placeholderTextColor="#64748B"
            value={query}
            onChangeText={setQuery}
          />
          {loading && <ActivityIndicator color="#A855F7" style={styles.loader} />}
        </View>
      )}

      {/* Mentors Dataset Suggestions */}
      {selectedMentors.length < maxCoMentors && filteredResults.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsHeader}>Dataset Mentors Available:</Text>
          <View style={styles.mentorCardsGrid}>
            {filteredResults.slice(0, 4).map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.mentorCard}
                onPress={() => handleAddMentor(m)}
                activeOpacity={0.7}
              >
                <AvatarWithBadgeFrame name={m.name} size={32} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mentorName} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text style={styles.mentorUsername}>@{m.username}</Text>
                </View>
                <View style={styles.inviteIconBtn}>
                  <Plus size={14} color="#A855F7" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Request Notice Box */}
      <View style={styles.noticeBox}>
        <UserCheck size={14} color="#FBBF24" style={{ marginRight: 6 }} />
        <Text style={styles.noticeText}>
          Invitations are sent to co-hosts as requests in their "My Sessions" tab.
        </Text>
      </View>
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
    color: '#A855F7',
    fontSize: 12,
    fontWeight: '700',
  },
  subtext: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12,
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  mentorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: '#4338CA',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  mentorChipName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  mentorChipUsername: {
    color: '#A855F7',
    fontSize: 10,
    fontWeight: '700',
  },
  removeBtn: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#312E81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  searchBox: {
    position: 'relative',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
  },
  loader: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  suggestionsContainer: {
    marginBottom: 10,
  },
  suggestionsHeader: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  mentorCardsGrid: {
    gap: 6,
  },
  mentorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  mentorName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  mentorUsername: {
    color: '#A855F7',
    fontSize: 11,
    fontWeight: '600',
  },
  inviteIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161922',
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 2.5,
    borderLeftColor: '#FBBF24',
  },
  noticeText: {
    color: '#94A3B8',
    fontSize: 11,
    flex: 1,
  },
});
