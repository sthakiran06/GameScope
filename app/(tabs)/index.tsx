import { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import {
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const categories = ['All', 'Action', 'RPG', 'Shooter', 'Adventure'];

const games = [
  {
    id: '1',
    title: 'Elden Ring',
    category: 'RPG',
    platform: 'PC, PS5, Xbox',
    releaseDate: '2022-02-25',
    summary: 'An open-world action RPG set in a dark fantasy realm.',
    rating: 4.8,
    image: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg',
  },
  {
    id: '2',
    title: 'God of War: Ragnarok',
    category: 'Action',
    platform: 'PS5',
    releaseDate: '2022-11-09',
    summary: 'Kratos and Atreus journey through Norse myth in a stunning sequel.',
    rating: 4.9,
    image: 'https://upload.wikimedia.org/wikipedia/en/b/bb/God_of_War_Ragnar%C3%B6k_cover.jpg',
  },
  {
    id: '3',
    title: 'Call of Duty: MW II',
    category: 'Shooter',
    platform: 'PC, PS5, Xbox',
    releaseDate: '2022-10-28',
    summary: 'Fast-paced multiplayer and cinematic single-player shooter.',
    rating: 4.3,
    image: 'https://upload.wikimedia.org/wikipedia/en/4/41/Call_of_Duty_Modern_Warfare_II_cover.jpg',
  },
  {
    id: '4',
    title: 'Zelda: TOTK',
    category: 'Adventure',
    platform: 'Switch',
    releaseDate: '2023-05-12',
    summary: 'Explore vast lands and uncover the secrets of Hyrule.',
    rating: 4.7,
    image: 'https://upload.wikimedia.org/wikipedia/en/2/2e/The_Legend_of_Zelda_Tears_of_the_Kingdom_box_art.jpg',
  },
  {
    id: '5',
    title: 'Spider-Man 2',
    category: 'Action',
    platform: 'PS5',
    releaseDate: '2023-10-20',
    summary: 'Swing through NYC as Peter and Miles in this superhero adventure.',
    rating: 4.6,
    image: 'https://upload.wikimedia.org/wikipedia/en/2/2e/Spider-Man_2_PS5_cover.png',
  },
];

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 64) / 3;

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredGames = games.filter((game) => {
    const matchesCategory = selectedCategory === 'All' || game.category === selectedCategory;
    const matchesSearch = game.title.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🎮 GameScope</Text>
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search games..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
      />

      {/* Category Dropdown */}
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

      {/* Game Grid */}
      <FlatList
        data={filteredGames}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardInfo}>Genre: {item.category}</Text>
              <Text style={styles.cardInfo}>Platform: {item.platform}</Text>
              <Text style={styles.cardInfo}>Release: {item.releaseDate}</Text>
              <Text style={styles.cardRating}>Rating: {renderStars(item.rating)} ({item.rating})</Text>
              <Text style={styles.cardSummary}>{item.summary.slice(0, 80)}...</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function renderStars(rating: number) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  return (
    '★'.repeat(fullStars) +
    (halfStar ? '½' : '') +
    '☆'.repeat(emptyStars)
  );
}

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
  categories: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 20,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#1e90ff',
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
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
    height: cardWidth,
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