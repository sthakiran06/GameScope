import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { account } from '@/lib/appwrite';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

export default function LoginScreen() {
  // State variables for user input
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Function to handle login
  const login = async () => {
    try {
      if (!email.trim() || !password.trim()) {
        alert('Please enter both email and password.');
        return;
      }

      console.log('Attempting login with:', email);

      // Attempt to delete any existing session to avoid session conflict
      try {
        await account.deleteSession('current');
        console.log('Previous session cleared.');
      } catch (e) {
        // Not an error if there is no active session
        console.log('No existing session to delete.');
      }

      // Create a new session using email/password
      const session = await account.createEmailPasswordSession(email, password);
      console.log('Login successful:', session);

      // Navigate to the main tab layout on success
      router.replace('/(tabs)');
    } catch (err: any) {
      // Handle and display any login errors gracefully
      console.error('Login failed:', err);
      const message = err?.message || 'An unexpected login error occurred.';
      alert(message);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Text style={styles.appName}>GameScope</Text>
      <Text style={styles.title}>Login</Text>

      {/* Email input field */}
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        onChangeText={setEmail}
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#888"
      />

      {/* Password input field */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        onChangeText={setPassword}
        value={password}
        secureTextEntry
        placeholderTextColor="#888"
      />

      {/* Login button */}
      <Pressable style={styles.button} onPress={login}>
        <ThemedText style={styles.buttonText}>Login</ThemedText>
      </Pressable>

      {/* Navigate to sign-up screen */}
      <Pressable onPress={() => router.push('/SignUp')}>
        <ThemedText style={styles.link}>Don't have an account? Sign up</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

// Style definitions
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