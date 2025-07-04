import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, Text, View } from 'react-native';
import { account } from '@/lib/appwrite';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    try {
      await account.createEmailPasswordSession(email, password);
      router.replace('/(tabs)'); // go to home
    } catch (err: any) {
      console.error('❌ Login failed:', err.message || err);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Text style={styles.appName}>🎮 GameScope</Text>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        onChangeText={setEmail}
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        onChangeText={setPassword}
        value={password}
        secureTextEntry
        placeholderTextColor="#888"
      />

      <Pressable style={styles.button} onPress={login}>
        <ThemedText style={styles.buttonText}>Login</ThemedText>
      </Pressable>

      <Pressable onPress={() => router.push('/SignUp')}>
        <ThemedText style={styles.link}>Don't have an account? Sign up</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 30,
    backgroundColor: '#f9f9f9',
  },
  appName: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '900',
    color: '#1e90ff',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#edf0f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    color: '#000',
  },
  button: {
    backgroundColor: '#1e90ff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  link: {
    textAlign: 'center',
    fontSize: 14,
    color: '#1e90ff',
    fontWeight: '500',
    marginTop: 10,
  },
});