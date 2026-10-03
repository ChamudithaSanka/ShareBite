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
import { formatFoodQuantity, resolveDonationQuantity } from '../utils/quantity';

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

const findInventoryRef = async (donationId, donation) => {
  if (donation.inventoryId) return doc(db, 'inventory', donation.inventoryId);

  const inventoryQuery = query(
    collection(db, 'inventory'),
    where('donationId', '==', donationId),
  );
  const snapshot = await getDocs(inventoryQuery);
  return snapshot.docs[0]
    ? doc(db, 'inventory', snapshot.docs[0].id)
    : doc(collection(db, 'inventory'));
};

export const acceptDonation = async (donationId) => {
  const donationRef = doc(db, 'donations', donationId);
  const initialSnapshot = await getDoc(donationRef);
  if (!initialSnapshot.exists()) {
    const error = new Error('Donation not found.');
    error.code = 'donation-not-found';
    throw error;
  }

  const inventoryRef = await findInventoryRef(donationId, initialSnapshot.data());
  await runTransaction(db, async (transaction) => {
    const donationSnapshot = await transaction.get(donationRef);
    const inventorySnapshot = await transaction.get(inventoryRef);
    if (!donationSnapshot.exists() || donationSnapshot.data().status !== 'pending_review') {
      const error = new Error('Donation is no longer awaiting review.');
      error.code = 'donation-review-unavailable';
      throw error;
    }

    const donation = donationSnapshot.data();
    const quantity = resolveDonationQuantity(donation);
    if (!quantity) {
      const error = new Error('Update this donation to a supported amount and unit before accepting it.');
      error.code = 'quantity-unstructured';
      throw error;
    }

    const timestamp = serverTimestamp();
    transaction.set(inventoryRef, {
      donationId,
      donorId: donation.donorId || null,
      foodName: donation.foodName || 'Food donation',
      category: donation.category || '',
      condition: donation.condition || '',
      foodType: donation.foodType || '',
      quantity: formatFoodQuantity(quantity.amount, quantity.unit),
      quantityAmount: quantity.amount,
      quantityUnit: quantity.unit,
      totalQuantityAmount: Number(donation.totalQuantityAmount) || quantity.amount,
      reservedQuantityAmount: Number(donation.reservedQuantityAmount) || 0,
      expiry: donation.expiry || '',
      location: donation.pickupLocation || '',
      photoUrl: donation.photoUrl || '',
      status: 'available',
      storedAt: inventorySnapshot.exists() ? inventorySnapshot.data().storedAt || timestamp : timestamp,
      updatedAt: timestamp,
    }, { merge: true });
    transaction.update(donationRef, {
      status: 'available',
      inventoryId: inventoryRef.id,
      acceptedAt: timestamp,
      updatedAt: timestamp,
    });
  });
};

export const declineDonation = async (donationId) => {
  const donationRef = doc(db, 'donations', donationId);
  await runTransaction(db, async (transaction) => {
    const donationSnapshot = await transaction.get(donationRef);
    if (!donationSnapshot.exists() || donationSnapshot.data().status !== 'pending_review') {
      const error = new Error('Donation is no longer awaiting review.');
      error.code = 'donation-review-unavailable';
      throw error;
    }

    transaction.update(donationRef, { status: 'declined', updatedAt: serverTimestamp() });
  });
};

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

const findDeliveryRef = async (requestId, requestData) => {
  if (requestData.deliveryId) return doc(db, 'deliveries', requestData.deliveryId);

  const deliveriesQuery = query(collection(db, 'deliveries'), where('requestId', '==', requestId));
  const snapshot = await getDocs(deliveriesQuery);
  return snapshot.docs[0] ? doc(db, 'deliveries', snapshot.docs[0].id) : null;
};

export const approveRequest = async (requestId) => {
  const requestRef = doc(db, 'requests', requestId);
  const initialRequest = await getDoc(requestRef);
  if (!initialRequest.exists()) {
    const error = new Error('Request not found.');
    error.code = 'request-not-found';
    throw error;
  }

  const initialData = initialRequest.data();
  const deliveryRef = await findDeliveryRef(requestId, initialData);
  if (!deliveryRef) {
    const error = new Error('Delivery record not found.');
    error.code = 'delivery-not-found';
    throw error;
  }
  if (!initialData.donationId) {
    const error = new Error('Donation record not found.');
    error.code = 'donation-not-found';
    throw error;
  }

  const donationRef = doc(db, 'donations', initialData.donationId);

  await runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    const donationSnapshot = await transaction.get(donationRef);
    const deliverySnapshot = await transaction.get(deliveryRef);

    if (!requestSnapshot.exists() || requestSnapshot.data().status !== 'pending' || requestSnapshot.data().coordinatorApproved) {
      const error = new Error('Request is no longer awaiting approval.');
      error.code = 'request-unavailable';
      throw error;
    }
    if (!donationSnapshot.exists() || donationSnapshot.data().status !== 'available') {
      const error = new Error('Donation is no longer available.');
      error.code = 'donation-unavailable';
      throw error;
    }
    if (!deliverySnapshot.exists() || !['awaiting_approval', 'pending'].includes(deliverySnapshot.data().status)) {
      const error = new Error('Delivery is no longer awaiting approval.');
      error.code = 'delivery-unavailable';
      throw error;
    }

    const request = requestSnapshot.data();
    const donation = donationSnapshot.data();
    const inventoryRef = donation.inventoryId ? doc(db, 'inventory', donation.inventoryId) : null;
    const inventorySnapshot = inventoryRef ? await transaction.get(inventoryRef) : null;
    const available = resolveDonationQuantity(donation);
    if (!available) {
      const error = new Error('Update this donation to a supported amount and unit before approving.');
      error.code = 'quantity-unstructured';
      throw error;
    }

    const requested = resolveDonationQuantity(request);
    if (!requested) {
      const error = new Error('The requested amount is not a supported amount and unit.');
      error.code = 'request-quantity-unstructured';
      throw error;
    }
    if (requested.unit !== available.unit) {
      const error = new Error('The request unit does not match the donation unit.');
      error.code = 'quantity-unit-mismatch';
      throw error;
    }
    if (requested.amount > available.amount) {
      const error = new Error(`Only ${formatFoodQuantity(available.amount, available.unit)} remain.`);
      error.code = 'insufficient-quantity';
      throw error;
    }

    const remaining = available.amount - requested.amount;
    const previouslyReserved = Number(donation.reservedQuantityAmount) || 0;
    const storedTotal = Number(donation.totalQuantityAmount);
    const totalQuantityAmount = Number.isFinite(storedTotal) && storedTotal > 0
      ? storedTotal
      : available.amount + previouslyReserved;
    const timestamp = serverTimestamp();

    transaction.update(donationRef, {
      quantityAmount: remaining,
      totalQuantityAmount,
      quantityUnit: available.unit,
      quantity: remaining > 0 ? formatFoodQuantity(remaining, available.unit) : '0',
      reservedQuantityAmount: previouslyReserved + requested.amount,
      status: remaining > 0 ? 'available' : 'reserved',
      updatedAt: timestamp,
    });
    transaction.update(requestRef, {
      status: 'approved',
      coordinatorApproved: true,
      deliveryId: deliveryRef.id,
      quantity: formatFoodQuantity(requested.amount, requested.unit),
      quantityAmount: requested.amount,
      quantityUnit: requested.unit,
      approvedAt: timestamp,
      updatedAt: timestamp,
    });
    transaction.update(deliveryRef, {
      status: 'pending',
      coordinatorApproved: true,
      reservedQuantityAmount: requested.amount,
      quantity: formatFoodQuantity(requested.amount, requested.unit),
      quantityAmount: requested.amount,
      quantityUnit: requested.unit,
      approvedAt: timestamp,
      updatedAt: timestamp,
    });
    if (inventoryRef && inventorySnapshot?.exists()) {
      transaction.update(inventoryRef, {
        quantity: remaining > 0 ? formatFoodQuantity(remaining, available.unit) : '0',
        quantityAmount: remaining,
        quantityUnit: available.unit,
        reservedQuantityAmount: previouslyReserved + requested.amount,
        status: remaining > 0 ? 'available' : 'out_of_stock',
        updatedAt: timestamp,
      });
    }
  });
};

export const declineRequest = async (requestId) => {
  const requestRef = doc(db, 'requests', requestId);
  const initialRequest = await getDoc(requestRef);
  if (!initialRequest.exists()) {
    const error = new Error('Request not found.');
    error.code = 'request-not-found';
    throw error;
  }

  const deliveryRef = await findDeliveryRef(requestId, initialRequest.data());
  const donationRef = initialRequest.data().donationId
    ? doc(db, 'donations', initialRequest.data().donationId)
    : null;
  await runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    const deliverySnapshot = deliveryRef ? await transaction.get(deliveryRef) : null;
    const donationSnapshot = donationRef ? await transaction.get(donationRef) : null;
    if (!requestSnapshot.exists() || requestSnapshot.data().status !== 'pending') {
      const error = new Error('Request is no longer awaiting approval.');
      error.code = 'request-unavailable';
      throw error;
    }

    const timestamp = serverTimestamp();
    transaction.update(requestRef, {
      status: 'declined',
      coordinatorApproved: false,
      updatedAt: timestamp,
    });
    if (deliverySnapshot?.exists()) {
      transaction.update(deliveryRef, { status: 'declined', updatedAt: timestamp });
    }
    if (donationRef && donationSnapshot?.exists()) {
      const activeRequestCount = Number(donationSnapshot.data().activeRequestCount) || 0;
      if (activeRequestCount > 0) {
        transaction.update(donationRef, { activeRequestCount: activeRequestCount - 1, updatedAt: timestamp });
      }
    }
  });
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
