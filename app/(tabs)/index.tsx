import { databases } from '@/lib/appwrite';
import { Picker } from '@react-native-picker/picker';
import { useEffect, useState, useCallback } from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';

import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

// Database configuration constants
const DATABASE_ID = '6872ea7d003af1fd5568';
const GAMES_COLLECTION_ID = '6872ea8f003d0ad02fee';

// Available game categories for filtering
const categories = ['All', 'Action', 'RPG', 'Shooter', 'Adventure'];

// Screen dimension calculations for responsive design
const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 64) / 3; // 3 columns with padding

/**
 * Game data structure interface
 * Represents a single game entity from the database
 */
type Game = {
  $id: string;        // Unique identifier from Appwrite
  title: string;      // Game title/name
  category: string;   // Game genre (Action, RPG, etc.)
  platform: string;  // Gaming platform (PC, Console, etc.)
  releaseDate: string; // Release date string
  summary: string;    // Game description/summary
  image: string;      // Image URL for game cover
};

/**
 * Error types for better error handling and user feedback
 */
type ErrorType = 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'UNKNOWN_ERROR' | 'NAVIGATION_ERROR';

/**
 * HomeScreen Component
 * Main component that renders the game library interface
 */
export default function HomeScreen() {
  // State management for component data and UI states
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Parses raw document from Appwrite into Game type
   * Provides type safety and data validation
   * 
   * @param doc - Raw document from Appwrite database
   * @returns Parsed Game object
   * @throws Error if required fields are missing
   */
  function parseGame(doc: any): Game {
    try {
      // Validate required fields
      if (!doc.$id || !doc.title || !doc.category) {
        throw new Error(`Invalid game data: missing required fields for game ${doc.$id || 'unknown'}`);
      }

      return {
        $id: doc.$id,
        title: doc.title || 'Unknown Title',
        category: doc.category || 'Unknown',
        platform: doc.platform || 'Unknown Platform',
        releaseDate: doc.releaseDate || 'Unknown Date',
        summary: doc.summary || 'No summary available',
        image: doc.image || '', // Will be handled by Image component error handling
      };
    } catch (parseError) {
      console.error('Error parsing game document:', parseError);
      // Return a safe fallback game object
      return {
        $id: doc.$id || `fallback_${Date.now()}`,
        title: 'Unknown Game',
        category: 'Unknown',
        platform: 'Unknown Platform',
        releaseDate: 'Unknown Date',
        summary: 'Game data could not be loaded properly',
        image: '',
      };
    }
  }

  /**
   * Handles different types of errors with appropriate user feedback
   * 
   * @param error - The error object or message
   * @param errorType - Type of error for categorized handling
   * @param context - Additional context about where the error occurred
   */
  const handleError = useCallback((error: any, errorType: ErrorType, context: string) => {
    console.error(`${errorType} in ${context}:`, error);
    
    let userMessage = 'An unexpected error occurred. Please try again.';
    
    switch (errorType) {
      case 'NETWORK_ERROR':
        userMessage = 'Network connection failed. Please check your internet connection and try again.';
        break;
      case 'DATABASE_ERROR':
        userMessage = 'Failed to load games from the database. Please try refreshing.';
        break;
      case 'NAVIGATION_ERROR':
        userMessage = 'Failed to open game details. Please try again.';
        break;
      case 'UNKNOWN_ERROR':
      default:
        userMessage = 'Something went wrong. Please try again later.';
        break;
    }
    
    setError(userMessage);
    
    // Show alert for critical errors
    if (errorType === 'DATABASE_ERROR' || errorType === 'NETWORK_ERROR') {
      Alert.alert(
        'Error',
        userMessage,
        [
          { text: 'Retry', onPress: () => fetchGames() },
          { text: 'OK', style: 'cancel' }
        ]
      );
    }
  }, []);

  /**
   * Fetches games from the Appwrite database
   * Includes comprehensive error handling and logging
   */
  const fetchGames = async () => {
    try {
      setError(null); // Clear any previous errors
      console.log('Fetching games from database...');
      
      // Attempt to fetch documents from Appwrite
      const res = await databases.listDocuments(DATABASE_ID, GAMES_COLLECTION_ID);
      
      // Validate response structure
      if (!res || !res.documents) {
        throw new Error('Invalid response structure from database');
      }
      
      // Parse and validate each game document
      const parsedGames = res.documents.map((doc, index) => {
        try {
          return parseGame(doc);
        } catch (parseError) {
          console.warn(`Failed to parse game at index ${index}:`, parseError);
          return null; // Will be filtered out
        }
      }).filter(Boolean) as Game[]; // Remove null values
      
      setGames(parsedGames);
      console.log(`Successfully fetched and parsed ${parsedGames.length} games`);
      
      // Log warning if some games failed to parse
      if (parsedGames.length !== res.documents.length) {
        console.warn(`${res.documents.length - parsedGames.length} games failed to parse properly`);
      }
      
    } catch (err: any) {
      // Categorize and handle different error types
      if (err.code === 'ENOTFOUND' || err.message?.includes('network')) {
        handleError(err, 'NETWORK_ERROR', 'fetchGames');
      } else if (err.code?.startsWith('4') || err.message?.includes('database')) {
        handleError(err, 'DATABASE_ERROR', 'fetchGames');
      } else {
        handleError(err, 'UNKNOWN_ERROR', 'fetchGames');
      }
      
      // Set empty array on error to prevent UI crashes
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles pull-to-refresh functionality
   * Provides user feedback during refresh operation
   */
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null); // Clear any previous errors
      await fetchGames();
    } catch (err) {
      handleError(err, 'UNKNOWN_ERROR', 'onRefresh');
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Handles navigation to game details page
   * Includes error handling for navigation failures
   * 
   * @param gameId - The unique identifier of the game to view
   * @param gameTitle - The title of the game (for logging)
   */
  const handleGamePress = useCallback((gameId: string, gameTitle: string) => {
    try {
      if (!gameId) {
        throw new Error('Game ID is required for navigation');
      }
      
      console.log(`Navigating to game details for: ${gameTitle} (ID: ${gameId})`);
      
      router.push({ 
        pathname: '/game/[id]', 
        params: { id: gameId } 
      });
    } catch (navError) {
      handleError(navError, 'NAVIGATION_ERROR', 'handleGamePress');
    }
  }, [handleError]);

  /**
   * Effect hook to fetch games when component mounts
   * Only runs once on component initialization
   */
  useEffect(() => {
    fetchGames();
  }, []); // Empty dependency array ensures this runs only once

  /**
   * Filters games based on search term and selected category
   * Uses memoization through useMemo would be ideal here, but keeping it simple
   * 
   * @returns Array of filtered games matching current search and category criteria
   */
  const filteredGames = games.filter((game) => {
    try {
      // Category filter logic
      const matchesCategory = selectedCategory === 'All' || 
                            (game.category && game.category.toLowerCase() === selectedCategory.toLowerCase());
      
      // Search filter logic (case-insensitive)
      const matchesSearch = !search || 
                           (game.title && game.title.toLowerCase().includes(search.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    } catch (filterError) {
      console.warn('Error filtering game:', game.$id, filterError);
      return false; // Exclude problematic games from results
    }
  });

  /**
   * Renders loading screen with activity indicator
   * Displayed while initial data fetch is in progress
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading games...</Text>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Main component render method
   * Returns the complete UI structure for the home screen
   */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header Section with Logo and Game Count */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.logo}
              onError={(error) => {
                console.warn('Logo failed to load:', error);
              }}
            />
            <Text style={styles.headerTitle}>GameScope</Text>
          </View>
          <View style={styles.gamesCount}>
            <Text style={styles.gamesCountText}>{filteredGames.length}</Text>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      <FlatList
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#667eea"
            colors={['#667eea']}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Search and Filter Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Search & Filter</Text>
              
              {/* Search Input Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Search Games</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Search games..."
                  placeholderTextColor="#9ca3af"
                  value={search}
                  onChangeText={(text) => {
                    try {
                      setSearch(text);
                    } catch (inputError) {
                      console.warn('Error updating search input:', inputError);
                    }
                  }}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
              </View>

              {/* Category Filter Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Filter by Genre</Text>
                <View style={[
                  styles.dropdownWrapper, 
                  Platform.OS === 'ios' ? styles.dropdownIOS : styles.dropdownAndroid
                ]}>
                  <Picker
                    selectedValue={selectedCategory}
                    onValueChange={(itemValue) => {
                      try {
                        if (typeof itemValue === 'string') {
                          setSelectedCategory(itemValue);
                        }
                      } catch (pickerError) {
                        console.warn('Error updating category selection:', pickerError);
                      }
                    }}
                    style={Platform.OS === 'ios' ? styles.pickerIOS : styles.picker}
                    itemStyle={Platform.OS === 'ios' ? styles.pickerItemIOS : undefined}
                  >
                    {categories.map((cat) => (
                      <Picker.Item key={cat} label={cat} value={cat} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            {/* Games Section Header */}
            <View style={styles.gamesHeader}>
              <Text style={styles.sectionTitle}>Games</Text>
              <Text style={styles.sectionSubtitle}>
                {selectedCategory === 'All' ? 'All games' : `${selectedCategory} games`}
              </Text>
            </View>

            {/* Error Message Display */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton} 
                  onPress={() => fetchGames()}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Empty State Display */}
            {filteredGames.length === 0 && !error && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>🎮</Text>
                </View>
                <Text style={styles.emptyStateTitle}>No games found</Text>
                <Text style={styles.emptyStateText}>
                  Try adjusting your search or filter to find games
                </Text>
              </View>
            )}
          </View>
        }
        data={filteredGames}
        keyExtractor={(item) => item.$id}
        numColumns={3}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleGamePress(item.$id, item.title)}
            style={styles.gameCard}
          >
            {/* Game Cover Image */}
            <Image 
              source={{ uri: item.image }} 
              style={styles.gameImage}
              onError={(error) => {
                console.warn(`Failed to load image for game ${item.title}:`, error);
              }}
              defaultSource={require('@/assets/images/logo.png')} // Fallback image
            />
            
            {/* Game Information */}
            <View style={styles.gameInfo}>
              <Text style={styles.gameTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.gameCategory}>{item.category}</Text>
              <Text style={styles.gamePlatform}>{item.platform}</Text>
              <Text style={styles.gameRelease}>{item.releaseDate}</Text>
              <Text style={styles.gameSummary} numberOfLines={2}>
                {item.summary.length > 60 ? `${item.summary.slice(0, 60)}...` : item.summary}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        onEndReachedThreshold={0.1}
        removeClippedSubviews={true} // Performance optimization
        maxToRenderPerBatch={10} // Performance optimization
        windowSize={10} // Performance optimization
      />
    </SafeAreaView>
  );
}

/**
 * StyleSheet for component styling
 * Organized by component section for better maintainability
 */
const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },

  // Header styles
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 12,
    borderRadius: 6,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  gamesCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  gamesCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Content area styles
  content: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Card and form styles
  card: {
    backgroundColor: '#fff',
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
    marginBottom: 16,
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
    color: '#1f2937',
  },

  // Dropdown/Picker styles
  dropdownWrapper: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dropdownIOS: {
    height: 200,
  },
  dropdownAndroid: {
    height: 54,
  },
  picker: {
    height: 54,
    width: '100%',
    color: '#1f2937',
  },
  pickerIOS: {
    width: '100%',
    color: '#1f2937',
  },
  pickerItemIOS: {
    fontSize: 16,
    color: '#1f2937',
  },

  // Section header styles
  gamesHeader: {
    paddingTop: 32,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Error handling styles
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty state styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconText: {
    fontSize: 32,
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
    maxWidth: 280,
  },

  // Game card styles
  gameCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    width: cardWidth,
  },
  gameImage: {
    width: '100%',
    aspectRatio: 1.6,
    resizeMode: 'cover',
    backgroundColor: '#f3f4f6', // Fallback background color
  },
  gameInfo: {
    padding: 12,
  },
  gameTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  gameCategory: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
    marginBottom: 2,
  },
  gamePlatform: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  gameRelease: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  gameSummary: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },
});
