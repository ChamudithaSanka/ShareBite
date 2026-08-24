import {
  collection, doc, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const createFoodRequest = async ({
  donationId,
  recipientId,
  quantity,
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
  const batch = writeBatch(db);
  const requestRef = doc(collection(db, 'requests'));
  const deliveryRef = doc(collection(db, 'deliveries'));

  batch.set(requestRef, {
    donationId,
    recipientId,
    recipientName,
    status: 'pending',
    quantity,
    coordinatorApproved: false,
    deliveryAddress,
    deliveryCoordinates,
    preferredTime,
    notes,
    foodName,
    photoUrl,
    category,
    foodType,
    createdAt: serverTimestamp(),
  });

  batch.set(deliveryRef, {
    requestId: requestRef.id,
    donationId,
    donorId,
    donorName,
    recipientId,
    recipientName,
    status: 'pending',
    foodName,
    photoUrl,
    category,
    foodType,
    quantity,
    pickupLocation,
    pickupCoordinates,
    deliveryAddress,
    deliveryCoordinates,
    distance,
    preferredTime,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
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

export const requestService = {
  createFoodRequest,
  subscribeToRecipientRequests,
};

export default requestService;
