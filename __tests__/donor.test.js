import { formatFoodQuantity, parseFoodQuantity } from '../src/utils/quantity';
import { donationService } from '../src/services/donationService';
import * as firestore from 'firebase/firestore';

// Mock Firebase Firestore methods
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
}));

jest.mock('../src/config/firebase', () => ({
  db: {},
  storage: {},
}));

describe('Donor Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- FRONTEND / INPUT VALIDATION TESTS ---
  describe('Frontend Input Validation', () => {
    test('1. Validates supported food units and formats quantity correctly', () => {
      const formattedMeal = formatFoodQuantity(5, 'meal');
      const formattedKg = formatFoodQuantity(2.5, 'kg');

      expect(formattedMeal).toBe('5 meals');
      expect(formattedKg).toBe('2.5 kg');
    });

    test('2. Rejects invalid, zero, or negative donation quantities', () => {
      const zeroQty = parseFoodQuantity(0, 'meal');
      const negativeQty = parseFoodQuantity(-5, 'meal');
      const invalidUnit = parseFoodQuantity(10, 'unknown_unit');

      expect(zeroQty).toBeNull();
      expect(negativeQty).toBeNull();
      expect(invalidUnit).toBeNull();
    });
  });

  // --- BACKEND / SERVICE LOGIC TESTS ---
  describe('Backend Service Logic (donationService)', () => {
    test('3. Successfully creates a donation document with server timestamp and payload', async () => {
      firestore.addDoc.mockResolvedValueOnce({ id: 'donation-123' });

      const donationPayload = {
        donorId: 'donor-user-1',
        foodName: 'Surplus Rice & Curry',
        quantityAmount: 10,
        quantityUnit: 'meal',
        status: 'available',
      };

      const donationId = await donationService.createDonation(donationPayload);

      expect(firestore.addDoc).toHaveBeenCalledTimes(1);
      expect(donationId).toBe('donation-123');
      expect(firestore.addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          donorId: 'donor-user-1',
          foodName: 'Surplus Rice & Curry',
          status: 'available',
          createdAt: 'MOCK_TIMESTAMP',
        })
      );
    });

    test('4. Rejects donation status update when active recipient requests are pending', async () => {
      // Mock active requests returned
      firestore.getDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ status: 'pending' }) },
        ],
      });

      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ status: 'available', activeRequestCount: 1 }),
          }),
          update: jest.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(
        donationService.updateDonationStatus('donation-123', 'cancelled')
      ).rejects.toThrow('Donation status cannot change while recipient requests are active.');
    });
  });
});
