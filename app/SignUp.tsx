import { ValidIndicator } from '@/components/ui/ValidIndicator';
import { AuthContext } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { ID } from 'react-native-appwrite';

export default function SignUp() {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [validEmail, setValidEmail] = useState<boolean>(false);
  const [validPassword, setValidPassword] = useState<boolean>(false);
  const [validName, setValidName] = useState<boolean>(false);
  const [auth, setAuth] = useState<null | any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Get AuthContext (Appwrite client functions)
  const user = useContext(AuthContext);

  /**
   * Handle registration logic including:
   * 1. Field validation
   * 2. Session conflict resolution
   * 3. User creation
   * 4. Login after signup
   */
  const register = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
  
    if (!validEmail || !validPassword || !validName) {
      Alert.alert('Error', 'Please ensure all fields are valid');
      return;
    }
  
    setIsLoading(true);
  
    try {
      // Attempt to clear existing session (optional for clean state)
      try {
        await user.get(); // Will throw if no session
        await user.deleteSession('current');
      } catch (checkErr: unknown) {
        // No session is fine – skip
        const msg =
          checkErr && typeof checkErr === 'object' && 'message' in checkErr
            ? (checkErr as { message: string }).message
            : 'No active session to clear';
        console.log('No active session to clear:', msg);
      }
  
      // Create user account
      await user.create(ID.unique(), email, password, name);
  
      // Auto-login after registration
      const session = await user.createEmailPasswordSession(email, password);
      setAuth(session);
    } catch (err: unknown) {
      console.error('Registration failed:', err);
  
      let errorMessage = 'Failed to create account. Please try again later.';
  
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = (err as { message: string }).message;
      }
  
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect after successful signup and login
  useEffect(() => {
    if (auth) {
      router.navigate('/(tabs)');
    }
  }, [auth]);

  // Field-level validations
  useEffect(() => {
    setValidName(name.trim().length >= 2);
  }, [name]);

  useEffect(() => {
    setValidEmail(email.includes('@') && email.includes('.'));
  }, [email]);

  useEffect(() => {
    setValidPassword(password.length >= 8);
  }, [password]);

  // Optional: confirm user context is accessible
  useEffect(() => {
    console.log('AuthContext:', user);
  }, [user]);

  // Optional: pre-check for existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const userData = await user.get();
        console.log('Active session found:', userData);
      } catch (e) {
        console.log('No active session');
      }
    };
    checkSession();
  }, []);

  const isFormValid = validName && validEmail && validPassword;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Logo Image */}
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>GameScope</Text>
          <Text style={styles.welcomeText}>Join our community!</Text>
        </View>
      </View>

      {/* Sign Up Form */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>

          {/* Name Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Full Name</Text>
              <ValidIndicator valid={validName} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              onChangeText={setName}
              value={name}
              placeholderTextColor="#9ca3af"
              editable={!isLoading}
            />
          </View>

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Email Address</Text>
              <ValidIndicator valid={validEmail} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              onChangeText={setEmail}
              value={email}
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Password</Text>
              <ValidIndicator valid={validPassword} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Minimum 8 characters"
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#9ca3af"
              editable={!isLoading}
            />
            <Text style={styles.passwordHint}>
              Password must be at least 8 characters long
            </Text>
          </View>

          {/* Submit Button */}
          <Pressable
            style={[
              styles.primaryButton,
              (!isFormValid || isLoading) && styles.buttonDisabled
            ]}
            disabled={!isFormValid || isLoading}
            onPress={register}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Navigate to Login */}
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push('/login')}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Already have an account? Sign In</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By creating an account, you agree to our terms of service and privacy policy
          </Text>
        </View>
      </ScrollView>
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
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    marginTop: 30,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
  passwordHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    marginLeft: 4,
  },
  primaryButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});