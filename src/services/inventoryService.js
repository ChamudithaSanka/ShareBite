import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { formatFoodQuantity, parseFoodQuantity, resolveDonationQuantity } from '../utils/quantity';

const ACTIVE_REQUEST_STATUSES = ['pending', 'approved', 'assigned', 'picked_up', 'in_transit', 'at_recipient'];

const getActiveRequestsForDonation = async (donationId) => {
  const requestsQuery = query(collection(db, 'requests'), where('donationId', '==', donationId));
  const snapshot = await getDocs(requestsQuery);
  return snapshot.docs.filter((request) => ACTIVE_REQUEST_STATUSES.includes(request.data().status));
};

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
  const inventoryRef = doc(db, 'inventory', itemId);
  const initialInventory = await getDoc(inventoryRef);
  if (!initialInventory.exists()) throw new Error('Inventory item not found.');

  const initialData = initialInventory.data();
  const donationId = initialData.donationId;
  const donationRef = donationId ? doc(db, 'donations', donationId) : null;
  const activeRequests = donationId ? await getActiveRequestsForDonation(donationId) : [];

  await runTransaction(db, async (transaction) => {
    const inventorySnapshot = await transaction.get(inventoryRef);
    const donationSnapshot = donationRef ? await transaction.get(donationRef) : null;
    if (!inventorySnapshot.exists()) throw new Error('Inventory item not found.');
    if (donationRef && !donationSnapshot?.exists()) {
      const error = new Error('The donation linked to this inventory item no longer exists.');
      error.code = 'linked-donation-not-found';
      throw error;
    }

    const inventory = inventorySnapshot.data();
    const donation = donationSnapshot?.exists() ? donationSnapshot.data() : null;
    const linked = Boolean(donationRef && donation);
    const nextStatus = updates.status || inventory.status;
    const quantityWasUpdated = Object.prototype.hasOwnProperty.call(updates, 'quantity');
    const parsedQuantity = quantityWasUpdated
      ? parseFoodQuantity(updates.quantity, inventory.quantityUnit)
      : resolveDonationQuantity(inventory);
    const unlinkedNumericQuantity = Number.parseFloat(String(updates.quantity ?? inventory.quantity ?? ''));

    if (!['available', 'out_of_stock'].includes(nextStatus)) {
      const error = new Error('Inventory status is not supported.');
      error.code = 'invalid-inventory-status';
      throw error;
    }
    if (nextStatus === 'available'
      && (linked ? !parsedQuantity : !Number.isFinite(unlinkedNumericQuantity) || unlinkedNumericQuantity <= 0)) {
      const error = new Error('Enter a positive quantity before marking this item in stock.');
      error.code = 'invalid-inventory-quantity';
      throw error;
    }

    if (linked) {
      const reservedQuantityAmount = Number(donation.reservedQuantityAmount) || 0;
      const activeRequestCount = Number(donation.activeRequestCount) || 0;
      if (activeRequests.length || activeRequestCount > 0 || reservedQuantityAmount > 0) {
        const error = new Error('Inventory cannot be changed while recipient requests are active.');
        error.code = 'inventory-has-active-requests';
        throw error;
      }
    }

    const timestamp = serverTimestamp();
    const inventoryUpdates = { ...updates, updatedAt: timestamp };
    if (nextStatus === 'out_of_stock') {
      if (quantityWasUpdated && parsedQuantity) {
        inventoryUpdates.quantity = formatFoodQuantity(parsedQuantity.amount, parsedQuantity.unit);
        inventoryUpdates.quantityAmount = parsedQuantity.amount;
        inventoryUpdates.quantityUnit = parsedQuantity.unit;
        inventoryUpdates.totalQuantityAmount = parsedQuantity.amount;
      } else if (updates.status === 'out_of_stock') {
        inventoryUpdates.quantity = '0';
        inventoryUpdates.quantityAmount = 0;
      }
    } else if (linked && parsedQuantity) {
      inventoryUpdates.quantity = formatFoodQuantity(parsedQuantity.amount, parsedQuantity.unit);
      inventoryUpdates.quantityAmount = parsedQuantity.amount;
      inventoryUpdates.quantityUnit = parsedQuantity.unit;
      inventoryUpdates.totalQuantityAmount = parsedQuantity.amount;
    }
    transaction.update(inventoryRef, inventoryUpdates);

    if (linked) {
      const donationUpdates = { updatedAt: timestamp };
      if (nextStatus === 'out_of_stock') {
        donationUpdates.status = 'out_of_stock';
        if (quantityWasUpdated && parsedQuantity) {
          donationUpdates.quantity = formatFoodQuantity(parsedQuantity.amount, parsedQuantity.unit);
          donationUpdates.quantityAmount = parsedQuantity.amount;
          donationUpdates.totalQuantityAmount = parsedQuantity.amount;
          donationUpdates.quantityUnit = parsedQuantity.unit;
        } else if (updates.status === 'out_of_stock') {
          donationUpdates.quantity = '0';
          donationUpdates.quantityAmount = 0;
          donationUpdates.totalQuantityAmount = Number(donation.totalQuantityAmount) || donation.quantityAmount || 0;
          donationUpdates.quantityUnit = donation.quantityUnit || inventory.quantityUnit || '';
        }
      } else {
        donationUpdates.status = 'available';
        donationUpdates.quantity = formatFoodQuantity(parsedQuantity.amount, parsedQuantity.unit);
        donationUpdates.quantityAmount = parsedQuantity.amount;
        donationUpdates.totalQuantityAmount = parsedQuantity.amount;
        donationUpdates.quantityUnit = parsedQuantity.unit;
      }
      transaction.update(donationRef, donationUpdates);
    }
  });
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
