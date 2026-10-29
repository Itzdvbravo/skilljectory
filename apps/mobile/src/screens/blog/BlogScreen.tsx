import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlogPostDto } from '@skill-exchange/shared-types';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  PenTool,
  Heart,
  MessageSquare,
  Lock,
  Clock,
  Coins,
  X as CloseIcon,
} from 'lucide-react-native';

export const BlogScreen = () => {
  const [posts, setPosts] = useState<BlogPostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const items = await api.getBlogPosts().catch(() => [
        {
          id: 'post_1',
          authorId: 'usr_1',
          authorName: 'Sarah Chen',
          title: 'How I Transitioned from Zero to Hosting React Native Workshops',
          content: 'Teaching peer students on campus is the fastest way to master software architecture. Preparing explanations forces you to address edge cases...',
          mediaUrls: [],
          status: 'published',
          publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          upvotesCount: 14,
          hasUpvoted: true,
          commentsCount: 3,
        },
        {
          id: 'post_2',
          authorId: 'usr_2',
          authorName: 'Alex Rivera',
          title: 'Demystifying the Time-Credit Economy: Why Collusion Fails',
          content: 'The mathematical rules behind multi-person attendance and multi-mentor split pools ensure honest time exchange on our campus...',
          mediaUrls: [],
          status: 'published',
          publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          upvotesCount: 22,
          hasUpvoted: false,
          commentsCount: 7,
        },
      ]);
      setPosts(items);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (post: BlogPostDto) => {
    try {
      await api.upvotePost(post.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                hasUpvoted: !p.hasUpvoted,
                upvotesCount: p.hasUpvoted ? p.upvotesCount - 1 : p.upvotesCount + 1,
              }
            : p
        )
      );
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Upvoted!');
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Incomplete', 'Please fill in both title and post content.');
      return;
    }

    try {
      setActionLoading(true);
      await api.createBlogPost({
        title: title.trim(),
        content: content.trim(),
      });
      setModalOpen(false);
      setTitle('');
      setContent('');
      fetchPosts();
      Alert.alert('Published!', 'Your blog post is live for the campus community.');
    } catch (err: any) {
      // Gate check feedback (Section 5.8)
      Alert.alert('Publishing Locked', err.message || 'Requires 15 teaching hours and 10 credit balance.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderPost = ({ item }: { item: BlogPostDto }) => (
    <View style={styles.card}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.authorText}>Written by {item.authorName}</Text>
      <Text style={styles.postContent} numberOfLines={4}>
        {item.content}
      </Text>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.interactionBtn}
          onPress={() => handleUpvote(item)}
          activeOpacity={0.8}
        >
          <Heart
            size={16}
            color={item.hasUpvoted ? '#EF4444' : '#94A3B8'}
            fill={item.hasUpvoted ? '#EF4444' : 'transparent'}
          />
          <Text style={[styles.interactionText, item.hasUpvoted && { color: '#EF4444' }]}>
            {item.upvotesCount}
          </Text>
        </TouchableOpacity>

        <View style={styles.interactionBtn}>
          <MessageSquare size={16} color="#94A3B8" />
          <Text style={styles.interactionText}>{item.commentsCount} comments</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.headerTitle}>Campus Insights</Text>
          <Text style={styles.headerSub}>Articles from experienced campus mentors</Text>
        </View>
        <TouchableOpacity style={styles.composeBtn} onPress={() => setModalOpen(true)}>
          <PenTool size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.composeBtnText}>Compose</Text>
        </TouchableOpacity>
      </View>

      {/* Unlock Notice Banner (Section 5.8) */}
      <View style={styles.unlockBanner}>
        <Lock size={14} color="#FBBF24" style={{ marginRight: 6 }} />
        <Text style={styles.unlockBannerText}>
          Publishing unlocked after 15 total teaching hours and 10 credits balance.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#38BDF8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Compose Modal */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>Write Article</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <CloseIcon size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Article Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Master Parallel Execution in Node.js"
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Share insights, tips, or study breakdowns..."
              placeholderTextColor="#64748B"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
            />

            <TouchableOpacity style={styles.publishBtn} onPress={handlePublish} disabled={actionLoading}>
              <Text style={styles.publishBtnText}>
                {actionLoading ? 'Verifying Gate...' : 'Publish to Campus'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  composeBtn: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  composeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  unlockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B18',
    borderWidth: 1,
    borderColor: '#78350F',
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  unlockBannerText: {
    color: '#FDE68A',
    fontSize: 11,
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 16,
  },
  postTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  authorText: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 10,
  },
  postContent: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
  },
  interactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interactionText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  modalBg: {
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
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    padding: 20,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    color: '#F8FAFC',
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  publishBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
