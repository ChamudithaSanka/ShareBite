import { updateInventoryItem } from '../src/services/inventoryService';
import { sumMealPortionQuantities } from '../src/utils/quantity';
import * as firestore from 'firebase/firestore';

// Mock Firebase Firestore methods
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({ id: 'mock-collection' })),
  doc: jest.fn((col, id) => ({ id: id || 'mock-id' })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
}));

jest.mock('../src/config/firebase', () => ({
  db: {},
}));

describe('Coordinator Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- FRONTEND METRICS & AGGREGATION TESTS ---
  describe('Coordinator Dashboard Metrics', () => {
    test('1. Accurately calculates total meals & portions across active community donations', () => {
      const mockDonations = [
        { quantityAmount: 15, quantityUnit: 'meal', totalQuantityAmount: 15 },
        { quantityAmount: 20, quantityUnit: 'portion', totalQuantityAmount: 20 },
        { quantityAmount: 5, quantityUnit: 'kg', totalQuantityAmount: 5 }, // should be ignored in meal sum
      ];

      const totalMeals = sumMealPortionQuantities(mockDonations);

      expect(totalMeals).toBe(35); // 15 meals + 20 portions
    });
  });

  // --- BACKEND / INVENTORY & APPROVAL SERVICE TESTS ---
  describe('Inventory & Review Service Logic (updateInventoryItem)', () => {
    test('2. Rejects inventory status update if the status is not supported by the platform', async () => {
      // Mock initial getDoc
      firestore.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'available', quantityUnit: 'meal' }),
      });

      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ status: 'available', quantityUnit: 'meal' }),
          }),
          update: jest.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(
        updateInventoryItem('inv-001', { status: 'invalid_status_type' })
      ).rejects.toThrow('Inventory status is not supported.');
    });

    test('3. Rejects marking an inventory item as available if quantity is zero or negative', async () => {
      firestore.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'out_of_stock', quantityUnit: 'meal' }),
      });

      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ status: 'out_of_stock', quantityUnit: 'meal' }),
          }),
          update: jest.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(
        updateInventoryItem('inv-001', { status: 'available', quantity: 0 })
      ).rejects.toThrow('Enter a positive quantity before marking this item in stock.');
    });

    test('4. Successfully marks inventory item as out_of_stock when supplies are depleted', async () => {
      const mockUpdate = jest.fn();

      firestore.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'available', quantityUnit: 'meal', quantityAmount: 10 }),
      });

      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ status: 'available', quantityUnit: 'meal', quantityAmount: 10 }),
          }),
          update: mockUpdate,
        };
        return transactionFn(mockTransaction);
      });

      await updateInventoryItem('inv-001', { status: 'out_of_stock' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'out_of_stock',
        })
      );
    });
  });
});
