// ProfileScreen.tsx
//
// This screen displays the user's profile including name, email, and reviews.
// Features include:
// - Fetching current user details from Appwrite
// - Updating the display name
// - Viewing, editing, and deleting user reviews
// - Logging out
// - Handling modal states, refreshing UI, and graceful error handling across all interactions

import { account, databases } from '@/lib/appwrite';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Models, Query } from 'react-native-appwrite';

// Appwrite configuration constants
const DATABASE_ID = '6872ea7d003af1fd5568';
const REVIEWS_COLLECTION_ID = '6874f201001a70a3a76d';

// Local type definitions for strong typing of Appwrite data
interface User {
  $id: string;
  name: string;
  email: string;
}

interface Review extends Models.Document {
  content: string;
  userId: string;
  timestamp: string;
}

interface LoadingState {
  updatingName: boolean;
  deletingReview: string | null;
  updatingReview: string | null;
}

export default function ProfileScreen() {
  // State variables for user profile, reviews, modal visibility, input values, and loading flags
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingGameTitle, setEditingGameTitle] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState('');
  const [editingReviewText, setEditingReviewText] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [newName, setNewName] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    updatingName: false,
    deletingReview: null,
    updatingReview: null,
  });

  const router = useRouter();

  // Fetch current authenticated user
  const fetchUser = async () => {
    try {
      const user = await account.get();
      setUser(user);
      setNewName(user.name);
      return user;
    } catch (err: any) {
      console.error('Error fetching user:', err);
      Alert.alert('Error', err.message || 'Failed to load profile. Please try again.');
      return null;
    }
  };

  // Fetch user's reviews based on user ID
  const fetchUserReviews = async (userId: string) => {
    try {
      const res = await databases.listDocuments<Review>(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        [Query.equal('userId', userId), Query.orderDesc('timestamp')]
      );
      setReviews(res.documents);
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      Alert.alert('Error', err.message || 'Failed to load reviews. Please try again.');
    }
  };

  // Update the user's display name
  const updateName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    if (newName.trim() === user?.name) return;

    setLoadingState(prev => ({ ...prev, updatingName: true }));

    try {
      await account.updateName(newName.trim());
      setUser(prev => prev ? { ...prev, name: newName.trim() } : null);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (err: any) {
      console.error('Error updating name:', err);
      Alert.alert('Error', err.message || 'Could not update name. Please try again.');
    } finally {
      setLoadingState(prev => ({ ...prev, updatingName: false }));
    }
  };

  // Delete a specific review document
  const deleteReview = async (reviewId: string) => {
    setLoadingState(prev => ({ ...prev, deletingReview: reviewId }));
    try {
      await databases.deleteDocument(DATABASE_ID, REVIEWS_COLLECTION_ID, reviewId);
      setReviews(prev => prev.filter(r => r.$id !== reviewId));
    } catch (err: any) {
      console.error('Error deleting review:', err);
      Alert.alert('Error', err.message || 'Could not delete review. Please try again.');
    } finally {
      setLoadingState(prev => ({ ...prev, deletingReview: null }));
    }
  };

  // Prompt or show modal to edit a review
  const updateReview = (reviewId: string, currentText: string) => {
    if (Platform.OS === 'web') {
      const newText = prompt('Update your review:', currentText);
      if (newText && newText !== currentText) {
        setLoadingState(prev => ({ ...prev, updatingReview: reviewId }));
        databases.updateDocument(DATABASE_ID, REVIEWS_COLLECTION_ID, reviewId, {
          content: newText,
        }).then(() => {
          setReviews(prev =>
            prev.map(r => (r.$id === reviewId ? { ...r, content: newText } : r))
          );
        }).catch((err: any) => {
          console.error('Error updating review (web):', err);
          Alert.alert('Error', err.message || 'Could not update review.');
        }).finally(() => {
          setLoadingState(prev => ({ ...prev, updatingReview: null }));
        });
      }
    } else {
      const gameTitle = reviews.find(r => r.$id === reviewId)?.gameTitle || '';
      setEditingGameTitle(gameTitle);
      setEditingReviewId(reviewId);
      setEditingReviewText(currentText);
      setEditModalVisible(true);
    }
  };

  // Save changes from the review edit modal
  const handleUpdateReview = async () => {
    if (!editingReviewText.trim()) {
      Alert.alert('Error', 'Review cannot be empty');
      return;
    }

    setLoadingState(prev => ({ ...prev, updatingReview: editingReviewId }));

    try {
      await databases.updateDocument(DATABASE_ID, REVIEWS_COLLECTION_ID, editingReviewId, {
        content: editingReviewText,
      });
      setReviews(prev =>
        prev.map(r => (r.$id === editingReviewId ? { ...r, content: editingReviewText } : r))
      );
      setEditModalVisible(false);
    } catch (err: any) {
      console.error('Error updating review:', err);
      Alert.alert('Error', err.message || 'Could not update review. Please try again.');
    } finally {
      setLoadingState(prev => ({ ...prev, updatingReview: null }));
    }
  };

  // Log the user out and return to login screen
  const signOut = async () => {
    try {
      await account.deleteSession('current');
      router.replace('/login');
    } catch (err: any) {
      console.error('Error signing out:', err);
      Alert.alert('Error', err.message || 'Could not sign out. Please try again.');
    }
  };

  // Pull-to-refresh logic
  const onRefresh = async () => {
    setRefreshing(true);
    const user = await fetchUser();
    if (user?.$id) {
      await fetchUserReviews(user.$id);
    }
    setRefreshing(false);
  };

  // On initial mount, fetch user and reviews
  useEffect(() => {
    fetchUser().then(res => {
      if (res?.$id) fetchUserReviews(res.$id);
      setLoading(false);
    });
  }, []);

  // Utility: Get initials from name (e.g., Bipin Sapkota → BS)
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Renders conditional UI states (loading, error, or profile content)
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.errorContent}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/login')}>
            <Text style={styles.primaryButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            {/* Profile Settings Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profile Settings</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Enter your display name"
                  placeholderTextColor="#9ca3af"
                  maxLength={50}
                />
                <TouchableOpacity 
                  style={[styles.primaryButton, loadingState.updatingName && styles.buttonDisabled]} 
                  onPress={updateName}
                  disabled={loadingState.updatingName}
                >
                  {loadingState.updatingName ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Update Name</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Reviews Section */}
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>My Reviews</Text>
              <View style={styles.reviewsCount}>
                <Text style={styles.reviewsCountText}>{reviews.length}</Text>
              </View>
            </View>

            {reviews.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No reviews yet</Text>
                <Text style={styles.emptyStateText}>
                  Start sharing your thoughts and experiences with the community
                </Text>
              </View>
            )}
          </View>
        }
        data={reviews}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewMeta}>
                <Text style={styles.reviewDate}>
                  {new Date(item.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>
              <View style={styles.reviewActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => updateReview(item.$id, item.content)}
                  disabled={loadingState.updatingReview === item.$id}
                >
                  {loadingState.updatingReview === item.$id ? (
                    <ActivityIndicator size="small" color="#667eea" />
                  ) : (
                    <Text style={styles.editButton}>Edit</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => deleteReview(item.$id)}
                  disabled={loadingState.deletingReview === item.$id}
                >
                  {loadingState.deletingReview === item.$id ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Text style={styles.deleteButton}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.reviewContent}>{item.content}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Success Modal */}
      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.successText}>Name updated successfully!</Text>
          </View>
        </View>
      </Modal>

      {/* Edit Review Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.editModal, { minHeight: 380, paddingBottom: 32 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Review</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {editingGameTitle ? (
              <Text style={styles.modalSubTitle}>Game: {editingGameTitle}</Text>
            ) : null}

            <TextInput
              style={styles.textArea}
              multiline
              value={editingReviewText}
              onChangeText={setEditingReviewText}
              placeholder="Share your thoughts..."
              placeholderTextColor="#9ca3af"
              maxLength={500}
              textAlignVertical="top"
            />

            <View style={[styles.modalActions, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={handleUpdateReview}
                disabled={loadingState.updatingReview !== null}
              >
                {loadingState.updatingReview ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#667eea',
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  signOutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
    color: '#1f2937',
  },
  primaryButton: {
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  reviewsCount: {
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  reviewsCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  reviewCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewMeta: {
    flex: 1,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editButton: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  reviewContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  successIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  successText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
    textAlign: 'center',
  },
  editModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalClose: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: '500',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
    color: '#1f2937',
    minHeight: 120,
  },
  modalActions: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  modalSubTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  
});
