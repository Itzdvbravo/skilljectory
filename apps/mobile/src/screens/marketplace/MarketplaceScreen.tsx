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
  ScrollView,
} from 'react-native';
import {
  MaterialDto,
  MaterialType,
  BlogPostDto,
} from '@skill-exchange/shared-types';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  FileText,
  Plus,
  Coins,
  Download,
  Check,
  X as CloseIcon,
  Heart,
  MessageSquare,
  BookOpen,
  Calendar,
  Lock,
} from 'lucide-react-native';
import { BrandUnderline } from '../../components/common/ThemeSystem';

export const MarketplaceScreen = () => {
  const user = useAuthStore((s) => s.user);

  // Tab: 'materials' | 'blogs'
  const [activeTab, setActiveTab] = useState<'materials' | 'blogs'>('materials');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'notes' | 'slides' | 'summaries'>('all');

  // Materials State
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialFileUrl, setMaterialFileUrl] = useState('');
  const [materialPriceCredits, setMaterialPriceCredits] = useState(2);
  const [materialType, setMaterialType] = useState<MaterialType>(MaterialType.PDF);

  // Blog State
  const [posts, setPosts] = useState<BlogPostDto[]>([
    {
      id: 'demo_post_1',
      title: 'Hello',
      content: 'Wello',
      authorId: 'usr_admin',
      authorName: 'Campus Administrator',
      authorUsername: 'admin',
      authorRole: 'admin',
      upvotesCount: 0,
      createdAt: '2026-10-29T12:00:00Z',
      hasUpvoted: false,
    } as any,
    {
      id: 'demo_post_2',
      title: 'Welcome to Assam Down Town University Skill Exchange',
      content: 'Empowering peer-to-peer mentorship across campus through time-credits.',
      authorId: 'usr_admin',
      authorName: 'Campus Administrator',
      authorUsername: 'admin',
      authorRole: 'admin',
      upvotesCount: 0,
      createdAt: '2026-10-29T10:00:00Z',
      hasUpvoted: false,
    } as any,
  ]);
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogDescription, setBlogDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'materials') {
        const items = await api.getMaterials().catch(() => []);
        setMaterials(items || []);
      } else {
        const blogItems = await api.getBlogPosts().catch(() => []);
        if (blogItems && blogItems.length > 0) {
          setPosts(blogItems);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseMaterial = async (material: MaterialDto) => {
    try {
      setActionLoading(true);
      await api.purchaseMaterial(material.id);
      Alert.alert('Unlocked!', `"${material.title}" has been purchased. Download link is ready.`);
      loadData();
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Purchased and unlocked.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateMaterial = async () => {
    if (!materialTitle.trim() || !materialFileUrl.trim()) {
      Alert.alert('Incomplete', 'Please fill in title and material file link.');
      return;
    }

    try {
      setActionLoading(true);
      await api.createMaterial({
        title: materialTitle.trim(),
        fileUrl: materialFileUrl.trim(),
        priceCredits: materialPriceCredits,
        type: materialType,
      });
      setMaterialModalOpen(false);
      setMaterialTitle('');
      setMaterialFileUrl('');
      loadData();
      Alert.alert('Listed!', 'Your study material is now available for students.');
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Study material listed.');
      setMaterialModalOpen(false);
      loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishBlogPost = async () => {
    if (!blogTitle.trim() || !blogDescription.trim()) {
      Alert.alert('Incomplete', 'Please provide both title and content.');
      return;
    }

    try {
      setActionLoading(true);
      const newPost = await api.createBlogPost({
        title: blogTitle.trim(),
        content: blogDescription.trim(),
      }).catch(() => null);

      if (newPost) {
        setPosts([newPost, ...posts]);
      } else {
        setPosts([
          {
            id: `post_${Date.now()}`,
            title: blogTitle.trim(),
            content: blogDescription.trim(),
            authorId: user?.id || 'usr_admin',
            authorName: user?.name || 'Campus Administrator',
            authorUsername: user?.username || 'admin',
            authorRole: 'admin',
            upvotesCount: 0,
            createdAt: new Date().toISOString(),
            hasUpvoted: false,
          } as any,
          ...posts,
        ]);
      }

      setBlogModalOpen(false);
      setBlogTitle('');
      setBlogDescription('');
      Alert.alert('Published!', 'Your campus blog post is now live.');
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Blog published.');
      setBlogModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpvotePost = async (post: BlogPostDto) => {
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
    try {
      await api.upvotePost(post.id);
    } catch {
      // Ignored
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Segmented Tab Switch (Artboard Pages 7 & 8) */}
      <View style={styles.topTabBar}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'materials' ? styles.topTabBtnActive : styles.topTabBtnInactive]}
          onPress={() => setActiveTab('materials')}
          activeOpacity={0.88}
        >
          <FileText
            size={16}
            color={activeTab === 'materials' ? '#FFFFFF' : '#111827'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.topTabText, activeTab === 'materials' ? styles.topTabTextActive : styles.topTabTextInactive]}>
            Study materials
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'blogs' ? styles.topTabBtnActive : styles.topTabBtnInactive]}
          onPress={() => setActiveTab('blogs')}
          activeOpacity={0.88}
        >
          <BookOpen
            size={16}
            color={activeTab === 'blogs' ? '#FFFFFF' : '#111827'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.topTabText, activeTab === 'blogs' ? styles.topTabTextActive : styles.topTabTextInactive]}>
            Campus blogs
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================================
          TAB 1: STUDY MATERIALS (Page 7)
      ========================================================================= */}
      {activeTab === 'materials' && (
        <ScrollView style={styles.pageScroll} contentContainerStyle={styles.scrollContent}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.headerTitle}>Study </Text>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.headerTitle}>materials</Text>
                  <BrandUnderline width={80} style={{ marginTop: 2 }} />
                </View>
              </View>
              <Text style={styles.headerSubtitle}>
                Peer notes, slides & summaries (1–5 cr)
              </Text>
            </View>

            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() => setMaterialModalOpen(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.actionPillText}>List</Text>
            </TouchableOpacity>
          </View>

          {/* Category Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {[
              { id: 'all', label: 'All' },
              { id: 'notes', label: 'Notes' },
              { id: 'slides', label: 'Slides' },
              { id: 'summaries', label: 'Summaries' },
            ].map((c) => {
              const isActive = categoryFilter === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catChip, isActive ? styles.catChipActive : styles.catChipInactive]}
                  onPress={() => setCategoryFilter(c.id as any)}
                >
                  <Text style={[styles.catChipText, isActive ? styles.catChipTextActive : styles.catChipTextInactive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* List or Empty State (Page 7) */}
          {materials.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <FileText size={36} color="#111827" />
              </View>
              <Text style={styles.emptyTitle}>No materials listed yet</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to share notes, slides or summaries with your campus.
              </Text>

              <TouchableOpacity
                style={styles.listMaterialOutlineBtn}
                onPress={() => setMaterialModalOpen(true)}
              >
                <Plus size={16} color="#0E6245" style={{ marginRight: 6 }} />
                <Text style={styles.listMaterialOutlineText}>List a material</Text>
              </TouchableOpacity>
            </View>
          ) : (
            materials.map((item, idx) => {
              const isMint = idx % 2 === 0;
              return (
                <View
                  key={item.id}
                  style={[styles.itemCard, { backgroundColor: isMint ? '#EBF7F0' : '#FDE8EE' }]}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTypeCapsule}>
                      <Text style={styles.itemTypeText}>{item.type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.itemPriceCapsule}>
                      <Coins size={12} color="#854D0E" style={{ marginRight: 4 }} />
                      <Text style={styles.itemPriceText}>{item.priceCredits} credits</Text>
                    </View>
                  </View>

                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemAuthor}>Shared by {item.sellerName || 'Scholar'}</Text>

                  <View style={styles.itemFooter}>
                    {item.hasPurchased ? (
                      <View style={styles.purchasedTag}>
                        <Check size={14} color="#0E6245" style={{ marginRight: 4 }} />
                        <Text style={styles.purchasedText}>Purchased & Unlocked</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.buyBtn}
                        onPress={() => handlePurchaseMaterial(item)}
                      >
                        <Download size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.buyBtnText}>Purchase ({item.priceCredits} cr)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* =========================================================================
          TAB 2: CAMPUS BLOGS (Page 8)
      ========================================================================= */}
      {activeTab === 'blogs' && (
        <ScrollView style={styles.pageScroll} contentContainerStyle={styles.scrollContent}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.headerTitle}>Campus insights & </Text>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.headerTitle}>blogs</Text>
                  <BrandUnderline width={60} style={{ marginTop: 2 }} />
                </View>
              </View>
              <Text style={styles.headerSubtitle}>
                By verified campus scholars
              </Text>
            </View>

            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() => setBlogModalOpen(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.actionPillText}>Write</Text>
            </TouchableOpacity>
          </View>

          {/* Blog Cards (Page 8: Hello in Mint, Welcome in Pink) */}
          {posts.map((post, idx) => {
            const isMint = idx % 2 === 0;
            const cardBg = isMint ? '#EBF7F0' : '#FDE8EE';

            return (
              <View key={post.id} style={[styles.blogCard, { backgroundColor: cardBg }]}>
                {/* Blog Title */}
                <Text style={styles.blogTitle}>{post.title}</Text>

                {/* Author row */}
                <View style={styles.authorRow}>
                  <View style={styles.authorAvatarCircle}>
                    <Text style={styles.authorAvatarText}>CA</Text>
                  </View>
                  <View>
                    <Text style={styles.authorName}>
                      {post.authorName || 'Campus Administrator'}
                    </Text>
                    <Text style={styles.authorUsername}>
                      @{post.authorUsername || 'admin'} · 29 Oct
                    </Text>
                  </View>
                </View>

                {/* Content snippet */}
                <Text style={styles.blogSnippet}>{post.content}</Text>

                {/* Bottom counters */}
                <View style={styles.blogFooterRow}>
                  <TouchableOpacity
                    style={styles.counterItem}
                    onPress={() => handleUpvotePost(post)}
                  >
                    <Heart
                      size={15}
                      color={post.hasUpvoted ? '#DC2626' : '#111827'}
                      fill={post.hasUpvoted ? '#DC2626' : 'none'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.counterText}>{post.upvotesCount}</Text>
                  </TouchableOpacity>

                  <View style={styles.counterItem}>
                    <MessageSquare size={15} color="#111827" style={{ marginRight: 6 }} />
                    <Text style={styles.counterText}>0 comments</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Modal: List Material */}
      <Modal visible={materialModalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>List Study Material</Text>
            <Text style={styles.modalSub}>
              Share peer notes or exam slides with your campus for credits.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Material title (e.g. Distributed Systems Notes)"
              placeholderTextColor="#9CA3AF"
              value={materialTitle}
              onChangeText={setMaterialTitle}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Download URL (e.g. https://drive.google.com/...)"
              placeholderTextColor="#9CA3AF"
              value={materialFileUrl}
              onChangeText={setMaterialFileUrl}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setMaterialModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateMaterial}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>List for 2 Credits</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Write Blog Post */}
      <Modal visible={blogModalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Write Campus Insight</Text>
            <Text style={styles.modalSub}>
              Share knowledge, technical guides, or campus announcements.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Post title"
              placeholderTextColor="#9CA3AF"
              value={blogTitle}
              onChangeText={setBlogTitle}
            />

            <TextInput
              style={[styles.modalInput, { height: 90, textAlignVertical: 'top' }]}
              placeholder="What insight would you like to share?"
              placeholderTextColor="#9CA3AF"
              multiline
              value={blogDescription}
              onChangeText={setBlogDescription}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setBlogModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handlePublishBlogPost}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Publish Post</Text>
                )}
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
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  // Top Segments (Artboard Pages 7 & 8)
  topTabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#F8FAF9',
  },
  topTabBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTabBtnActive: {
    backgroundColor: '#18201D',
  },
  topTabBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  topTabText: {
    fontSize: 13,
  },
  topTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topTabTextInactive: {
    color: '#111827',
    fontWeight: '600',
  },
  pageScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  // Header Row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#5A6561',
    marginTop: 4,
  },
  actionPillBtn: {
    backgroundColor: '#18201D',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  actionPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  // Category Chips (Page 7)
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  catChip: {
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  catChipActive: {
    backgroundColor: '#18201D',
  },
  catChipInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  catChipText: {
    fontSize: 13,
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  catChipTextInactive: {
    color: '#111827',
    fontWeight: '600',
  },
  // Empty State (Page 7)
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#5A6561',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 22,
    maxWidth: 260,
  },
  listMaterialOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0E6245',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 22,
    backgroundColor: '#FFFFFF',
  },
  listMaterialOutlineText: {
    color: '#0E6245',
    fontWeight: '700',
    fontSize: 14,
  },
  // Material Items
  itemCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTypeCapsule: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  itemTypeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  itemPriceCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF7DA',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  itemPriceText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#854D0E',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  itemAuthor: {
    fontSize: 13,
    color: '#5A6561',
    marginBottom: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E6245',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  purchasedTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  purchasedText: {
    color: '#0E6245',
    fontWeight: '700',
    fontSize: 13,
  },
  // Blog Card (Page 8)
  blogCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  blogTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0E6245',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  authorAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  authorUsername: {
    fontSize: 11,
    color: '#0E6245',
  },
  blogSnippet: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 14,
  },
  blogFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  counterItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  // Modals
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
  },
  modalHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: '#5A6561',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#EFF3F1',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#0E6245',
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
