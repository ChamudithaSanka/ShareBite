import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Real-time subscription to all inventory items.
 * Returns an unsubscribe function.
 */
export const subscribeToInventory = (onData, onError) => {
  const q = query(collection(db, 'inventory'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort: available first, then by expiry ascending
      items.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'available' ? -1 : 1;
        const aExpiry = a.expiry ? new Date(a.expiry).getTime() : Infinity;
        const bExpiry = b.expiry ? new Date(b.expiry).getTime() : Infinity;
        return aExpiry - bExpiry;
      });
      onData(items);
    },
    onError,
  );
};

/**
 * Get inventory items by status (one-time fetch).
 */
export const getInventoryByStatus = async (status = 'available') => {
  const q = query(collection(db, 'inventory'), where('status', '==', status));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Update quantity and/or status of an inventory item.
 */
export const updateInventoryItem = async (itemId, updates) => {
  const ref = doc(db, 'inventory', itemId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
};

/**
 * Mark an inventory item as out of stock.
 */
export const markOutOfStock = (itemId) =>
  updateInventoryItem(itemId, { status: 'out_of_stock', quantity: '0' });

/**
 * Restock an inventory item back to available.
 */
export const markAvailable = (itemId, quantity) =>
  updateInventoryItem(itemId, { status: 'available', quantity });

export const inventoryService = {
  subscribeToInventory,
  getInventoryByStatus,
  updateInventoryItem,
  markOutOfStock,
  markAvailable,
};

export default inventoryService;
