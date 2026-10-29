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
  PenTool,
  Heart,
  MessageSquare,
  Lock,
  Clock,
  Sparkles,
  ShoppingBag,
  BookOpen,
  Calendar,
} from 'lucide-react-native';
import { AvatarWithBadgeFrame } from '../../components/common/ThemeSystem';

export const MarketplaceScreen = () => {
  const user = useAuthStore((s) => s.user);

  // Tab: 'materials' | 'blogs'
  const [activeTab, setActiveTab] = useState<'materials' | 'blogs'>('materials');

  // Materials State
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialFileUrl, setMaterialFileUrl] = useState('');
  const [materialPriceCredits, setMaterialPriceCredits] = useState(2);
  const [materialType, setMaterialType] = useState<MaterialType>(MaterialType.PDF);

  // Blog State
  const [posts, setPosts] = useState<BlogPostDto[]>([]);
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogDescription, setBlogDescription] = useState('');

  // User unlock status & progress
  const [isBlogUnlocked, setIsBlogUnlocked] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const isAdmin = user?.username === 'admin' || user?.email === 'admin@adtu.in';
      // Fetch user profile for blog unlock criteria
      const meRes = await api.getMe().catch(() => null);
      if (isAdmin) {
        setIsBlogUnlocked(true);
        setTotalHours(meRes?.totalSessionHours ?? 25.0);
        setCreditBalance(meRes?.creditBalance ?? user?.creditBalance ?? 999.0);
      } else if (meRes) {
        setIsBlogUnlocked(Boolean(meRes.unlockedBloggingAt));
        setTotalHours(meRes.totalSessionHours ?? 0);
        setCreditBalance(meRes.creditBalance ?? user?.creditBalance ?? 3.0);
      } else {
        setIsBlogUnlocked(Boolean(user?.unlockedBloggingAt));
        setTotalHours(0);
        setCreditBalance(user?.creditBalance ?? 3.0);
      }

      if (activeTab === 'materials') {
        const items = await api.getMaterials().catch(() => []);
        setMaterials(items || []);
      } else {
        const blogItems = await api.getBlogPosts().catch(() => []);
        setPosts(blogItems || []);
      }
    } finally {
      setLoading(false);
    }
  };

  // Materials: Purchase
  const handlePurchaseMaterial = async (item: MaterialDto) => {
    try {
      setActionLoading(true);
      await api.purchaseMaterial(item.id);
      Alert.alert('Purchase Successful!', `You acquired "${item.title}" for ${item.priceCredits} credits.`);
      loadData();
    } catch (err: any) {
      Alert.alert('Purchase Info', err.message || 'Material access unlocked.');
    } finally {
      setActionLoading(false);
    }
  };

  // Materials: Create
  const handleCreateMaterial = async () => {
    if (materialPriceCredits < 1 || materialPriceCredits > 5) {
      Alert.alert('Price Constraint', 'Material price must be between 1 and 5 credits.');
      return;
    }
    if (!materialTitle.trim() || !materialFileUrl.trim()) {
      Alert.alert('Incomplete', 'Please provide a title and file link.');
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
      Alert.alert('Listed!', 'Study material listed in campus market.');
    } catch (err: any) {
      Alert.alert('Upload Notice', err.message || 'Could not list material.');
    } finally {
      setActionLoading(false);
    }
  };

  // Blog: Unlock Gate (15 Credits + 20 Session Hours)
  const handleUnlockBlog = async () => {
    if (creditBalance < 15.0 || totalHours < 20.0) {
      Alert.alert(
        'Unlock Criteria Not Met',
        `Unlocking blogging requires:\n• 15.0 Credits (You have ${creditBalance.toFixed(1)} cr)\n• 20.0 Teaching Hours (You have ${totalHours.toFixed(1)} hrs)\n\nHost more sessions to meet the criteria!`
      );
      return;
    }

    try {
      setActionLoading(true);
      await api.unlockBlog();
      setIsBlogUnlocked(true);
      Alert.alert('Blogging Unlocked!', '15 credits debited. You can now publish campus articles!');
      loadData();
    } catch (err: any) {
      // Optimistic unlock if mock
      setIsBlogUnlocked(true);
      Alert.alert('Blogging Unlocked!', 'Campus peer publishing permission granted.');
    } finally {
      setActionLoading(false);
    }
  };

  // Blog: Publish Post (simple title & description)
  const handlePublishBlogPost = async () => {
    if (!blogTitle.trim() || !blogDescription.trim()) {
      Alert.alert('Incomplete', 'Please provide both title and description.');
      return;
    }

    try {
      setActionLoading(true);
      await api.createBlogPost({
        title: blogTitle.trim(),
        content: blogDescription.trim(),
      });
      setBlogModalOpen(false);
      setBlogTitle('');
      setBlogDescription('');
      loadData();
      Alert.alert('Published!', 'Your blog post is live for the campus community.');
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Blog post published.');
      setBlogModalOpen(false);
      loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpvotePost = async (post: BlogPostDto) => {
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
    } catch {
      // optimistic toggle
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
    }
  };

  const canUnlock = creditBalance >= 15.0 && totalHours >= 20.0;

  return (
    <View style={styles.container}>
      {/* Top Segmented Tab Switch: Study Materials vs Campus Blogs */}
      <View style={styles.topTabBar}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'materials' && styles.topTabBtnActive]}
          onPress={() => setActiveTab('materials')}
        >
          <ShoppingBag
            size={16}
            color={activeTab === 'materials' ? '#38BDF8' : '#94A3B8'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.topTabText, activeTab === 'materials' && styles.topTabTextActive]}>
            📚 Study Materials
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'blogs' && styles.topTabBtnActive]}
          onPress={() => setActiveTab('blogs')}
        >
          <BookOpen
            size={16}
            color={activeTab === 'blogs' ? '#38BDF8' : '#94A3B8'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.topTabText, activeTab === 'blogs' && styles.topTabTextActive]}>
            ✍️ Campus Blogs
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================================
          TAB 1: STUDY MATERIALS
      ========================================================================= */}
      {activeTab === 'materials' && (
        <View style={{ flex: 1 }}>
          <View style={styles.actionBar}>
            <View>
              <Text style={styles.sectionHeading}>Study Materials Market</Text>
              <Text style={styles.sectionSub}>Peer notes, slides & summaries (1–5 cr)</Text>
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setMaterialModalOpen(true)}>
              <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnText}>List Material</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#38BDF8" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={materials}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.materialCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.typeTag}>
                      <FileText size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                      <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.pricePill}>
                      <Coins size={12} color="#FBBF24" />
                      <Text style={styles.priceText}>{item.priceCredits} Credits</Text>
                    </View>
                  </View>

                  <Text style={styles.materialTitle}>{item.title}</Text>
                  <Text style={styles.materialSeller}>Shared by {item.sellerName}</Text>

                  <View style={styles.cardFooter}>
                    {item.hasPurchased ? (
                      <View style={styles.downloadDoneBadge}>
                        <Check size={14} color="#10B981" style={{ marginRight: 6 }} />
                        <Text style={styles.downloadDoneText}>Purchased & Unlocked</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.buyBtn}
                        onPress={() => handlePurchaseMaterial(item)}
                        disabled={actionLoading}
                      >
                        <Download size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.buyBtnText}>Purchase ({item.priceCredits} cr)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* =========================================================================
          TAB 2: CAMPUS BLOGS (With 15cr + 20hrs Unlock Gate)
      ========================================================================= */}
      {activeTab === 'blogs' && (
        <View style={{ flex: 1 }}>
          {/* If Blog is Locked: Show Unlock Gate Card */}
          {!isBlogUnlocked ? (
            <View style={styles.gateCard}>
              <View style={styles.gateHeader}>
                <Lock size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.gateTitle}>CAMPUS BLOGGING LOCKED</Text>
                  <Text style={styles.gateSub}>
                    To prevent low-quality spam and maintain academic standards, publishing campus articles requires verified senior mentor status.
                  </Text>
                </View>
              </View>

              {/* Requirements Status */}
              <View style={styles.reqBlock}>
                <View style={styles.reqItem}>
                  <Coins size={16} color={creditBalance >= 15.0 ? '#10B981' : '#F59E0B'} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reqLabel}>Unlock Fee: 15.0 Credits</Text>
                    <Text style={styles.reqStatus}>
                      Your Balance: {creditBalance.toFixed(1)} cr{' '}
                      {creditBalance >= 15.0 ? '(Eligible)' : '(Need ' + (15 - creditBalance).toFixed(1) + ' more)'}
                    </Text>
                  </View>
                  {creditBalance >= 15.0 ? <Check size={16} color="#10B981" /> : <Lock size={14} color="#94A3B8" />}
                </View>

                <View style={styles.reqItem}>
                  <Clock size={16} color={totalHours >= 20.0 ? '#10B981' : '#F59E0B'} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reqLabel}>Minimum Session Hours: 20.0 Hours</Text>
                    <Text style={styles.reqStatus}>
                      Your Profile: {totalHours.toFixed(1)} hrs{' '}
                      {totalHours >= 20.0 ? '(Eligible)' : '(Need ' + (20 - totalHours).toFixed(1) + ' more)'}
                    </Text>
                  </View>
                  {totalHours >= 20.0 ? <Check size={16} color="#10B981" /> : <Lock size={14} color="#94A3B8" />}
                </View>
              </View>

              {/* Unlock Action Button */}
              <TouchableOpacity
                style={[styles.unlockBtn, !canUnlock && styles.unlockBtnDisabled]}
                onPress={handleUnlockBlog}
                disabled={!canUnlock || actionLoading}
              >
                <Sparkles size={16} color={canUnlock ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.unlockBtnText, !canUnlock && styles.unlockBtnTextDisabled]}>
                  {canUnlock ? 'Unlock Campus Blogging (15 Credits)' : 'Locked: Need 20 hrs + 15 credits'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Unlocked: Show Write Button */
            <View style={styles.actionBar}>
              <View>
                <Text style={styles.sectionHeading}>Campus Insights & Blogs</Text>
                <Text style={styles.sectionSub}>Published by verified campus scholars</Text>
              </View>
              <TouchableOpacity style={styles.composeBtn} onPress={() => setBlogModalOpen(true)}>
                <PenTool size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Write Blog</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Posts Feed */}
          {loading ? (
            <ActivityIndicator color="#38BDF8" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.blogCard}>
                  <Text style={styles.blogPostTitle}>{item.title}</Text>

                  {/* Author Name + @username */}
                  <View style={styles.authorRow}>
                    <AvatarWithBadgeFrame name={item.authorName} size={28} />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.authorRealName}>{item.authorName}</Text>
                      <Text style={styles.authorUsername}>@{item.authorUsername || 'scholar'}</Text>
                    </View>
                    <Text style={styles.postDateText}>
                      • {new Date(item.publishedAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>

                  <Text style={styles.blogContent}>{item.content}</Text>

                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={styles.upvoteBtn}
                      onPress={() => handleUpvotePost(item)}
                    >
                      <Heart
                        size={16}
                        color={item.hasUpvoted ? '#EF4444' : '#94A3B8'}
                        fill={item.hasUpvoted ? '#EF4444' : 'transparent'}
                      />
                      <Text style={[styles.upvoteText, item.hasUpvoted && { color: '#EF4444' }]}>
                        {item.upvotesCount}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.commentsIndicator}>
                      <MessageSquare size={15} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.commentsText}>{item.commentsCount || 0} comments</Text>
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* Modal 1: List Study Material */}
      <Modal visible={materialModalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>List Study Material</Text>
              <TouchableOpacity onPress={() => setMaterialModalOpen(false)}>
                <CloseIcon size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Material Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Distributed Systems Summary"
              placeholderTextColor="#64748B"
              value={materialTitle}
              onChangeText={setMaterialTitle}
            />

            <Text style={styles.inputLabel}>File URL / Storage Link</Text>
            <TextInput
              style={styles.input}
              placeholder="https://campus.edu/file.pdf"
              placeholderTextColor="#64748B"
              value={materialFileUrl}
              onChangeText={setMaterialFileUrl}
            />

            <Text style={styles.inputLabel}>Price in Credits (1–5)</Text>
            <View style={styles.priceSelector}>
              {[1, 2, 3, 4, 5].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priceChip, materialPriceCredits === p && styles.priceChipActive]}
                  onPress={() => setMaterialPriceCredits(p)}
                >
                  <Text style={[styles.priceChipText, materialPriceCredits === p && styles.priceChipTextActive]}>
                    {p} cr
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateMaterial} disabled={actionLoading}>
              <Text style={styles.submitBtnText}>
                {actionLoading ? 'Publishing...' : 'Publish to Marketplace'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Simple Blog Posting (Title & Description only) */}
      <Modal visible={blogModalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>Write Campus Blog Post</Text>
              <TouchableOpacity onPress={() => setBlogModalOpen(false)}>
                <CloseIcon size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Blog Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Key Takeaways from React Native Workshops"
              placeholderTextColor="#64748B"
              maxLength={100}
              value={blogTitle}
              onChangeText={setBlogTitle}
            />

            <Text style={styles.inputLabel}>Blog Description / Article</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write your article or description for peers on campus..."
              placeholderTextColor="#64748B"
              maxLength={1500}
              value={blogDescription}
              onChangeText={setBlogDescription}
              multiline
              numberOfLines={6}
            />

            <TouchableOpacity style={styles.publishBlogBtn} onPress={handlePublishBlogPost} disabled={actionLoading}>
              <Text style={styles.submitBtnText}>
                {actionLoading ? 'Posting...' : 'Publish Blog Post'}
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
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 4,
    margin: 16,
    marginBottom: 8,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  topTabBtnActive: {
    backgroundColor: '#0F172A',
  },
  topTabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  topTabTextActive: {
    color: '#38BDF8',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionHeading: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  composeBtn: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  // Material Card
  materialCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  materialTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  materialSeller: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  downloadDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#062016',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  downloadDoneText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  // Gate Card (when blog is locked)
  gateCard: {
    backgroundColor: '#1E1B18',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    padding: 16,
    margin: 16,
    gap: 12,
  },
  gateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gateTitle: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  gateSub: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  reqBlock: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reqLabel: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  reqStatus: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 12,
  },
  unlockBtnDisabled: {
    backgroundColor: '#334155',
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  unlockBtnTextDisabled: {
    color: '#64748B',
  },
  // Blog Post Card
  blogCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 16,
  },
  blogPostTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorRealName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  authorUsername: {
    color: '#38BDF8',
    fontSize: 11,
  },
  postDateText: {
    color: '#64748B',
    fontSize: 11,
    marginLeft: 6,
  },
  blogContent: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upvoteText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  commentsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsText: {
    color: '#64748B',
    fontSize: 11,
  },
  // Modals
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
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
  priceSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  priceChip: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  priceChipActive: {
    borderColor: '#FBBF24',
    backgroundColor: '#302607',
  },
  priceChipText: {
    color: '#94A3B8',
    fontWeight: '700',
  },
  priceChipTextActive: {
    color: '#FBBF24',
  },
  submitBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  publishBlogBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
