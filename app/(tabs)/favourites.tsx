import { account, databases } from '@/lib/appwrite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Query } from 'react-native-appwrite';

const DATABASE_ID = '6872ea7d003af1fd5568';
const FAVORITES_COLLECTION_ID = '6874fecd0002abec583d';

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 64) / 2; // For 2-column layout

// Define shape of a Favorite document
type Favorite = {
  $id: string;
  gameId: string;
  gameTitle: string;
  gameImage?: string;
};

// For tracking which favorite is being removed
interface LoadingState {
  removingFavorite: string | null;
}

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    removingFavorite: null,
  });

  // Fetch all favorite games for the logged-in user
  const fetchFavorites = async () => {
    try {
      const user = await account.get();
      const res = await databases.listDocuments(
        DATABASE_ID,
        FAVORITES_COLLECTION_ID,
        [Query.equal('userId', user.$id)]
      );
      const parsed = res.documents.map((doc) => ({
        $id: doc.$id,
        gameId: doc.gameId,
        gameTitle: doc.gameTitle,
        gameImage: doc.gameImage,
      }));
      setFavorites(parsed);
    } catch (err: any) {
      console.error('Failed to fetch favorites:', err);
      Alert.alert(
        'Error Loading Favorites',
        err?.message || 'Could not load your favorites at this time. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Remove a favorite game by ID
  const removeFavorite = async (favoriteId: string) => {
    setLoadingState(prev => ({ ...prev, removingFavorite: favoriteId }));
    try {
      await databases.deleteDocument(DATABASE_ID, FAVORITES_COLLECTION_ID, favoriteId);
      setFavorites((prev) => prev.filter((fav) => fav.$id !== favoriteId));
    } catch (err: any) {
      console.error('Failed to remove favorite:', err);
      Alert.alert(
        'Error Removing Favorite',
        err?.message || 'Could not remove this game from favorites. Please try again.'
      );
    } finally {
      setLoadingState(prev => ({ ...prev, removingFavorite: null }));
    }
  };

  // Triggered by pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  // Automatically fetch favorites when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  // Show loading spinner while fetching data initially
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading your favorites...</Text>
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
          <Text style={styles.headerTitle}>My Favorites</Text>
          <View style={styles.favoritesCount}>
            <Text style={styles.favoritesCountText}>{favorites.length}</Text>
          </View>
        </View>
      </View>

      <FlatList
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        data={favorites}
        keyExtractor={(item) => item.$id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>💔</Text>
            </View>
            <Text style={styles.emptyStateTitle}>No favorites yet</Text>
            <Text style={styles.emptyStateText}>
              Start exploring games and add them to your favorites collection
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/game/[id]', params: { id: item.gameId } })}
            style={styles.gameCard}
          >
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: item.gameImage || 'https://via.placeholder.com/150' }}
                style={styles.gameImage}
              />
              <View style={styles.favoriteIndicator}>
                <Text style={styles.heartIcon}>❤️</Text>
              </View>
            </View>

            <View style={styles.gameInfo}>
              <Text style={styles.gameTitle} numberOfLines={2}>
                {item.gameTitle}
              </Text>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFavorite(item.$id)}
                disabled={loadingState.removingFavorite === item.$id}
              >
                {loadingState.removingFavorite === item.$id ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Text style={styles.removeButtonText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
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
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  favoritesCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  favoritesCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
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
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: cardWidth * 0.75,
  },
  gameImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  favoriteIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heartIcon: {
    fontSize: 16,
  },
  gameInfo: {
    padding: 16,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    lineHeight: 20,
  },
  removeButton: {
    backgroundColor: '#fee2e2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  removeButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
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
});

