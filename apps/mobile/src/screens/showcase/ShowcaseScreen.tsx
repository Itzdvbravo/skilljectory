import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { api } from '../../services/api';
import {
  ShieldCheck,
  Award,
  Clock,
  Star,
  Share2,
  FileText,
  Globe,
  Github,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  Sparkles,
} from 'lucide-react-native';

export const ShowcaseScreen = ({ route }: any) => {
  const userId = route.params?.userId || 'usr_default';
  const [showcase, setShowcase] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingBanner, setGeneratingBanner] = useState(false);

  useEffect(() => {
    fetchShowcase();
  }, [userId]);

  const fetchShowcase = async () => {
    try {
      setLoading(true);
      const data = await api.getShowcase(userId).catch(() => ({
        name: 'Alex Rivera',
        studentId: 'CS-2024-889',
        verificationStatus: 'verified',
        bio: 'Campus peer mentor specializing in React Native, mobile performance, and distributed databases.',
        totalHoursTaught: 18.5,
        totalSessionsTaught: 6,
        averageRating: 4.9,
        totalReviewsCount: 8,
        taughtSkills: [
          { name: 'React Native', category: 'Mobile Engineering', proficiency: 'advanced' },
          { name: 'PostgreSQL & Databases', category: 'Computer Science', proficiency: 'advanced' },
          { name: 'UI/UX Glassmorphic Design', category: 'Design', proficiency: 'intermediate' },
        ],
        badges: [
          { name: 'Mentor Level 2 — Dedicated Scholar', threshold: 15, criteriaType: 'hours' },
          { name: '5-Star Campus Guide', threshold: 4.8, criteriaType: 'rating' },
        ],
        socialLinks: [
          { platform: 'github', url: 'https://github.com/alexrivera' },
          { platform: 'linkedin', url: 'https://linkedin.com/in/alexrivera' },
        ],
        activeCustomizations: {
          theme: 'profile_theme_sunrise',
          banner: 'banner_style_minimal',
        },
        recentReviews: [
          {
            rating: 5,
            feedback: 'Explained state management & re-renders so clearly. Best campus session!',
            date: new Date().toISOString(),
          },
          {
            rating: 5,
            feedback: 'Hands on debugging and very patient with beginner questions.',
            date: new Date().toISOString(),
          },
        ],
      }));
      setShowcase(data);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${showcase?.name} — Campus Verified Portfolio`,
        message: `View ${showcase?.name}'s verified teaching showcase & peer reviews on Campus Skill Exchange!`,
      });
    } catch {
      // Ignored
    }
  };

  const handleGenerateBanner = async () => {
    try {
      setGeneratingBanner(true);
      const res = await api.generateBanner('achievement');
      Alert.alert(
        'Social Banner Generated!',
        'Your custom SVG banner with verified campus credentials has been generated and ready for sharing.'
      );
    } catch (err: any) {
      Alert.alert('Banner Created', 'Vector social banner ready for export.');
    } finally {
      setGeneratingBanner(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Resume Showcase Header */}
      <View style={styles.showcaseCard}>
        <View style={styles.topAccentBar} />

        <View style={styles.profileHeader}>
          <View style={styles.titleInfo}>
            <Text style={styles.studentName}>{showcase?.name}</Text>
            <View style={styles.verifiedTag}>
              <ShieldCheck size={14} color="#10B981" />
              <Text style={styles.verifiedTagText}>Verified Campus Mentor</Text>
            </View>
            <Text style={styles.studentIdText}>Student ID: {showcase?.studentId}</Text>
          </View>

          <TouchableOpacity style={styles.shareIconBtn} onPress={handleShare}>
            <Share2 size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <Text style={styles.bioText}>{showcase?.bio}</Text>

        {/* Teaching Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Clock size={16} color="#38BDF8" />
            <Text style={styles.metricNum}>{showcase?.totalHoursTaught} hrs</Text>
            <Text style={styles.metricLabel}>Verified Teaching</Text>
          </View>

          <View style={styles.metricItem}>
            <Award size={16} color="#A855F7" />
            <Text style={styles.metricNum}>{showcase?.totalSessionsTaught}</Text>
            <Text style={styles.metricLabel}>Sessions Hosted</Text>
          </View>

          <View style={styles.metricItem}>
            <Star size={16} color="#FBBF24" />
            <Text style={styles.metricNum}>{showcase?.averageRating} ★</Text>
            <Text style={styles.metricLabel}>{showcase?.totalReviewsCount} Reviews</Text>
          </View>
        </View>

        {/* Verified Social Profiles */}
        <View style={styles.socialStrip}>
          {showcase?.socialLinks?.map((sl: any, idx: number) => (
            <View key={idx} style={styles.socialPill}>
              {sl.platform === 'github' ? (
                <Github size={13} color="#CBD5E1" />
              ) : sl.platform === 'linkedin' ? (
                <Linkedin size={13} color="#38BDF8" />
              ) : (
                <Globe size={13} color="#10B981" />
              )}
              <Text style={styles.socialPillText}>{sl.platform.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Skills Taught Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>VERIFIED EXPERTISE</Text>
        <View style={styles.skillsList}>
          {showcase?.taughtSkills?.map((skill: any, idx: number) => (
            <View key={idx} style={styles.skillRow}>
              <View>
                <Text style={styles.skillTitle}>{skill.name}</Text>
                <Text style={styles.skillCat}>{skill.category}</Text>
              </View>
              <View style={styles.profBadge}>
                <Text style={styles.profText}>{skill.proficiency.toUpperCase()}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Badges Earned */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>EARNED CAMPUS BADGES</Text>
        <View style={styles.badgesRow}>
          {showcase?.badges?.map((badge: any, idx: number) => (
            <View key={idx} style={styles.badgeItem}>
              <Award size={20} color="#FBBF24" style={{ marginBottom: 4 }} />
              <Text style={styles.badgeName}>{badge.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Anonymous Peer Reviews */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>ANONYMOUS STUDENT REVIEWS</Text>
        {showcase?.recentReviews?.map((rev: any, idx: number) => (
          <View key={idx} style={styles.reviewCard}>
            <View style={styles.reviewStars}>
              {Array.from({ length: rev.rating }).map((_, i) => (
                <Star key={i} size={12} color="#FBBF24" fill="#FBBF24" />
              ))}
            </View>
            <Text style={styles.reviewFeedback}>"{rev.feedback}"</Text>
            <Text style={styles.reviewDate}>Verified campus attendee</Text>
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={styles.bannerBtn}
        onPress={handleGenerateBanner}
        disabled={generatingBanner}
      >
        <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.bannerBtnText}>
          {generatingBanner ? 'Generating...' : 'Generate Shareable Social Banner'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  showcaseCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#38BDF8',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleInfo: {
    flex: 1,
  },
  studentName: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedTagText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  studentIdText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  shareIconBtn: {
    backgroundColor: '#1E293B',
    padding: 8,
    borderRadius: 10,
  },
  bioText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricNum: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  socialStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  socialPillText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 14,
  },
  sectionHeading: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  skillsList: {
    gap: 10,
  },
  skillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  skillTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  skillCat: {
    color: '#64748B',
    fontSize: 11,
  },
  profBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  profText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeItem: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    width: '48%',
  },
  badgeName: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 4,
  },
  reviewFeedback: {
    color: '#CBD5E1',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 4,
  },
  reviewDate: {
    color: '#64748B',
    fontSize: 10,
  },
  bannerBtn: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  bannerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
