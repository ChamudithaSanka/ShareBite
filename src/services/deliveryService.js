import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const mapDeliveries = (snapshot) => snapshot.docs.map((delivery) => ({
  id: delivery.id,
  ...delivery.data(),
}));

export const subscribeToAvailableDeliveries = (onData, onError) => {
  const deliveriesQuery = query(collection(db, 'deliveries'), where('status', '==', 'pending'));
  return onSnapshot(deliveriesQuery, (snapshot) => onData(mapDeliveries(snapshot)), onError);
};

export const subscribeToVolunteerDeliveries = (volunteerId, onData, onError) => {
  if (!volunteerId) return () => {};

  const deliveriesQuery = query(collection(db, 'deliveries'), where('volunteerId', '==', volunteerId));
  return onSnapshot(deliveriesQuery, (snapshot) => onData(mapDeliveries(snapshot)), onError);
};

export const subscribeToDonorDeliveries = (donorId, onData, onError) => {
  if (!donorId) return () => {};

  const deliveriesQuery = query(collection(db, 'deliveries'), where('donorId', '==', donorId));
  return onSnapshot(deliveriesQuery, (snapshot) => onData(mapDeliveries(snapshot)), onError);
};

export const getDeliveryById = async (deliveryId) => {
  if (!deliveryId) return null;

  const snapshot = await getDoc(doc(db, 'deliveries', deliveryId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const subscribeToDelivery = (deliveryId, onData, onError) => {
  if (!deliveryId) return () => {};

  return onSnapshot(doc(db, 'deliveries', deliveryId), (snapshot) => {
    onData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
  }, onError);
};

export const acceptDelivery = async (deliveryId, volunteerId) => {
  if (!deliveryId || !volunteerId) throw new Error('Missing delivery or volunteer.');

  await runTransaction(db, async (transaction) => {
    const volunteerRef = doc(db, 'users', volunteerId);
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const volunteerSnapshot = await transaction.get(volunteerRef);
    const deliverySnapshot = await transaction.get(deliveryRef);

    if (volunteerSnapshot.data()?.activeDeliveryId) {
      const error = new Error('Volunteer already has an active delivery.');
      error.code = 'active-delivery';
      throw error;
    }

    if (!deliverySnapshot.exists() || deliverySnapshot.data().status !== 'pending') {
      const error = new Error('Delivery is no longer available.');
      error.code = 'delivery-unavailable';
      throw error;
    }

    const delivery = deliverySnapshot.data();
    const requestRef = delivery.requestId ? doc(db, 'requests', delivery.requestId) : null;
    const requestSnapshot = requestRef ? await transaction.get(requestRef) : null;
    if (requestRef && (!requestSnapshot.exists()
      || (requestSnapshot.data().status !== 'approved' && requestSnapshot.data().coordinatorApproved !== true))) {
      const error = new Error('This request has not been approved for delivery.');
      error.code = 'request-not-approved';
      throw error;
    }

    const volunteerName = volunteerSnapshot.data()?.name || '';
    const timestamp = serverTimestamp();

    transaction.update(deliveryRef, {
      volunteerId,
      volunteerName,
      status: 'assigned',
      assignedAt: timestamp,
      updatedAt: timestamp,
    });
    transaction.set(volunteerRef, { activeDeliveryId: deliveryId }, { merge: true });
    if (requestRef) {
      transaction.update(requestRef, {
        volunteerId,
        volunteerName,
        status: 'assigned',
        updatedAt: timestamp,
      });
    }
  });
};

export const updateDeliveryStatus = async (deliveryId, status) => {
  await runTransaction(db, async (transaction) => {
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const deliverySnapshot = await transaction.get(deliveryRef);
    if (!deliverySnapshot.exists()) {
      const error = new Error('Delivery not found.');
      error.code = 'delivery-not-found';
      throw error;
    }

    const delivery = deliverySnapshot.data();
    const nextStatus = {
      assigned: 'picked_up',
      picked_up: 'in_transit',
      in_transit: 'at_recipient',
      at_recipient: 'delivered',
    }[delivery.status];
    if (nextStatus !== status) {
      const error = new Error('Delivery status cannot move to that step.');
      error.code = 'invalid-status-transition';
      throw error;
    }

    const requestRef = delivery.requestId ? doc(db, 'requests', delivery.requestId) : null;
    const requestSnapshot = requestRef ? await transaction.get(requestRef) : null;
    const volunteerRef = status === 'delivered' && delivery.volunteerId
      ? doc(db, 'users', delivery.volunteerId)
      : null;
    const volunteerSnapshot = volunteerRef ? await transaction.get(volunteerRef) : null;
    const reservedAmount = Number(delivery.reservedQuantityAmount) || 0;
    const donationRef = status === 'delivered' && delivery.donationId && reservedAmount > 0
      ? doc(db, 'donations', delivery.donationId)
      : null;
    const donationSnapshot = donationRef ? await transaction.get(donationRef) : null;
    const inventoryRef = donationSnapshot?.exists() && donationSnapshot.data().inventoryId
      ? doc(db, 'inventory', donationSnapshot.data().inventoryId)
      : null;
    const inventorySnapshot = inventoryRef ? await transaction.get(inventoryRef) : null;
    const timestamp = serverTimestamp();

    transaction.update(deliveryRef, { status, updatedAt: timestamp });
    if (requestRef && requestSnapshot?.exists()) {
      transaction.update(requestRef, { status, updatedAt: timestamp });
    }
    if (volunteerRef && volunteerSnapshot?.exists()) {
      transaction.set(volunteerRef, { activeDeliveryId: null }, { merge: true });
    }
    if (donationRef && donationSnapshot?.exists()) {
      const donation = donationSnapshot.data();
      const reservedQuantityAmount = Math.max(0, (Number(donation.reservedQuantityAmount) || 0) - reservedAmount);
      const availableQuantityAmount = Math.max(0, Number(donation.quantityAmount) || 0);
      transaction.update(donationRef, {
        reservedQuantityAmount,
        activeRequestCount: Math.max(0, (Number(donation.activeRequestCount) || 0) - 1),
        status: availableQuantityAmount > 0
          ? 'available'
          : reservedQuantityAmount > 0 ? 'reserved' : 'fulfilled',
        updatedAt: timestamp,
      });
      if (inventoryRef && inventorySnapshot?.exists()) {
        transaction.update(inventoryRef, {
          reservedQuantityAmount,
          status: availableQuantityAmount > 0 ? 'available' : 'out_of_stock',
          updatedAt: timestamp,
        });
      }
    }
  });
};

export const deliveryService = {
  subscribeToAvailableDeliveries,
  subscribeToVolunteerDeliveries,
  subscribeToDonorDeliveries,
  getDeliveryById,
  subscribeToDelivery,
  acceptDelivery,
  updateDeliveryStatus,
};

export default deliveryService;
