import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { donationService } from './donationService';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Subscribe to storable donations pending coordinator review.
 * Returns an unsubscribe function.
 */
export const subscribeToPendingDonations = (onData, onError) => {
  const q = query(
    collection(db, 'donations'),
    where('status', '==', 'pending_review'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    },
    onError,
  );
};

/**
 * Accept a storable donation → status becomes 'available'.
 */
export const acceptDonation = (donationId) =>
  donationService.updateDonationStatus(donationId, 'available');

/**
 * Decline a storable donation → status becomes 'declined'.
 */
export const declineDonation = (donationId) =>
  donationService.updateDonationStatus(donationId, 'declined');

/**
 * Get a one-time count of pending_review donations.
 */
export const getPendingDonationCount = async () => {
  const q = query(
    collection(db, 'donations'),
    where('status', '==', 'pending_review'),
  );
  const snap = await getDocs(q);
  return snap.size;
};

/**
 * Get a one-time count of all inventory items with status 'available'.
 */
export const getInventoryCount = async () => {
  const q = query(
    collection(db, 'inventory'),
    where('status', '==', 'available'),
  );
  const snap = await getDocs(q);
  return snap.size;
};

/**
 * Get a one-time count of requests not yet approved by coordinator.
 */
export const getPendingRequestCount = async () => {
  const q = query(
    collection(db, 'requests'),
    where('coordinatorApproved', '==', false),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  return snap.size;
};

/**
 * Subscribe to requests pending coordinator approval.
 */
export const subscribeToPendingRequests = (onData, onError) => {
  const q = query(
    collection(db, 'requests'),
    where('coordinatorApproved', '==', false),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    },
    onError
  );
};

/**
 * Approve a recipient's request.
 */
export const approveRequest = async (requestId) => {
  const ref = doc(db, 'requests', requestId);
  await updateDoc(ref, { coordinatorApproved: true });
};

/**
 * Decline a recipient's request.
 */
export const declineRequest = async (requestId) => {
  const ref = doc(db, 'requests', requestId);
  await updateDoc(ref, { status: 'declined', coordinatorApproved: false });
};

export const coordinatorService = {
  subscribeToPendingDonations,
  acceptDonation,
  declineDonation,
  getPendingDonationCount,
  getInventoryCount,
  getPendingRequestCount,
  subscribeToPendingRequests,
  approveRequest,
  declineRequest,
};

export default coordinatorService;
