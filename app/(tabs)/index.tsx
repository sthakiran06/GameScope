import { databases } from '@/lib/appwrite';
import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';

import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

// Firestore constants
const DATABASE_ID = '6872ea7d003af1fd5568';
const GAMES_COLLECTION_ID = '6872ea8f003d0ad02fee';

// List of game genres for filtering
const categories = ['All', 'Action', 'RPG', 'Shooter', 'Adventure'];

// Dynamically calculate card width based on screen width
const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 64) / 3; // 3-column layout with padding

// Type definition for game object
type Game = {
  $id: string;
  title: string;
  category: string;
  platform: string;
  releaseDate: string;
  summary: string;
  image: string;
};

export default function HomeScreen() {
  // Local state management
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  /**
   * Utility to parse Firestore documents into strongly typed Game objects
   */
  function parseGame(doc: any): Game {
    return {
      $id: doc.$id,
      title: doc.title,
      category: doc.category,
      platform: doc.platform,
      releaseDate: doc.releaseDate,
      summary: doc.summary,
      image: doc.image,
    };
  }

  /**
   * Fetch all game documents from the database
   */
  const fetchGames = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, GAMES_COLLECTION_ID);
      setGames(res.documents.map(parseGame));
      console.log(' Games fetched:', res.documents);
    } catch (err: any) {
      console.error(' Error fetching games:', err);
      Alert.alert(
        'Failed to Load Games',
        'We were unable to fetch games from the server. Please check your internet connection or try again later.'
      );
    }
  };

  // Fetch games when screen mounts
  useEffect(() => {
    fetchGames();
  }, []);

  /**
   * Filter logic based on user-selected category and search input
   */
  const filteredGames = games.filter((game) => {
    const matchesCategory = selectedCategory === 'All' || game.category === selectedCategory;
    const matchesSearch = game.title.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>GameScope</Text>
      </View>

      {/* Search bar for filtering by game title */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search games..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
      />

      {/* Category dropdown for filtering by genre */}
      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownLabel}>Filter by Genre:</Text>
        <View style={styles.dropdownWrapper}>
          <Picker
            selectedValue={selectedCategory}
            onValueChange={(itemValue) => setSelectedCategory(itemValue)}
            style={styles.picker}
          >
            {categories.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Grid of games */}
      <FlatList
        data={filteredGames}
        keyExtractor={(item) => item.$id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try {
                router.push({ pathname: '/game/[id]', params: { id: item.$id } });
              } catch (err: any) {
                console.error('Navigation error:', err);
                Alert.alert('Navigation Error', 'Unable to open game details. Please try again.');
              }
            }}
            style={styles.card}
          >
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardInfo}>Genre: {item.category}</Text>
              <Text style={styles.cardInfo}>Platform: {item.platform}</Text>
              <Text style={styles.cardInfo}>Release: {item.releaseDate}</Text>
              <Text style={styles.cardSummary}>{item.summary.slice(0, 80)}...</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    paddingTop: 50,
    paddingBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e90ff',
  },
  searchBar: {
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginVertical: 8,
  },
  grid: {
    paddingBottom: 100,
    gap: 16,
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
    padding: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardInfo: {
    fontSize: 12,
    color: '#666',
  },
  cardRating: {
    fontSize: 12,
    color: '#ff9800',
    marginTop: 4,
  },
  cardSummary: {
    fontSize: 12,
    color: '#333',
    marginTop: 6,
  },
  dropdownContainer: {
    marginBottom: 12,
  },
  dropdownLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  dropdownWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 44,
    width: '100%',
  },
});
