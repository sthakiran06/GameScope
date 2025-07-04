import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ValidIndicator } from '@/components/ui/ValidIndicator';
import { AuthContext } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ID } from 'react-native-appwrite';

export default function SignUp(props: any) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [validEmail, setValidEmail] = useState<boolean>(false);
  const [validPassword, setValidPassword] = useState<boolean>(false);
  const [auth, setAuth] = useState<null | any>(null);

  const user = useContext(AuthContext);

  const register = async () => {
    await user.create(ID.unique(), email, password);
    const session = await user.createEmailPasswordSession(email, password);
    setAuth(session);
  };

  useEffect(() => {
    if (auth) {
      router.navigate('/(tabs)');
    }
  }, [auth]);

  useEffect(() => {
    setValidEmail(email.includes('@'));
  }, [email]);

  useEffect(() => {
    setValidPassword(password.length >= 8);
  }, [password]);

  useEffect(() => {
    console.log(user);
  }, [user]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.appName}>🎮 GameScope</Text>
        <Text style={styles.title}>Sign Up</Text>

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

        <View style={styles.label}>
          <ThemedText>Password</ThemedText>
          <ValidIndicator valid={validPassword} />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Minimum 8 characters"
          secureTextEntry={true}
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#888"
        />

        <Pressable
          style={(validEmail && validPassword) ? styles.button : styles.buttonDisabled}
          disabled={!(validEmail && validPassword)}
          onPress={register}
        >
          <ThemedText
            style={(validEmail && validPassword) ? styles.buttonText : styles.buttonTextDisabled}
          >
            Create Account
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

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
});