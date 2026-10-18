import { calculateDistance, coordinatesFromValue } from '../src/utils/index';
import { createFoodRequest } from '../src/services/requestService';
import * as firestore from 'firebase/firestore';

// Mock Firebase Firestore methods
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(() => ({ id: 'mock-collection' })),
  doc: jest.fn((col, id) => ({ id: id || 'mock-id' })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
}));

jest.mock('../src/config/firebase', () => ({
  db: {},
}));

describe('Recipient Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- FRONTEND & GEOSPATIAL LOGIC TESTS ---
  describe('Geospatial & Coordinate Validation', () => {
    test('1. Accurately calculates Haversine distance in km between two GPS locations', () => {
      // Malabe (6.9044, 79.9568) to Colombo Fort (6.9344, 79.8428) is ~13 km
      const pickupCoords = { latitude: 6.9044, longitude: 79.9568 };
      const recipientCoords = { latitude: 6.9344, longitude: 79.8428 };

      const distance = calculateDistance(pickupCoords, recipientCoords);

      expect(distance).toBeDefined();
      expect(distance).toContain('km');
      const numericDistance = parseFloat(distance);
      expect(numericDistance).toBeGreaterThan(10);
      expect(numericDistance).toBeLessThan(16);
    });

    test('2. Correctly parses valid coordinate pairs and rejects malformed values', () => {
      const validObj = coordinatesFromValue({ latitude: '6.9044', longitude: '79.9568' });
      const validString = coordinatesFromValue('6.9044, 79.9568');
      const invalidValue = coordinatesFromValue('invalid-gps-string');

      expect(validObj).toEqual({ latitude: 6.9044, longitude: 79.9568 });
      expect(validString).toEqual({ latitude: 6.9044, longitude: 79.9568 });
      expect(invalidValue).toBeNull();
    });
  });

  // --- BACKEND / SERVICE LOGIC TESTS (requestService) ---
  describe('Backend Request Service Logic (createFoodRequest)', () => {
    test('3. Rejects food request if the selected donation is no longer available', async () => {
      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ status: 'claimed' }), // not available
          }),
          update: jest.fn(),
          set: jest.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(
        createFoodRequest({
          donationId: 'donation-999',
          recipientId: 'recipient-1',
          quantity: '2 meals',
          quantityAmount: 2,
          quantityUnit: 'meal',
          deliveryAddress: '123 Dorm Hall, Malabe',
        })
      ).rejects.toThrow('This donation is no longer available.');
    });

    test('4. Rejects food request if requested quantity exceeds available stock', async () => {
      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              status: 'available',
              quantityAmount: 3,
              quantityUnit: 'meal',
            }),
          }),
          update: jest.fn(),
          set: jest.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(
        createFoodRequest({
          donationId: 'donation-999',
          recipientId: 'recipient-1',
          quantity: '5 meals',
          quantityAmount: 5, // exceeds 3
          quantityUnit: 'meal',
          deliveryAddress: '123 Dorm Hall, Malabe',
        })
      ).rejects.toThrow('The requested amount is no longer available.');
    });

    test('5. Successfully creates request and delivery records when valid', async () => {
      const mockSet = jest.fn();
      const mockUpdate = jest.fn();

      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              status: 'available',
              quantityAmount: 10,
              quantityUnit: 'meal',
              activeRequestCount: 0,
            }),
          }),
          update: mockUpdate,
          set: mockSet,
        };
        return transactionFn(mockTransaction);
      });

      await createFoodRequest({
        donationId: 'donation-999',
        recipientId: 'recipient-1',
        recipientName: 'Tharushi',
        quantity: '2 meals',
        quantityAmount: 2,
        quantityUnit: 'meal',
        deliveryAddress: 'Robert Gunawardena Mawatha, Malabe',
        pickupLocation: 'Main Cafeteria',
      });

      // Verify donation activeRequestCount is incremented
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ activeRequestCount: 1 })
      );

      // Verify request and delivery documents were created
      expect(mockSet).toHaveBeenCalledTimes(2);
    });
  });
});
