import {
  collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateDistance, coordinatesFromValue } from '../utils';
import { resolveDonationQuantity } from '../utils/quantity';

export const createFoodRequest = async ({
  donationId,
  recipientId,
  quantity,
  quantityAmount = null,
  quantityUnit = null,
  deliveryAddress,
  deliveryCoordinates = null,
  preferredTime = '',
  notes = '',
  foodName = 'Food donation',
  photoUrl = '',
  category = '',
  foodType = '',
  donorId = null,
  donorName = '',
  recipientName = '',
  pickupLocation = '',
  pickupCoordinates = null,
  distance = '',
}) => {
  const requestRef = doc(collection(db, 'requests'));
  const deliveryRef = doc(collection(db, 'deliveries'));
  const donationRef = doc(db, 'donations', donationId);
  const calculatedDistance = distance || calculateDistance(
    coordinatesFromValue(pickupCoordinates) || coordinatesFromValue(pickupLocation),
    deliveryCoordinates,
  ) || '';

  await runTransaction(db, async (transaction) => {
    const donationSnapshot = await transaction.get(donationRef);
    if (!donationSnapshot.exists() || donationSnapshot.data().status !== 'available') {
      const error = new Error('This donation is no longer available.');
      error.code = 'donation-unavailable';
      throw error;
    }

    const available = resolveDonationQuantity(donationSnapshot.data());
    if (available) {
      const requested = resolveDonationQuantity({ quantityAmount, quantityUnit });
      if (!requested || requested.unit !== available.unit) {
        const error = new Error('Enter a valid request amount using the donation unit.');
        error.code = 'invalid-request-quantity';
        throw error;
      }
      if (requested.amount > available.amount) {
        const error = new Error('The requested amount is no longer available.');
        error.code = 'insufficient-quantity';
        throw error;
      }
    }

    transaction.update(donationRef, {
      activeRequestCount: (Number(donationSnapshot.data().activeRequestCount) || 0) + 1,
      updatedAt: serverTimestamp(),
    });

    transaction.set(requestRef, {
      donationId,
      deliveryId: deliveryRef.id,
      recipientId,
      recipientName,
      status: 'pending',
      quantity,
      quantityAmount,
      quantityUnit,
      coordinatorApproved: false,
      deliveryAddress,
      deliveryCoordinates,
      distance: calculatedDistance,
      preferredTime,
      notes,
      foodName,
      photoUrl,
      category,
      foodType,
      createdAt: serverTimestamp(),
    });

    transaction.set(deliveryRef, {
      requestId: requestRef.id,
      donationId,
      donorId,
      donorName,
      recipientId,
      recipientName,
      status: 'awaiting_approval',
      foodName,
      photoUrl,
      category,
      foodType,
      quantity,
      quantityAmount,
      quantityUnit,
      pickupLocation,
      pickupCoordinates,
      deliveryAddress,
      deliveryCoordinates,
      distance: calculatedDistance,
      preferredTime,
      createdAt: serverTimestamp(),
    });
  });
  return requestRef.id;
};

export const subscribeToRecipientRequests = (recipientId, onData, onError) => {
  if (!recipientId) return () => {};

  const requestsQuery = query(
    collection(db, 'requests'),
    where('recipientId', '==', recipientId),
  );

  return onSnapshot(
    requestsQuery,
    (snapshot) => onData(snapshot.docs.map((request) => ({ id: request.id, ...request.data() }))),
    onError,
  );
};

export const subscribeToRecipientRequest = (requestId, recipientId, onData, onError) => {
  if (!requestId || !recipientId) return () => {};

  return onSnapshot(
    doc(db, 'requests', requestId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      const request = { id: snapshot.id, ...snapshot.data() };
      onData(request.recipientId === recipientId ? request : null);
    },
    onError,
  );
};

export const requestService = {
  createFoodRequest,
  subscribeToRecipientRequests,
  subscribeToRecipientRequest,
};

export default requestService;
