import { ValidIndicator } from '@/components/ui/ValidIndicator';
import { AuthContext } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
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

export default function SignUp(props: any) {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [validEmail, setValidEmail] = useState<boolean>(false);
  const [validPassword, setValidPassword] = useState<boolean>(false);
  const [validName, setValidName] = useState<boolean>(false);
  const [auth, setAuth] = useState<null | any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const user = useContext(AuthContext);

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
      //  Check if a session is already active
      try {
        await user.get(); // throws if no session
        console.log(" Session already exists, deleting...");
        await user.deleteSession('current');
      } catch (checkErr) {
        // No active session, safe to proceed
      }
  
      // Proceed with registration
      await user.create(ID.unique(), email, password, name);
  
      //  Create session after successful registration
      const session = await user.createEmailPasswordSession(email, password);
      setAuth(session);
    } catch (err: any) {
      console.error(' Registration failed:', err);
      Alert.alert('Registration Error', err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (auth) {
      router.navigate('/(tabs)');
    }
  }, [auth]);

  useEffect(() => {
    setValidName(name.trim().length >= 2);
  }, [name]);

  useEffect(() => {
    setValidEmail(email.includes('@') && email.includes('.'));
  }, [email]);

  useEffect(() => {
    setValidPassword(password.length >= 8);
  }, [password]);

  useEffect(() => {
    console.log(user);
  }, [user]);


  useEffect(() => {
    const checkSession = async () => {
      try {
        const userData = await user.get();
        console.log(" Active session:", userData);
      } catch (e) {
        console.log("ℹ No active session");
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
          <Text style={styles.appName}>🎮 GameScope</Text>
          <Text style={styles.welcomeText}>Join our community!</Text>
        </View>
      </View>

      {/* SignUp Form */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>
          
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

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

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
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
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

