import {
  addDoc,
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
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db } from '../config/firebase';
import { storage } from '../config/firebase';
import { formatFoodQuantity } from '../utils/quantity';

const ACTIVE_REQUEST_STATUSES = ['pending', 'approved', 'assigned', 'picked_up', 'in_transit', 'at_recipient'];

const getActiveRequestsForDonation = async (donationId) => {
  const requestsQuery = query(
    collection(db, 'requests'),
    where('donationId', '==', donationId),
  );
  const snapshot = await getDocs(requestsQuery);
  return snapshot.docs.filter((request) => ACTIVE_REQUEST_STATUSES.includes(request.data().status));
};

const subscribeToAvailableDonations = (onData, onError) => {
  const donationsQuery = query(collection(db, 'donations'), where('status', '==', 'available'));

  return onSnapshot(
    donationsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((donation) => ({ id: donation.id, ...donation.data() })));
    },
    onError,
  );
};

export const subscribeToDonation = (donationId, onData, onError) => {
  if (!donationId) return () => {};

  return onSnapshot(doc(db, 'donations', donationId), (snapshot) => {
    onData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
  }, onError);
};

export const subscribeToDonorDonations = (donorId, onData, onError) => {
  if (!donorId) return () => {};

  const donationsQuery = query(collection(db, 'donations'), where('donorId', '==', donorId));
  return onSnapshot(
    donationsQuery,
    (snapshot) => onData(snapshot.docs.map((donation) => ({ id: donation.id, ...donation.data() }))),
    onError,
  );
};

export const donationService = {
  async getDonationsByDonor(donorId) {
    if (!donorId) return [];

    const q = query(collection(db, 'donations'), where('donorId', '==', donorId));
    const snapshot = await getDocs(q);

    const donations = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    return donations.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return bTime - aTime;
    });
  },

  async getDonationById(donationId) {
    if (!donationId) return null;

    const ref = doc(db, 'donations', donationId);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  },

  async createDonation(donationData) {
    const payload = {
      ...donationData,
      donorId: donationData.donorId,
      totalQuantityAmount: donationData.totalQuantityAmount ?? donationData.quantityAmount ?? null,
      status: donationData.status || 'available',
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'donations'), payload);
    return docRef.id;
  },

  async uploadDonationPhoto(uri, donorId) {
    if (!uri || !donorId) return '';

    const response = await fetch(uri);
    const blob = await response.blob();
    const photoRef = ref(storage, `donations/${donorId}/${Date.now()}.jpg`);
    await uploadBytes(photoRef, blob, { contentType: 'image/jpeg' });
    return getDownloadURL(photoRef);
  },

  async updateDonationStatus(donationId, status) {
    const donationRef = doc(db, 'donations', donationId);
    const activeRequests = await getActiveRequestsForDonation(donationId);
    await runTransaction(db, async (transaction) => {
      const donationSnapshot = await transaction.get(donationRef);
      if (!donationSnapshot.exists()) throw new Error('Donation not found.');
      const donation = donationSnapshot.data();
      if (donation.status === status) return;

      const inventoryRef = donation.inventoryId ? doc(db, 'inventory', donation.inventoryId) : null;
      const inventorySnapshot = inventoryRef ? await transaction.get(inventoryRef) : null;

      if (activeRequests.length
        || (Number(donation.activeRequestCount) || 0) > 0
        || (Number(donation.reservedQuantityAmount) || 0) > 0) {
        const error = new Error('Donation status cannot change while recipient requests are active.');
        error.code = 'donation-has-active-requests';
        throw error;
      }

      transaction.update(donationRef, { status });
      if (inventoryRef && inventorySnapshot?.exists()) {
        transaction.update(inventoryRef, {
          status: status === 'available' ? 'available' : 'out_of_stock',
          updatedAt: serverTimestamp(),
        });
      }
    });
  },

  async updateDonationQuantity(donationId, quantityAmount, quantityUnit) {
    const donationRef = doc(db, 'donations', donationId);
    const activeRequests = await getActiveRequestsForDonation(donationId);
    const quantity = formatFoodQuantity(quantityAmount, quantityUnit);
    if (!quantity) {
      const error = new Error('Enter a supported positive quantity.');
      error.code = 'invalid-donation-quantity';
      throw error;
    }

    await runTransaction(db, async (transaction) => {
      const donationSnapshot = await transaction.get(donationRef);
      if (!donationSnapshot.exists()) throw new Error('Donation not found.');
      const donation = donationSnapshot.data();
      if (activeRequests.length
        || (Number(donation.activeRequestCount) || 0) > 0
        || (Number(donation.reservedQuantityAmount) || 0) > 0) {
        const error = new Error('Quantity cannot change while recipient requests are active.');
        error.code = 'donation-has-active-requests';
        throw error;
      }

      const inventoryRef = donation.inventoryId ? doc(db, 'inventory', donation.inventoryId) : null;
      const inventorySnapshot = inventoryRef ? await transaction.get(inventoryRef) : null;
      const timestamp = serverTimestamp();
      transaction.update(donationRef, {
        quantityAmount,
        totalQuantityAmount: quantityAmount,
        quantityUnit,
        quantity,
        updatedAt: timestamp,
      });
      if (inventoryRef && inventorySnapshot?.exists()) {
        transaction.update(inventoryRef, {
          quantityAmount,
          totalQuantityAmount: quantityAmount,
          quantityUnit,
          quantity,
          status: 'available',
          updatedAt: timestamp,
        });
      }
    });
  },

  async deleteDonation(donationId) {
    const donationRef = doc(db, 'donations', donationId);
    const activeRequests = await getActiveRequestsForDonation(donationId);
    await runTransaction(db, async (transaction) => {
      const donationSnapshot = await transaction.get(donationRef);
      if (!donationSnapshot.exists()) return;

      const donation = donationSnapshot.data();
      if (activeRequests.length
        || (Number(donation.activeRequestCount) || 0) > 0
        || (Number(donation.reservedQuantityAmount) || 0) > 0) {
        const error = new Error('Donation cannot be deleted while recipient requests are active.');
        error.code = 'donation-has-active-requests';
        throw error;
      }

      const inventoryRef = donation.inventoryId ? doc(db, 'inventory', donation.inventoryId) : null;
      const inventorySnapshot = inventoryRef ? await transaction.get(inventoryRef) : null;
      if (inventoryRef && inventorySnapshot?.exists()) transaction.delete(inventoryRef);
      transaction.delete(donationRef);
    });
  },
  subscribeToAvailableDonations,
  subscribeToDonation,
  subscribeToDonorDonations,
};

export { subscribeToAvailableDonations };

export default donationService;
