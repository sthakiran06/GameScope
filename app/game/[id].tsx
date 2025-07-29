import { account, databases } from '@/lib/appwrite';
import { useLocalSearchParams } from 'expo-router';
import { JSX, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ID, Query } from 'react-native-appwrite';

/**
 * Appwrite Database Configuration Constants
 * These IDs should ideally be stored in environment variables for better security
 */
const DATABASE_ID = '6872ea7d003af1fd5568';
const GAMES_COLLECTION_ID = '6872ea8f003d0ad02fee';
const REVIEWS_COLLECTION_ID = '6874f201001a70a3a76d';
const FAVORITES_COLLECTION_ID = '6874fecd0002abec583d';

/**
 * Error Messages Configuration
 * Centralized error messages for consistent user experience
 */
const ERROR_MESSAGES = {
  GAME_NOT_FOUND: 'Game not found. Please try again later.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  AUTHENTICATION_ERROR: 'Authentication failed. Please log in again.',
  REVIEW_SUBMISSION_FAILED: 'Failed to submit review. Please try again.',
  FAVORITE_TOGGLE_FAILED: 'Failed to update favorites. Please try again.',
  GENERIC_ERROR: 'Something went wrong. Please try again later.',
  INVALID_GAME_ID: 'Invalid game ID provided.',
  REVIEW_TOO_SHORT: 'Review must contain at least one character.',
  REVIEW_TOO_LONG: 'Review exceeds maximum character limit.',
};

/**
 * Interface definitions for type safety
 */
interface Game {
  $id: string;
  title: string;
  image: string;
  category: string;
  platform: string;
  releaseDate: string;
  summary: string;
}

interface Review {
  $id: string;
  gameId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
}

interface Favorite {
  $id: string;
  userId: string;
  gameId: string;
  gameTitle: string;
  gameImage: string;
}

/**
 * GameDetailScreen Component
 * 
 * This component displays detailed information about a specific game, including:
 * - Game information and cover image
 * - User reviews and ability to add new reviews
 * - Favorite functionality to save/remove games from user favorites
 * 
 * @returns {JSX.Element} The rendered game detail screen
 */
export default function GameDetailScreen(): JSX.Element {
  // Extract game ID from route parameters
  const { id } = useLocalSearchParams();
  
  // State management for component data
  const [game, setGame] = useState<Game | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [togglingFavorite, setTogglingFavorite] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validates the game ID parameter
   * @param {unknown} gameId - The game ID to validate
   * @returns {boolean} True if valid, false otherwise
   */
  const validateGameId = (gameId: unknown): gameId is string => {
    return typeof gameId === 'string' && gameId.length > 0;
  };

  /**
   * Shows an error alert to the user
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   */
  const showErrorAlert = (title: string, message: string): void => {
    Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
  };

  /**
   * Handles network-related errors and provides appropriate user feedback
   * @param {unknown} error - The error object
   * @param {string} context - Context where the error occurred
   */
  const handleError = (error: unknown, context: string): void => {
    console.error(`Error in ${context}:`, error);
    
    let errorMessage = ERROR_MESSAGES.GENERIC_ERROR;
    
    if (error && typeof error === 'object' && 'message' in error) {
      const errorObj = error as { message: string; code?: number };
      
      // Handle specific Appwrite error codes
      if (errorObj.message.includes('network') || errorObj.message.includes('fetch')) {
        errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
      } else if (errorObj.message.includes('unauthorized') || errorObj.message.includes('authentication')) {
        errorMessage = ERROR_MESSAGES.AUTHENTICATION_ERROR;
      } else if (errorObj.message.includes('not found')) {
        errorMessage = ERROR_MESSAGES.GAME_NOT_FOUND;
      }
    }
    
    setError(errorMessage);
  };

  /**
   * Fetches game details from the database
   * Handles errors gracefully and updates loading state
   */
  const fetchGame = async (): Promise<void> => {
    try {
      setError(null);
      
      if (!validateGameId(id)) {
        throw new Error(ERROR_MESSAGES.INVALID_GAME_ID);
      }

      const response = await databases.getDocument(
        DATABASE_ID,
        GAMES_COLLECTION_ID,
        id as string
      );
      
      // Validate response structure
      if (!response || !response.title) {
        throw new Error('Invalid game data received');
      }
      
      setGame(response as unknown as Game);
      console.log('Game image URL:', response.image);
      
    } catch (error) {
      handleError(error, 'fetchGame');
      setGame(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches reviews for the current game
   * Orders reviews by timestamp in descending order (newest first)
   */
  const fetchReviews = async (): Promise<void> => {
    try {
      if (!validateGameId(id)) {
        return;
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        [
          Query.equal('gameId', id as string),
          Query.orderDesc('timestamp')
        ]
      );
      
      setReviews(response.documents as unknown as Review[]);
      
    } catch (error) {
      handleError(error, 'fetchReviews');
      // Don't reset reviews on error to maintain existing data
    }
  };

  /**
   * Validates review content before submission
   * @param {string} content - The review content to validate
   * @returns {boolean} True if valid, false otherwise
   */
  const validateReviewContent = (content: string): boolean => {
    const trimmedContent = content.trim();
    
    if (trimmedContent.length === 0) {
      showErrorAlert('Invalid Review', ERROR_MESSAGES.REVIEW_TOO_SHORT);
      return false;
    }
    
    if (trimmedContent.length > 500) {
      showErrorAlert('Review Too Long', ERROR_MESSAGES.REVIEW_TOO_LONG);
      return false;
    }
    
    return true;
  };

  /**
   * Submits a new review for the current game
   * Validates content, authenticates user, and updates local state
   */
  const submitReview = async (): Promise<void> => {
    if (!validateReviewContent(newReview)) {
      return;
    }
    
    setSubmittingReview(true);
    setError(null);
    
    try {
      // Get current authenticated user
      const user = await account.get();
      
      if (!user || !user.$id) {
        throw new Error(ERROR_MESSAGES.AUTHENTICATION_ERROR);
      }

      // Create new review document
      const reviewData = {
        gameId: id as string,
        userId: user.$id,
        userName: user.name || 'Anonymous User',
        content: newReview.trim(),
        timestamp: new Date().toISOString(),
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        ID.unique(),
        reviewData
      );
      
      // Update local state with new review
      setReviews(prevReviews => [response as unknown as Review, ...prevReviews]);
      setNewReview('');
      
      // Show success feedback
      Alert.alert('Success', 'Your review has been submitted successfully!');
      
    } catch (error) {
      handleError(error, 'submitReview');
      showErrorAlert('Review Submission Failed', ERROR_MESSAGES.REVIEW_SUBMISSION_FAILED);
    } finally {
      setSubmittingReview(false);
    }
  };

  /**
   * Checks if the current game is in the user's favorites
   * Updates the isFavorite state based on the result
   */
  const checkIfFavorite = async (): Promise<void> => {
    try {
      if (!validateGameId(id)) {
        return;
      }

      const user = await account.get();
      
      if (!user || !user.$id) {
        console.warn('User not authenticated, skipping favorite check');
        return;
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        FAVORITES_COLLECTION_ID,
        [
          Query.equal('userId', user.$id),
          Query.equal('gameId', id as string),
        ]
      );
      
      setIsFavorite(response.documents.length > 0);
      
    } catch (error) {
      handleError(error, 'checkIfFavorite');
      // Set to false on error to prevent inconsistent state
      setIsFavorite(false);
    }
  };

  /**
   * Toggles the favorite status of the current game
   * Adds to favorites if not favorited, removes if already favorited
   */
  const toggleFavorite = async (): Promise<void> => {
    if (!game || !validateGameId(id)) {
      showErrorAlert('Error', 'Invalid game data');
      return;
    }
    
    setTogglingFavorite(true);
    setError(null);
    
    try {
      const user = await account.get();
      
      if (!user || !user.$id) {
        throw new Error(ERROR_MESSAGES.AUTHENTICATION_ERROR);
      }

      if (isFavorite) {
        // Remove from favorites
        const existingFavorites = await databases.listDocuments(
          DATABASE_ID,
          FAVORITES_COLLECTION_ID,
          [
            Query.equal('userId', user.$id),
            Query.equal('gameId', id as string),
          ]
        );
        
        if (existingFavorites.documents.length > 0) {
          await databases.deleteDocument(
            DATABASE_ID,
            FAVORITES_COLLECTION_ID,
            existingFavorites.documents[0].$id
          );
        }
        
        setIsFavorite(false);
        
      } else {
        // Add to favorites
        const favoriteData = {
          userId: user.$id,
          gameId: id as string,
          gameTitle: game.title,
          gameImage: game.image,
        };

        await databases.createDocument(
          DATABASE_ID,
          FAVORITES_COLLECTION_ID,
          ID.unique(),
          favoriteData
        );
        
        setIsFavorite(true);
      }
      
    } catch (error) {
      handleError(error, 'toggleFavorite');
      showErrorAlert('Favorites Update Failed', ERROR_MESSAGES.FAVORITE_TOGGLE_FAILED);
    } finally {
      setTogglingFavorite(false);
    }
  };

  /**
   * Formats a date string for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown date';
    }
  };

  /**
   * Effect hook to initialize component data
   * Fetches game details, reviews, and favorite status when component mounts
   */
  useEffect(() => {
    if (!validateGameId(id)) {
      setError(ERROR_MESSAGES.INVALID_GAME_ID);
      setLoading(false);
      return;
    }
    
    // Initialize all data fetching
    const initializeData = async () => {
      await Promise.all([
        fetchGame(),
        fetchReviews(),
        checkIfFavorite(),
      ]);
    };
    
    initializeData();
  }, [id]);

  /**
   * Focus effect to refresh reviews when screen comes into focus
   * This ensures reviews show updated user names when navigating back
   */
  useFocusEffect(
    useCallback(() => {
      const refreshReviewsOnFocus = async () => {
        if (validateGameId(id) && !loading) {
          // Only fetch reviews if we have a valid game ID and aren't in initial loading
          await fetchReviews();
        }
      };

      refreshReviewsOnFocus();
    }, [id, loading])
  );

  /**
   * Loading State Component
   * Displays loading spinner while fetching initial data
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading game details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Error State Component
   * Displays error message when game cannot be loaded
   */
  if (error || !game) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.errorContent}>
          <Text style={styles.errorText}>
            {error || ERROR_MESSAGES.GAME_NOT_FOUND}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              fetchGame();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Main Component Render
   * Displays the complete game detail interface
   */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {game.title}
          </Text>
        </View>
      </View>

      {/* Main Content Scroll View */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Game Cover Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={{ 
              uri: game.image,
              cache: 'force-cache' // Enable image caching for better performance
            }}
            style={styles.gameImage}
            resizeMode={Platform.OS === 'web' ? 'contain' : 'cover'}
            onError={(error) => {
              console.error('Image loading error:', error.nativeEvent.error);
            }}
          />
        </View>

        {/* Game Information Card */}
        <View style={styles.card}>
          <View style={styles.gameInfoHeader}>
            <Text style={styles.gameTitle} numberOfLines={3}>
              {game.title}
            </Text>
            <TouchableOpacity 
              style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
              onPress={toggleFavorite}
              disabled={togglingFavorite}
              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              accessibilityRole="button"
            >
              {togglingFavorite ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.favoriteButtonText}>
                  {isFavorite ? '❤️' : '🤍'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Game Details Section */}
          <View style={styles.gameDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Genre</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {game.category || 'Unknown'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Platform</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {game.platform || 'Unknown'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Release Date</Text>
              <Text style={styles.detailValue}>
                {game.releaseDate || 'Unknown'}
              </Text>
            </View>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity 
            style={[styles.primaryButton, togglingFavorite && styles.buttonDisabled]}
            onPress={toggleFavorite}
            disabled={togglingFavorite}
            accessibilityRole="button"
          >
            {togglingFavorite ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Game Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>
          <Text style={styles.summaryText}>
            {game.summary || 'No summary available for this game.'}
          </Text>
        </View>

        {/* Reviews Section Header */}
        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>User Reviews</Text>
          <View style={styles.reviewsCount}>
            <Text style={styles.reviewsCountText}>{reviews.length}</Text>
          </View>
        </View>

        {/* Reviews Content */}
        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No reviews yet</Text>
            <Text style={styles.emptyStateText}>
              Be the first to share your thoughts about this game
            </Text>
          </View>
        ) : (
          reviews.map((review, index) => (
            <View key={review.$id || index} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor} numberOfLines={1}>
                  {review.userName || 'Anonymous User'}
                </Text>
                <Text style={styles.reviewDate}>
                  {formatDate(review.timestamp)}
                </Text>
              </View>
              <Text style={styles.reviewContent}>
                {review.content}
              </Text>
            </View>
          ))
        )}

        {/* Add New Review Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Leave a Review</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Share your thoughts about this game..."
            placeholderTextColor="#9ca3af"
            multiline
            value={newReview}
            onChangeText={setNewReview}
            maxLength={500}
            textAlignVertical="top"
            accessibilityLabel="Review input field"
            returnKeyType="done"
            blurOnSubmit={true}
          />
          <View style={styles.characterCount}>
            <Text style={styles.characterCountText}>
              {newReview.length}/500 characters
            </Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.primaryButton, 
              (submittingReview || !newReview.trim()) && styles.buttonDisabled
            ]}
            onPress={submitReview}
            disabled={submittingReview || !newReview.trim()}
            accessibilityRole="button"
            accessibilityLabel="Submit review"
          >
            {submittingReview ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Get screen dimensions for responsive design
const screenWidth = Dimensions.get('window').width;

/**
 * StyleSheet for GameDetailScreen component
 * Organized by component sections for maintainability
 */
const styles = StyleSheet.create({
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Header Styles
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
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Content Styles
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Image Styles
  imageContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  gameImage: {
    width: '100%',
    height: Platform.OS === 'web' ? 300 : 200,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    maxWidth: Platform.OS === 'web' ? 500 : '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Card Styles
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
    marginBottom: 16,
  },
  
  // Game Info Styles
  gameInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    marginRight: 16,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  favoriteButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  favoriteButtonText: {
    fontSize: 20,
  },
  gameDetails: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'right',
  },
  
  // Button Styles
  primaryButton: {
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Minimum touch target size
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Text Styles
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    textAlign: 'justify',
  },
  
  // Review Styles
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
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  reviewContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  
  // Input Styles
  textArea: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
    color: '#1f2937',
    minHeight: 120,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  characterCountText: {
    fontSize: 12,
    color: '#6b7280',
  },
  
  // State Styles
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
    textAlign: 'center',
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
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 24,
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
});