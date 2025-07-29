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
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Platform, RefreshControl, SafeAreaView,
  StatusBar, StyleSheet, Text,
  TextInput,
  TouchableOpacity, View
} from 'react-native';
import { Models, Query } from 'react-native-appwrite';

/**
 * Database configuration constants
 * These IDs reference the Appwrite database and collection for user reviews
 */
const DATABASE_ID = '6872ea7d003af1fd5568';
const GAMES_COLLECTION_ID = '6872ea8f003d0ad02fee';
const REVIEWS_COLLECTION_ID = '6874f201001a70a3a76d';

/**
 * Type definition for user data structure
 * Extends Appwrite's user model with required fields
 */
interface User {
  $id: string;    // Unique user identifier from Appwrite
  name: string;   // User's display name
  email: string;  // User's email address
}

/**
 * Type definition for review documents
 * Extends Appwrite's Models.Document with review-specific fields
 */
interface Review extends Models.Document {
  content: string;    // Review text content
  userId: string;     // ID of user who created the review
  timestamp: string;  // ISO timestamp of when review was created
  gameId?: string;    // Game ID reference
  userName?: string;  // User name who created the review
  gameTitle?: string; // Game title (fetched separately)
}

/**
 * Type definition for loading states across different operations
 * Helps manage UI state during async operations
 */
interface LoadingState {
  updatingName: boolean;           // Whether name update is in progress
  deletingReview: string | null;   // ID of review being deleted (null if none)
  updatingReview: string | null;   // ID of review being updated (null if none)
}


export default function ProfileScreen() {
  // Modal and UI state management
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingGameTitle, setEditingGameTitle] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState('');
  const [editingReviewText, setEditingReviewText] = useState('');
  
  // User and data state
  const [user, setUser] = useState<User | null>(null);
  const [newName, setNewName] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  
  // Loading and refresh state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    updatingName: false,
    deletingReview: null,
    updatingReview: null,
  });


  const router = useRouter();

  //Fetches current user information from Appwrite
   
  const fetchUser = async (): Promise<User | null> => {
    try {
      const user = await account.get();
      
      // Validate user data structure
      if (!user || !user.$id || !user.name || !user.email) {
        throw new Error('Invalid user data structure received from server');
      }
      
      setUser(user);
      setNewName(user.name);
      return user;
    } catch (err) {
      // Enhanced error logging with context
      console.error('Failed to fetch user profile:', {
        error: err,
        timestamp: new Date().toISOString(),
        context: 'fetchUser'
      });
      
      // Handle specific error types
      if (err instanceof Error) {
        if (err.message.includes('unauthorized') || err.message.includes('401')) {
          Alert.alert(
            'Session Expired', 
            'Your session has expired. Please log in again.',
            [{ text: 'OK', onPress: () => router.replace('/login') }]
          );
          return null;
        }
        
        if (err.message.includes('network') || err.message.includes('fetch')) {
          Alert.alert(
            'Network Error', 
            'Unable to connect to server. Please check your internet connection and try again.'
          );
          return null;
        }
      }
      
      Alert.alert('Error', 'Failed to load profile. Please try again.');
      return null;
    }
  };

 //Fetches all reviews created by the specified user
  
  const fetchUserReviews = async (userId: string): Promise<void> => {
    // Input validation
    if (!userId || typeof userId !== 'string') {
      console.error('Invalid userId provided to fetchUserReviews:', userId);
      Alert.alert('Error', 'Invalid user identifier. Please try refreshing the page.');
      return;
    }

    try {
      const res = await databases.listDocuments<Review>(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        [Query.equal('userId', userId), Query.orderDesc('timestamp')]
      );
      
      // Validate response structure
      if (!res || !Array.isArray(res.documents)) {
        throw new Error('Invalid response structure from database');
      }
      
      // Fetch game titles for each review
      const reviewsWithTitles = await Promise.all(
        res.documents.map(async (review) => {
          let gameTitle = 'Unknown Game';
          
          if (review.gameId) {
            try {
              const gameDoc = await databases.getDocument(
                DATABASE_ID,
                GAMES_COLLECTION_ID,
                review.gameId
              );
              gameTitle = gameDoc.title || 'Unknown Game';
            } catch (error) {
              console.error('Failed to fetch game title for gameId:', review.gameId, error);
              // Keep default title if game fetch fails
            }
          }
          
          return {
            ...review,
            gameTitle
          };
        })
      );
      
      setReviews(reviewsWithTitles);
      
      // Remove debug logging in production
      console.log('Fetched reviews with titles:', reviewsWithTitles);
      
    } catch (err) {
      // Enhanced error logging
      console.error('Failed to fetch user reviews:', {
        error: err,
        userId,
        timestamp: new Date().toISOString(),
        context: 'fetchUserReviews'
      });
      
      // Handle specific error scenarios
      if (err instanceof Error) {
        if (err.message.includes('permission') || err.message.includes('403')) {
          Alert.alert(
            'Access Denied', 
            'You do not have permission to view these reviews.'
          );
          return;
        }
        
        if (err.message.includes('not found') || err.message.includes('404')) {
          Alert.alert(
            'Reviews Not Found', 
            'Unable to find reviews for this user.'
          );
          return;
        }
      }
      
      Alert.alert('Error', 'Failed to load reviews. Please try again.');
    }
  };


  // Updates the user's display name and all associated reviews
  const updateName = async (): Promise<void> => {
    // Input validation
    const trimmedName = newName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    
    // Check if name actually changed
    if (trimmedName === user?.name) {
      return; // No changes needed
    }

    // Additional validation for name length and characters
    if (trimmedName.length > 50) {
      Alert.alert('Error', 'Name cannot exceed 50 characters');
      return;
    }

    setLoadingState(prev => ({ ...prev, updatingName: true }));
    
    try {
      // Update user account name
      await account.updateName(trimmedName);
      
      // Update userName in all existing reviews
      if (user?.$id) {
        try {
          // Fetch all reviews by this user
          const userReviews = await databases.listDocuments(
            DATABASE_ID,
            REVIEWS_COLLECTION_ID,
            [Query.equal('userId', user.$id)]
          );
          
          // Update each review's userName field
          const updatePromises = userReviews.documents.map(review => 
            databases.updateDocument(
              DATABASE_ID,
              REVIEWS_COLLECTION_ID,
              review.$id,
              { userName: trimmedName }
            )
          );
          
          await Promise.all(updatePromises);
          
          // Update local reviews state to reflect the new name
          setReviews(prevReviews => 
            prevReviews.map(review => ({
              ...review,
              userName: review.userId === user.$id ? trimmedName : review.userName
            }))
          );
          
          console.log(`Updated ${userReviews.documents.length} reviews with new name`);
        } catch (reviewUpdateError) {
          console.error('Failed to update reviews with new name:', reviewUpdateError);
          // Don't fail the entire operation if review updates fail
          Alert.alert(
            'Partial Update', 
            'Your name was updated, but some reviews may still show the old name. They will be updated gradually.'
          );
        }
      }
      
      // Update local user state
      setUser((prev: User | null) => prev ? { ...prev, name: trimmedName } : null);
      
      // Show success feedback
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
      
    } catch (err) {
      // Enhanced error logging
      console.error('Failed to update user name:', {
        error: err,
        newName: trimmedName,
        userId: user?.$id,
        timestamp: new Date().toISOString(),
        context: 'updateName'
      });
      
      // Handle specific error types
      if (err instanceof Error) {
        if (err.message.includes('unauthorized') || err.message.includes('401')) {
          Alert.alert(
            'Session Expired', 
            'Your session has expired. Please log in again.',
            [{ text: 'OK', onPress: () => router.replace('/login') }]
          );
          return;
        }
        
        if (err.message.includes('validation') || err.message.includes('400')) {
          Alert.alert(
            'Invalid Name', 
            'The name you entered is not valid. Please try a different name.'
          );
          return;
        }
      }
      
      Alert.alert('Error', 'Could not update name. Please try again.');
    } finally {
      setLoadingState(prev => ({ ...prev, updatingName: false }));
    }
  };


   // Deletes a review from the database and updates local state
  const deleteReview = async (reviewId: string): Promise<void> => {
    // Input validation
    if (!reviewId || typeof reviewId !== 'string') {
      console.error('Invalid reviewId provided to deleteReview:', reviewId);
      Alert.alert('Error', 'Invalid review identifier');
      return;
    }

    setLoadingState(prev => ({ ...prev, deletingReview: reviewId }));
    
    try {
      await databases.deleteDocument(DATABASE_ID, REVIEWS_COLLECTION_ID, reviewId);
      
      // Update local state only after successful deletion
      setReviews((prev) => prev.filter((r) => r.$id !== reviewId));
      
    } catch (err) {
      // Enhanced error logging
      console.error('Failed to delete review:', {
        error: err,
        reviewId,
        userId: user?.$id,
        timestamp: new Date().toISOString(),
        context: 'deleteReview'
      });
      
      // Handle specific error scenarios
      if (err instanceof Error) {
        if (err.message.includes('not found') || err.message.includes('404')) {
          Alert.alert(
            'Review Not Found', 
            'This review has already been deleted or does not exist.'
          );
          // Remove from local state even if not found on server
          setReviews((prev) => prev.filter((r) => r.$id !== reviewId));
          return;
        }
        
        if (err.message.includes('permission') || err.message.includes('403')) {
          Alert.alert(
            'Access Denied', 
            'You do not have permission to delete this review.'
          );
          return;
        }
      }
      
      Alert.alert('Error', 'Could not delete review. Please try again.');
    } finally {
      setLoadingState(prev => ({ ...prev, deletingReview: null }));
    }
  };

  /**
   * Initiates review editing process
   * 
   * @param reviewId - The unique identifier of the review to edit
   * @param currentText - The current text content of the review
   * 
   * Platform-specific handling:
   * - Web: Uses browser prompt dialog
   * - Mobile: Opens custom modal for better UX
   */
  const updateReview = (reviewId: string, currentText: string): void => {
    // Input validation
    if (!reviewId || typeof reviewId !== 'string') {
      console.error('Invalid reviewId provided to updateReview:', reviewId);
      Alert.alert('Error', 'Invalid review identifier');
      return;
    }

    if (typeof currentText !== 'string') {
      console.error('Invalid currentText provided to updateReview:', currentText);
      Alert.alert('Error', 'Invalid review content');
      return;
    }

    if (Platform.OS === 'web') {
      // Web platform: use browser prompt
      try {
        const newText = prompt('Update your review:', currentText);
        if (newText && newText !== currentText && newText.trim()) {
          handleUpdateReviewWeb(reviewId, newText.trim());
        }
      } catch (err) {
        console.error('Failed to show prompt dialog:', err);
        Alert.alert('Error', 'Unable to open edit dialog. Please try again.');
      }
    } else {
      // Mobile platform: use custom modal
      try {
        const review = reviews.find((r) => r.$id === reviewId);
        const gameTitle = review?.gameTitle || '';
        
        setEditingGameTitle(gameTitle);
        setEditingReviewId(reviewId);
        setEditingReviewText(currentText);
        setEditModalVisible(true);
      } catch (err) {
        console.error('Failed to initialize edit modal:', err);
        Alert.alert('Error', 'Unable to open edit dialog. Please try again.');
      }
    }
  };

  /**
   * Handles review update for web platform using prompt dialog
   * 
   * @param reviewId - The unique identifier of the review to update
   * @param newText - The new text content for the review
   */
  const handleUpdateReviewWeb = async (reviewId: string, newText: string): Promise<void> => {
    setLoadingState(prev => ({ ...prev, updatingReview: reviewId }));
    
    try {
      await databases.updateDocument(DATABASE_ID, REVIEWS_COLLECTION_ID, reviewId, {
        content: newText,
      });
      
      // Update local state
      setReviews((prev) =>
        prev.map((r) => (r.$id === reviewId ? { ...r, content: newText } : r))
      );
      
    } catch (err) {
      console.error('Failed to update review (web):', {
        error: err,
        reviewId,
        timestamp: new Date().toISOString(),
        context: 'handleUpdateReviewWeb'
      });
      
      Alert.alert('Error', 'Could not update review. Please try again.');
    } finally {
      setLoadingState(prev => ({ ...prev, updatingReview: null }));
    }
  };

  // Handles review update for mobile platforms using modal dialog
  const handleUpdateReview = async (): Promise<void> => {
    // Input validation
    const trimmedText = editingReviewText.trim();
    if (!trimmedText) {
      Alert.alert('Error', 'Review cannot be empty');
      return;
    }

    // Additional validation for review length
    if (trimmedText.length > 500) {
      Alert.alert('Error', 'Review cannot exceed 500 characters');
      return;
    }

    if (!editingReviewId) {
      Alert.alert('Error', 'Invalid review selected for editing');
      return;
    }

    setLoadingState(prev => ({ ...prev, updatingReview: editingReviewId }));
    
    try {
      await databases.updateDocument(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        editingReviewId,
        { content: trimmedText }
      );
      
      // Update local state
      setReviews((prev) =>
        prev.map((r) =>
          r.$id === editingReviewId ? { ...r, content: trimmedText } : r
        )
      );
      
      // Close modal on success
      setEditModalVisible(false);
      
    } catch (err) {
      // Enhanced error logging
      console.error('Failed to update review (mobile):', {
        error: err,
        reviewId: editingReviewId,
        newContent: trimmedText,
        timestamp: new Date().toISOString(),
        context: 'handleUpdateReview'
      });
      
      // Handle specific error scenarios
      if (err instanceof Error) {
        if (err.message.includes('not found') || err.message.includes('404')) {
          Alert.alert(
            'Review Not Found', 
            'This review no longer exists and cannot be updated.'
          );
          setEditModalVisible(false);
          return;
        }
        
        if (err.message.includes('permission') || err.message.includes('403')) {
          Alert.alert(
            'Access Denied', 
            'You do not have permission to edit this review.'
          );
          return;
        }
        
        if (err.message.includes('validation') || err.message.includes('400')) {
          Alert.alert(
            'Invalid Content', 
            'The review content is not valid. Please check your text and try again.'
          );
          return;
        }
      }
      
      Alert.alert('Error', 'Could not update review. Please try again.');
    } finally {
      setLoadingState(prev => ({ ...prev, updatingReview: null }));
    }
  };

  // Signs out the current user and navigates to login screen
  const signOut = async (): Promise<void> => {
    try {
      await account.deleteSession('current');
      router.replace('/login');
    } catch (err) {
      // Enhanced error logging
      console.error('Failed to sign out user:', {
        error: err,
        userId: user?.$id,
        timestamp: new Date().toISOString(),
        context: 'signOut'
      });
      
      // Even if session deletion fails on server, navigate to login
      // This ensures user can still "sign out" locally
      router.replace('/login');
      
      // Handle specific error scenarios
      if (err instanceof Error) {
        if (err.message.includes('session') || err.message.includes('401')) {
          // Session already invalid, no need to show error
          return;
        }
        
        if (err.message.includes('network')) {
          Alert.alert(
            'Network Error', 
            'Unable to connect to server, but you have been signed out locally.'
          );
          return;
        }
      }
      
      Alert.alert(
        'Sign Out Warning', 
        'There was an issue signing out completely, but you have been signed out locally.'
      );
    }
  };

  // Handles pull-to-refresh functionality
  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    
    try {
      const user = await fetchUser();
      if (user?.$id) {
        await fetchUserReviews(user.$id);
      }
    } catch (err) {
      // Error handling is managed within fetchUser and fetchUserReviews
      console.error('Error during refresh:', err);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Component initialization effect
   * Fetches user data and associated reviews on component mount
   */
  useEffect(() => {
    const initializeProfile = async () => {
      try {
        const user = await fetchUser();
        if (user?.$id) {
          await fetchUserReviews(user.$id);
        }
      } catch (err) {
        console.error('Failed to initialize profile:', err);
        // Error handling is managed within individual functions
      } finally {
        setLoading(false);
      }
    };

    initializeProfile();
  }, []);

  /**
   * Focus effect to refresh reviews when screen comes into focus
   * This ensures reviews are updated when navigating back from other screens
   */
  useFocusEffect(
    useCallback(() => {
      const refreshReviewsOnFocus = async () => {
        if (user?.$id && !loading) {
          // Only fetch reviews if we already have user data and aren't in initial loading
          await fetchUserReviews(user.$id);
        }
      };

      refreshReviewsOnFocus();
    }, [user?.$id, loading])
  );

  /**
   * Loading state UI
   * Displayed while initial data is being fetched
   */
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

  /**
   * Error state UI
   * Displayed when user data could not be loaded
   */
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

 // Utility function to generate user initials for avatar display
  const getInitials = (name: string): string => {
    try {
      if (!name || typeof name !== 'string') {
        return '??';
      }
      
      return name
        .split(' ')
        .filter(n => n.length > 0) // Filter out empty strings
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    } catch (err) {
      console.error('Failed to generate initials:', err);
      return '??';
    }
  };

  /**
   * Main component render
   * Renders the complete profile interface with all features
   */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header Section: User info and sign out button */}
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

      {/* Main Content: Profile settings and reviews list */}
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

            {/* Reviews Section Header */}
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>My Reviews</Text>
              <View style={styles.reviewsCount}>
                <Text style={styles.reviewsCountText}>{reviews.length}</Text>
              </View>
            </View>

            {/* Empty State: Shown when user has no reviews */}
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
                {/* Display game title if available */}
                {item.gameTitle && (
                  <Text style={styles.gameTitle}>{item.gameTitle}</Text>
                )}
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

      {/* Success Modal: Shown after successful name update */}
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

      {/* Edit Review Modal: Mobile-specific review editing interface */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Review</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Optional game title display */}
            {editingGameTitle ? (
              <Text style={styles.modalSubTitle}>Game: {editingGameTitle}</Text>
            ) : null}

            {/* Review text input */}
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

            {/* Modal action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
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

/**
 * StyleSheet definitions for all component styling
 * Organized by component sections and states
 */
const styles = StyleSheet.create({
  // Main container styles
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Header section styles
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
  
  // Content and list styles
  content: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  
  // Card and form styles
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
  
  // Button styles
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
  
  // Reviews section styles
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
  
  // Empty state styles
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
  
  // Review card styles
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewMeta: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 4,
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
  
  // Loading state styles
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
  
  // Error state styles
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
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Success modal styles
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
  
  // Edit modal styles
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
  modalSubTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
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
  
});