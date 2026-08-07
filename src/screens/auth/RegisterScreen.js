import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const roles = ['Donor', 'Recipient', 'Volunteer', 'Coordinator'];

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('Donor');

  const handleRegister = async () => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role: selectedRole,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput placeholder="Name" value={name}
        onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Email" value={email}
        onChangeText={setEmail} style={styles.input} autoCapitalize="none" />
      <TextInput placeholder="Password" value={password}
        onChangeText={setPassword} style={styles.input} secureTextEntry />
      <Text style={styles.label}>Select Role:</Text>
      {roles.map(role => (
        <Button
          key={role}
          title={selectedRole === role ? `✓ ${role}` : role}
          onPress={() => setSelectedRole(role)}
        />
      ))}
      <View style={{ marginTop: 20 }}>
        <Button title="Register" onPress={handleRegister} />
        <Button title="Back to Login" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 8 },
  label: { fontSize: 16, marginBottom: 10 }
});