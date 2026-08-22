import {
  addDoc, collection, onSnapshot, query, serverTimestamp, where,
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
}) => {
  const request = await addDoc(collection(db, 'requests'), {
    donationId,
    recipientId,
    status: 'pending',
    quantity,
    coordinatorApproved: false,
    deliveryAddress,
    deliveryCoordinates,
    preferredTime,
    notes,
    createdAt: serverTimestamp(),
  });

  return request.id;
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
