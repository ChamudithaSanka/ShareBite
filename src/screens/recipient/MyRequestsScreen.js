import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { subscribeToRecipientRequests } from '../../services/requestService';

const GREEN = '#1A7A4A';

export default function MyRequestsScreen({ navigation }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => subscribeToRecipientRequests(
    user?.uid,
    (recipientRequests) => {
      setRequests(recipientRequests);
      setLoading(false);
    },
    () => {
      setError('Unable to load your requests.');
      setLoading(false);
    },
  ), [user?.uid]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Requests</Text>
      {loading ? <ActivityIndicator color={GREEN} style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && requests.length === 0 ? (
        <Text style={styles.empty}>You have not submitted any requests.</Text>
      ) : null}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('RequestDetail', { request: item })}
          >
            <Text style={styles.cardTitle}>{item.foodName || `Request ${item.id.slice(0, 6)}`}</Text>
            <Text style={styles.cardText}>Quantity: {item.quantity || 'Not specified'}</Text>
            <Text style={styles.cardText}>Delivery: {item.deliveryAddress || 'Not specified'}</Text>
            <Text style={styles.status}>{item.status || 'pending'}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center' },
  loader: { marginTop: 24 },
  error: { marginTop: 24, color: '#E05A2B', textAlign: 'center' },
  empty: { marginTop: 24, color: '#6B7280', textAlign: 'center' },
  list: { width: '100%', paddingTop: 24 },
  card: { padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardText: { marginTop: 6, color: '#6B7280', fontSize: 13 },
  status: { marginTop: 8, color: GREEN, fontWeight: '700', textTransform: 'capitalize' },
});
