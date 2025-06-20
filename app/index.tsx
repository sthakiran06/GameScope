import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';


export default function SignUpScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [validEmail, setValidEmail] = useState<boolean>(false);
const [validPassword, setValidPassword] = useState<boolean>(false);


   useEffect(() => {
    if (email.indexOf('@') > 0) {
      console.log('Valid email');
    
    } else {
      console.log('Invalid email');
    }
  }, [email]);

  useEffect(() => {
  if (password.length >= 8) {
    console.log(' Valid password');
  } else {
    console.log('Password too short');
  }
}, [password]);

  
  const handleSignUp = () => {
    console.log('Sign-Up Pressed!');
    console.log('Email:', email);
    console.log('Password:', password);
    
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.form}>
        <ThemedText style={styles.title}>Sign Up</ThemedText>

        <ThemedText>Email</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#888"
          value={email}
          onChangeText={(val) => setEmail(val) }
          keyboardType="email-address"
        />

        <ThemedText>Password</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Minimum 8 characters"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
        />

        <Pressable style={styles.button} onPress={handleSignUp}>
          <ThemedText style={styles.buttonText}>Sign Up</ThemedText>
        </Pressable>

      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  form: {
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: 'green',
    textAlign: 'center',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff', 
    color: '#000',           
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
    color: 'blue',
    textDecorationLine: 'underline',
  },
});
