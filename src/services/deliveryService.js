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

export const getDeliveryById = async (deliveryId) => {
  if (!deliveryId) return null;

  const snapshot = await getDoc(doc(db, 'deliveries', deliveryId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
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

    transaction.update(deliveryRef, {
      volunteerId,
      status: 'assigned',
      assignedAt: serverTimestamp(),
    });
    transaction.set(volunteerRef, { activeDeliveryId: deliveryId }, { merge: true });
  });
};

export const updateDeliveryStatus = async (deliveryId, status) => {
  await runTransaction(db, async (transaction) => {
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const deliverySnapshot = await transaction.get(deliveryRef);
    const delivery = deliverySnapshot.data();

    transaction.update(deliveryRef, { status, updatedAt: serverTimestamp() });
    if (status === 'delivered' && delivery?.volunteerId) {
      transaction.set(doc(db, 'users', delivery.volunteerId), { activeDeliveryId: null }, { merge: true });
    }
  });
};

export const deliveryService = {
  subscribeToAvailableDeliveries,
  subscribeToVolunteerDeliveries,
  getDeliveryById,
  acceptDelivery,
  updateDeliveryStatus,
};

export default deliveryService;
