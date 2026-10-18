// Import the delivery-acceptance function and the delivery-status function being tested.
import { acceptDelivery, updateDeliveryStatus } from '../src/services/deliveryService';
// Import Firestore so the tests can configure the mocked transaction function.
import * as firestore from 'firebase/firestore';

// Replace Firestore with simple mock functions so these tests never access the real database.
jest.mock('firebase/firestore', () => ({
  // Return a placeholder collection reference.
  collection: jest.fn(() => ({ id: 'mock-collection' })),
  // Return a placeholder document reference, preserving the requested document ID.
  doc: jest.fn((col, id) => ({ id: id || 'mock-id' })),
  // Mock reading one document.
  getDoc: jest.fn(),
  // Mock listening for database changes.
  onSnapshot: jest.fn(),
  // Mock building a Firestore query.
  query: jest.fn(),
  // Mock adding a condition to a query.
  where: jest.fn(),
  // Mock running a Firestore transaction; individual tests provide its behavior.
  runTransaction: jest.fn(),
  // Return a predictable timestamp value for tests.
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
  // Mock updating a document outside a transaction.
  updateDoc: jest.fn(),
}));

// Give the delivery service a fake database object instead of a real Firebase connection.
jest.mock('../src/config/firebase', () => ({
  db: {},
}));

// Group the tests for the volunteer delivery workflow.
describe('Volunteer Module Tests', () => {
  // Run this before every test so recorded calls and one-time mock behaviors do not leak between tests.
  beforeEach(() => {
    // Reset call history and mock state.
    jest.clearAllMocks();
  });

  // --- BUSINESS LOGIC & CONCURRENCY TESTS ---
  // These tests check whether a volunteer is allowed to accept a delivery.
  describe('Volunteer Job Acceptance (acceptDelivery)', () => {
    // Test 1: Do not let a volunteer take another delivery while one is already active.
    test('1. Prevents a volunteer from accepting a second job if they already have an active delivery', async () => {
      // Configure the next transaction mock to run the service's transaction callback.
      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        // Create mock transaction methods that the service calls.
        const mockTransaction = {
          // Return mocked documents in the same order the service reads them.
          get: jest.fn()
            .mockResolvedValueOnce({
              // First read: volunteer record says a delivery is already active.
              data: () => ({ activeDeliveryId: 'existing-delivery-001' }),
            })
            .mockResolvedValueOnce({
              // Second read: the requested delivery exists and is waiting for a volunteer.
              exists: () => true,
              data: () => ({ status: 'pending' }),
            }),
          // Track attempted document updates.
          update: jest.fn(),
          // Track attempted document writes.
          set: jest.fn(),
        };
        // Execute the real service logic using our fake transaction.
        return transactionFn(mockTransaction);
      });

      // Try accepting the delivery and check that the service rejects it with the expected reason.
      await expect(
        acceptDelivery('delivery-123', 'volunteer-user-1')
      ).rejects.toThrow('Volunteer already has an active delivery.');
    });

    // Test 2: A free volunteer still cannot take a delivery whose request is not approved.
    test('2. Rejects volunteer acceptance if the order has not been coordinator-approved', async () => {
      // Configure one fake transaction for this test.
      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          // The service reads the volunteer, delivery, and linked request in this order.
          get: jest.fn()
            .mockResolvedValueOnce({
              // First read: the volunteer has no active delivery.
              data: () => ({ activeDeliveryId: null }),
            })
            .mockResolvedValueOnce({
              // Second read: this delivery is pending and links to request-1.
              exists: () => true,
              data: () => ({ status: 'pending', requestId: 'request-1' }),
            })
            .mockResolvedValueOnce({
              // Third read: request-1 is pending and has not been coordinator-approved.
              exists: () => true,
              data: () => ({ status: 'pending', coordinatorApproved: false }),
            }),
          // These mocks let the service attempt writes without changing a real database.
          update: jest.fn(),
          set: jest.fn(),
        };
        // Pass the fake transaction into the real service callback.
        return transactionFn(mockTransaction);
      });

      // Attempt acceptance and confirm that the service rejects the unapproved request.
      await expect(
        acceptDelivery('delivery-123', 'volunteer-user-1')
      ).rejects.toThrow('This request has not been approved for delivery.');
    });

    // Test 3: With all requirements met, assign the delivery and mark it active for the volunteer.
    test('3. Successfully assigns delivery to volunteer when prerequisites are met', async () => {
      // Keep references to the mock write methods so their calls can be checked later.
      const mockUpdate = jest.fn();
      const mockSet = jest.fn();

      // Configure the transaction to return valid volunteer, delivery, and request records.
      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          get: jest.fn()
            .mockResolvedValueOnce({
              // First read: the volunteer is available and has a name.
              data: () => ({ name: 'Kasun Rider', activeDeliveryId: null }),
            })
            .mockResolvedValueOnce({
              // Second read: the delivery is pending and refers to request req-1.
              exists: () => true,
              data: () => ({ status: 'pending', requestId: 'req-1' }),
            })
            .mockResolvedValueOnce({
              // Third read: the linked request has already been approved.
              exists: () => true,
              data: () => ({ status: 'approved', coordinatorApproved: true }),
            }),
          // Record changes the service makes to existing documents.
          update: mockUpdate,
          // Record changes the service writes or merges into documents.
          set: mockSet,
        };
        // Run the actual service callback with the valid mock data.
        return transactionFn(mockTransaction);
      });

      // Ask the service to assign delivery-123 to volunteer-user-1.
      await acceptDelivery('delivery-123', 'volunteer-user-1');

      // Check that the delivery document was updated with this volunteer and assigned status.
      expect(mockUpdate).toHaveBeenCalledWith(
        // The exact document reference is not important for this test.
        expect.anything(),
        // Check only the important fields in the update object.
        expect.objectContaining({
          volunteerId: 'volunteer-user-1',
          volunteerName: 'Kasun Rider',
          status: 'assigned',
        })
      );

      // Check that the volunteer document now points to this active delivery.
      expect(mockSet).toHaveBeenCalledWith(
        // Accept any document reference in this assertion.
        expect.anything(),
        // These are the fields the service should save.
        { activeDeliveryId: 'delivery-123' },
        // Merge keeps other existing volunteer profile fields.
        { merge: true }
      );
    });
  });

  // --- STATE MACHINE TESTS (updateDeliveryStatus) ---
  // These tests check that delivery statuses move through the allowed steps in order.
  describe('Delivery State Machine Progression', () => {
    // Test 4: An assigned delivery is allowed to move to picked_up.
    test('4. Allows valid progressive state transition (assigned -> picked_up)', async () => {
      // Save the update mock so the test can inspect the requested status change.
      const mockUpdate = jest.fn();

      // Make the fake transaction return a delivery that currently has assigned status.
      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          // The status function reads this delivery document.
          get: jest.fn().mockResolvedValue({
            // Tell the service that the delivery document exists.
            exists: () => true,
            // Provide its current status.
            data: () => ({ status: 'assigned' }),
          }),
          // Record the update made by the service.
          update: mockUpdate,
          // Provide the other transaction method used by the service.
          set: jest.fn(),
        };
        // Run the real status-update logic with the fake transaction.
        return transactionFn(mockTransaction);
      });

      // Request the next valid status in the delivery workflow.
      await updateDeliveryStatus('delivery-123', 'picked_up');

      // Confirm that the service attempted to save picked_up as the new status.
      expect(mockUpdate).toHaveBeenCalledWith(
        // Ignore the specific document reference.
        expect.anything(),
        // Verify that the update contains the expected status.
        expect.objectContaining({ status: 'picked_up' })
      );
    });

    // Test 5: Do not allow a delivery to skip required steps in the workflow.
    test('5. Rejects illegal status jump (e.g., jumping from assigned directly to delivered)', async () => {
      // Make the fake transaction return an existing delivery with assigned status.
      firestore.runTransaction.mockImplementationOnce(async (db, transactionFn) => {
        const mockTransaction = {
          // The service reads this mock delivery to decide if the transition is allowed.
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ status: 'assigned' }),
          }),
          // Track updates; an invalid transition should be rejected before a valid update.
          update: jest.fn(),
          // Provide the other transaction method used by the service.
          set: jest.fn(),
        };
        // Pass the fake transaction into the real service callback.
        return transactionFn(mockTransaction);
      });

      // Try skipping from assigned directly to delivered and expect the service to reject it.
      await expect(
        updateDeliveryStatus('delivery-123', 'delivered')
      ).rejects.toThrow('Delivery status cannot move to that step.');
    });
  });
});
