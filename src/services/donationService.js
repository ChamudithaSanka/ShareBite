import { addDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

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
};

export default donationService;
