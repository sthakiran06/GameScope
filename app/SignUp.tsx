import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ValidIndicator } from '@/components/ui/ValidIndicator';
import { AuthContext } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ID } from 'react-native-appwrite';

export default function SignUp() {
  // Track user inputs for registration
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Track validation status for email and password
  const [validEmail, setValidEmail] = useState<boolean>(false);
  const [validPassword, setValidPassword] = useState<boolean>(false);

  // Session state to redirect after signup
  const [auth, setAuth] = useState<null | any>(null);

  // Display error message to user
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get Auth context methods
  const user = useContext(AuthContext);

  /**
   * Handle sign up process
   * - Validates input
   * - Creates user account with Appwrite
   * - Signs user in immediately after registration
   * - Provides robust error handling with specific messages
   */
  const register = async () => {
    // Validate name
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    try {
      // Attempt to register the user
      await user.create(ID.unique(), email.trim(), password, name.trim());

      // Immediately create session upon successful registration
      const session = await user.createEmailPasswordSession(email.trim(), password);
      setAuth(session);
      setErrorMessage(null); // Clear any previous error
    } catch (err: any) {
      console.error('Registration Error:', err);

      // Handle different Appwrite error messages
      let message = 'Something went wrong during sign up.';
      const errorText = err?.message?.toLowerCase();

      if (errorText?.includes('already exists')) {
        message = 'This email is already registered. Please log in or use a different email.';
      } else if (errorText?.includes('rate limit')) {
        message = 'Too many attempts. Please wait a few moments and try again.';
      } else if (errorText?.includes('invalid email')) {
        message = 'Please enter a valid email address.';
      } else if (errorText?.includes('password')) {
        message = 'Password must be at least 8 characters.';
      }

      setErrorMessage(message);
    }
  };

  // Automatically navigate to the main app if authenticated
  useEffect(() => {
    if (auth) {
      router.navigate('/(tabs)');
    }
  }, [auth]);

  // Email validation
  useEffect(() => {
    setValidEmail(email.includes('@') && email.includes('.'));
  }, [email]);

  // Password validation
  useEffect(() => {
    setValidPassword(password.length >= 8);
  }, [password]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.appName}>GameScope</Text>
        <Text style={styles.title}>Sign Up</Text>

        {/* Name input */}
        <View style={styles.label}>
          <ThemedText>Name</ThemedText>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          onChangeText={setName}
          value={name}
          placeholderTextColor="#888"
        />

        {/* Email input with live validation */}
        <View style={styles.label}>
          <ThemedText>Email</ThemedText>
          <ValidIndicator valid={validEmail} />
        </View>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          onChangeText={setEmail}
          value={email}
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password input with live validation */}
        <View style={styles.label}>
          <ThemedText>Password</ThemedText>
          <ValidIndicator valid={validPassword} />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Minimum 8 characters"
          secureTextEntry
          onChangeText={setPassword}
          value={password}
          placeholderTextColor="#888"
        />

        {/* Display error message if any */}
        {errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        {/* Sign Up Button (disabled if invalid) */}
        <Pressable
          style={validEmail && validPassword ? styles.button : styles.buttonDisabled}
          disabled={!(validEmail && validPassword)}
          onPress={register}
        >
          <ThemedText
            style={
              validEmail && validPassword
                ? styles.buttonText
                : styles.buttonTextDisabled
            }
          >
            Create Account
          </ThemedText>
        </Pressable>

        {/* Navigate to Login screen */}
        <Pressable onPress={() => router.push('/login')}>
          <ThemedText style={styles.link}>Already have an account? Login</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

// Style definitions
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: '#f9f9f9',
  },
  form: {
    marginHorizontal: 40,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  appName: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '900',
    color: '#1e90ff',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 24,
  },
  label: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#edf0f5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderRadius: 8,
    marginBottom: 20,
    color: '#000',
  },
  button: {
    backgroundColor: '#1e90ff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonTextDisabled: {
    color: '#555',
    fontWeight: '500',
    fontSize: 16,
  },
  link: {
    textAlign: 'center',
    fontSize: 14,
    color: '#1e90ff',
    fontWeight: '500',
    marginTop: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
});