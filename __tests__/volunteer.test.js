import { acceptDelivery, updateDeliveryStatus } from '../src/services/deliveryService';
import * as firestore from 'firebase/firestore';

// Mock Firebase Firestore methods
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({ id: 'mock-collection' })),
  doc: jest.fn((col, id) => ({ id: id || 'mock-id' })),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
  updateDoc: jest.fn(),
}));

jest.mock('../src/config/firebase', () => ({
  db: {},
}));

describe('Volunteer Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- BUSINESS LOGIC & CONCURRENCY TESTS ---
  describe('Volunteer Job Acceptance (acceptDelivery)', () => {
    test('1. Prevents a volunteer from accepting a second job if they already have an active delivery', async () => {
      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn()
            .mockResolvedValueOnce({
              // Volunteer user doc
              data: () => ({ activeDeliveryId: 'existing-delivery-001' }),
            })
            .mockResolvedValueOnce({
              // Delivery doc
              exists: () => true,
              data: () => ({ status: 'pending' }),
            }),
          update: jest.fn(),
          set: jest.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(
        acceptDelivery('delivery-123', 'volunteer-user-1')
      ).rejects.toThrow('Volunteer already has an active delivery.');
    });

    test('2. Rejects volunteer acceptance if the order has not been coordinator-approved', async () => {
      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn()
            .mockResolvedValueOnce({
              // Volunteer doc (free)
              data: () => ({ activeDeliveryId: null }),
            })
            .mockResolvedValueOnce({
              // Delivery doc (pending)
              exists: () => true,
              data: () => ({ status: 'pending', requestId: 'request-1' }),
            })
            .mockResolvedValueOnce({
              // Request doc (unapproved)
              exists: () => true,
              data: () => ({ status: 'pending', coordinatorApproved: false }),
            }),
          update: jest.fn(),
          set: jest.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(
        acceptDelivery('delivery-123', 'volunteer-user-1')
      ).rejects.toThrow('This request has not been approved for delivery.');
    });

    test('3. Successfully assigns delivery to volunteer when prerequisites are met', async () => {
      const mockUpdate = jest.fn();
      const mockSet = jest.fn();

      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn()
            .mockResolvedValueOnce({
              data: () => ({ name: 'Kasun Rider', activeDeliveryId: null }),
            })
            .mockResolvedValueOnce({
              exists: () => true,
              data: () => ({ status: 'pending', requestId: 'req-1' }),
            })
            .mockResolvedValueOnce({
              exists: () => true,
              data: () => ({ status: 'approved', coordinatorApproved: true }),
            }),
          update: mockUpdate,
          set: mockSet,
        };
        return transactionFn(mockTransaction);
      });

      await acceptDelivery('delivery-123', 'volunteer-user-1');

      // Verify delivery status changed to assigned
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          volunteerId: 'volunteer-user-1',
          volunteerName: 'Kasun Rider',
          status: 'assigned',
        })
      );

      // Verify volunteer has activeDeliveryId saved
      expect(mockSet).toHaveBeenCalledWith(
        expect.anything(),
        { activeDeliveryId: 'delivery-123' },
        { merge: true }
      );
    });
  });

  // --- STATE MACHINE TESTS (updateDeliveryStatus) ---
  describe('Delivery State Machine Progression', () => {
    test('4. Allows valid progressive state transition (assigned -> picked_up)', async () => {
      const mockUpdate = jest.fn();

      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ status: 'assigned' }),
          }),
          update: mockUpdate,
          set: jest.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await updateDeliveryStatus('delivery-123', 'picked_up');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 'picked_up' })
      );
    });

    test('5. Rejects illegal status jump (e.g., jumping from assigned directly to delivered)', async () => {
      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ status: 'assigned' }),
          }),
          update: jest.fn(),
          set: jest.fn(),
        };
        return transactionFn(mockTransaction);
      });

      await expect(
        updateDeliveryStatus('delivery-123', 'delivered')
      ).rejects.toThrow('Delivery status cannot move to that step.');
    });
  });
});
