import { account, databases } from '@/lib/appwrite';
import { useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from 'react-native';
import { Query } from 'react-native-appwrite';
import { router } from 'expo-router';

const DATABASE_ID = '6872ea7d003af1fd5568';
const FAVORITES_COLLECTION_ID = '6874fecd0002abec583d';

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 64) / 3;

type Favorite = {
  $id: string;
  gameId: string;
  gameTitle: string;
  gameImage?: string;
};

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      console.error('❌ Failed to fetch favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      await databases.deleteDocument(DATABASE_ID, FAVORITES_COLLECTION_ID, favoriteId);
      setFavorites((prev) => prev.filter((fav) => fav.$id !== favoriteId));
    } catch (err) {
      console.error('❌ Failed to remove favorite:', err);
      Alert.alert('Error', 'Could not remove favorite. Try again.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading favorites...</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>You haven’t favorited any games yet!</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.header}>🎮 Your Favorite Games</Text>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.$id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/game/[id]', params: { id: item.gameId } })}
            style={styles.card}
          >
            <Image
              source={{ uri: item.gameImage || 'https://via.placeholder.com/150' }}
              style={styles.cardImage}
            />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.gameTitle}</Text>
              <TouchableOpacity onPress={() => removeFavorite(item.$id)}>
                <Text style={styles.removeText}>❤️️ Remove</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 20,
    color: '#1e90ff',
  },
  grid: {
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    marginHorizontal: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1.6,
    resizeMode: 'cover',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardBody: {
    padding: 10,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    color: '#222',
  },
  removeText: {
    color: '#e53935',
    fontSize: 12,
    fontWeight: '600',
  },
});