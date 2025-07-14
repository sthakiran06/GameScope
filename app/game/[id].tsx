import { account, databases } from '@/lib/appwrite';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ID, Query } from 'react-native-appwrite';

const DATABASE_ID = '6872ea7d003af1fd5568';
const GAMES_COLLECTION_ID = '6872ea8f003d0ad02fee';
const REVIEWS_COLLECTION_ID = '6874f201001a70a3a76d';

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams();
  const [game, setGame] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchGame = async () => {
    try {
      const res = await databases.getDocument(DATABASE_ID, GAMES_COLLECTION_ID, id as string);
      setGame(res);
      console.log('🖼 Game image URL:', res.image);
    } catch (err) {
      console.error('❌ Error fetching game:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        [Query.equal('gameId', id), Query.orderDesc('timestamp')]
      );
      setReviews(res.documents);
    } catch (err) {
      console.error('❌ Error fetching reviews:', err);
    }
  };

  const submitReview = async () => {
    if (!newReview.trim()) return;
    try {
      const user = await account.get();
      const res = await databases.createDocument(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        ID.unique(),
        {
          gameId: id,
          userId: user.$id,
          userName: user.name,
          content: newReview.trim(),
          timestamp: new Date().toISOString(),
        }
      );
      setReviews((prev) => [res, ...prev]);
      setNewReview('');
    } catch (err) {
      console.error('❌ Failed to submit review:', err);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchGame();
    fetchReviews();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Loading game details...</Text>
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Game not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.bannerWrapper}>
          {game.image ? (
            <Image
              source={{ uri: game.image }}
              style={styles.banner}
              resizeMode={Platform.OS === 'web' ? 'contain' : 'cover'}
            />
          ) : (
            <Text style={{ color: 'red', padding: 20 }}>⚠️ No image available</Text>
          )}
        </View>

        <View style={styles.details}>
          <Text style={styles.title}>{game.title}</Text>
          <Text style={styles.info}>🎮 Genre: <Text style={styles.bold}>{game.category}</Text></Text>
          <Text style={styles.info}>🖥️ Platform: <Text style={styles.bold}>{game.platform}</Text></Text>
          <Text style={styles.info}>📅 Release Date: <Text style={styles.bold}>{game.releaseDate}</Text></Text>

          <Text style={styles.sectionTitle}>📝 Summary</Text>
          <Text style={styles.summary}>{game.summary}</Text>

          <Text style={styles.sectionTitle}>💬 User Reviews</Text>
          {reviews.length === 0 ? (
            <Text style={styles.info}>No reviews yet. Be the first to leave one!</Text>
          ) : (
            reviews.map((review, index) => (
              <View key={index} style={styles.reviewBox}>
                <Text style={styles.reviewMeta}>By {review.userName || 'Anonymous'} • {new Date(review.timestamp).toLocaleString()}</Text>
                <Text style={styles.reviewText}>{review.content}</Text>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>✍️ Leave a Review</Text>
          <TextInput
            style={styles.input}
            placeholder="Write your thoughts..."
            multiline
            value={newReview}
            onChangeText={setNewReview}
          />
          <TouchableOpacity style={styles.button} onPress={submitReview}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingBottom: 40,
  },
  bannerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    width: '100%',
  },
  banner: {
    width: '100%',
    height: Platform.OS === 'web' ? 380 : 240,
    borderRadius: 12,
    backgroundColor: '#fff',
    resizeMode: 'cover',
    maxWidth: Platform.OS === 'web' ? 1000 : '100%',
    alignSelf: 'center',
  },
  details: {
    padding: 20,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e90ff',
    marginBottom: 12,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  bold: {
    fontWeight: '600',
    color: '#222',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 6,
    color: '#333',
  },
  summary: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    textAlign: 'justify',
  },
  reviewBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  reviewMeta: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 14,
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#1e90ff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#888',
  },
});