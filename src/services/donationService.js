import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db } from '../config/firebase';
import { storage } from '../config/firebase';

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
    const ref = doc(db, 'donations', donationId);
    await updateDoc(ref, { status });
  },

  async deleteDonation(donationId) {
    const ref = doc(db, 'donations', donationId);
    await deleteDoc(ref);
  },
};

export default donationService;
