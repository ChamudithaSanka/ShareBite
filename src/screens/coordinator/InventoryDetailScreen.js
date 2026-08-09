import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function InventoryDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventory Detail Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
