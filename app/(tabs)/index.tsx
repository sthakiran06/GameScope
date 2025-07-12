import { useState } from 'react';
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
    image: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg',
  },
  {
    id: '2',
    title: 'God of War: Ragnarok',
    category: 'Action',
    image: 'https://upload.wikimedia.org/wikipedia/en/b/bb/God_of_War_Ragnar%C3%B6k_cover.jpg',
  },
  {
    id: '3',
    title: 'Call of Duty: MW II',
    category: 'Shooter',
    image: 'https://upload.wikimedia.org/wikipedia/en/4/41/Call_of_Duty_Modern_Warfare_II_cover.jpg',
  },
  {
    id: '4',
    title: 'Zelda: TOTK',
    category: 'Adventure',
    image: 'https://upload.wikimedia.org/wikipedia/en/2/2e/The_Legend_of_Zelda_Tears_of_the_Kingdom_box_art.jpg',
  },
  {
    id: '5',
    title: 'Hades II',
    category: 'RPG',
    image: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Hades_II_boxart.jpg',
  },
  {
    id: '6',
    title: 'Spider-Man 2',
    category: 'Action',
    image: 'https://upload.wikimedia.org/wikipedia/en/2/2e/Spider-Man_2_PS5_cover.png',
  },
  {
    id: '7',
    title: 'Starfield',
    category: 'RPG',
    image: 'https://upload.wikimedia.org/wikipedia/en/6/6c/Starfield_cover.jpg',
  },
  {
    id: '8',
    title: 'Resident Evil 4',
    category: 'Shooter',
    image: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Resident_Evil_4_remake_cover_art.jpg',
  },
  {
    id: '9',
    title: 'Hollow Knight',
    category: 'Adventure',
    image: 'https://upload.wikimedia.org/wikipedia/en/b/bd/Hollow_Knight_cover.jpg',
  },
  {
    id: '10',
    title: 'Cyberpunk 2077',
    category: 'Shooter',
    image: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Cyberpunk_2077_box_art.jpg',
  },
  {
    id: '11',
    title: 'Stray',
    category: 'Adventure',
    image: 'https://upload.wikimedia.org/wikipedia/en/5/5e/Stray_cover_art.jpg',
  },
  {
    id: '12',
    title: 'Sea of Stars',
    category: 'RPG',
    image: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Sea_of_Stars_cover.jpg',
  },
  {
    id: '13',
    title: 'Hi-Fi Rush',
    category: 'Action',
    image: 'https://upload.wikimedia.org/wikipedia/en/4/45/Hi-Fi_Rush_cover_art.jpg',
  },
  {
    id: '14',
    title: 'Alan Wake II',
    category: 'Adventure',
    image: 'https://upload.wikimedia.org/wikipedia/en/e/e3/Alan_Wake_II_cover.jpg',
  },
  {
    id: '15',
    title: 'Ghost of Tsushima',
    category: 'Action',
    image: 'https://upload.wikimedia.org/wikipedia/en/a/a3/Ghost_of_Tsushima.jpg',
  },
];

export default function HomeScreen() {
  console.log('📍 HomeScreen loaded');
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

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.categories}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                selectedCategory === cat && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Game Grid */}
      <FlatList
        data={filteredGames}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          </View>
        )}
      />
    </View>
  );
}

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 64) / 3; // 16 padding on each side + 8 gap * 2

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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e90ff',
  },
  nav: {
    flexDirection: 'row',
    gap: 16,
  },
  navText: {
    fontSize: 14,
    color: '#1e90ff',
    fontWeight: '500',
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardImage: {
    width: '100%',
    height: cardWidth,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '500',
    padding: 8,
    textAlign: 'center',
  },
});