import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const DELIVERY_CHANNEL_ID = 'delivery-updates';
const DONOR_CHANNEL_ID = 'donation-updates';
const RECIPIENT_CHANNEL_ID = 'request-updates';
const COORDINATOR_CHANNEL_ID = 'coordinator-updates';

const STATUS_LABELS = {
  assigned: 'assigned to you',
  picked_up: 'picked up',
  in_transit: 'in transit',
  delivered: 'delivered',
};

const DONOR_DELIVERY_STATUS_LABELS = {
  assigned: 'A volunteer has been assigned to your donation.',
  picked_up: 'Your donation has been picked up.',
  in_transit: 'Your donation is on its way.',
  delivered: 'Your donation has been delivered.',
};

const RECIPIENT_STATUS_LABELS = {
  approved: { title: 'Request approved', body: (request) => `${request.foodName || 'Your food request'} was approved.` },
  declined: { title: 'Request declined', body: (request) => `${request.foodName || 'Your food request'} was declined.` },
  assigned: { title: 'Volunteer assigned', body: (request) => `A volunteer is handling ${request.foodName || 'your delivery'}.` },
  picked_up: { title: 'Food picked up', body: (request) => `${request.foodName || 'Your food'} has been picked up.` },
  in_transit: { title: 'Delivery on the way', body: (request) => `${request.foodName || 'Your delivery'} is on the way.` },
  at_recipient: { title: 'Delivery arrived', body: (request) => `Your volunteer has arrived with ${request.foodName || 'your food'}.` },
  delivered: { title: 'Delivery completed', body: (request) => `${request.foodName || 'Your food'} has been delivered.` },
};

export const configureLocalNotifications = async () => {
  if (Platform.OS === 'web') return false;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DELIVERY_CHANNEL_ID, {
      name: 'Delivery updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A7A4A',
    });
    await Notifications.setNotificationChannelAsync(DONOR_CHANNEL_ID, {
      name: 'Donation updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A7A4A',
    });
    await Notifications.setNotificationChannelAsync(RECIPIENT_CHANNEL_ID, {
      name: 'Request updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A7A4A',
    });
    await Notifications.setNotificationChannelAsync(COORDINATOR_CHANNEL_ID, {
      name: 'Coordinator queue updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A7A4A',
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  if (currentPermissions.granted || currentPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });

  return requestedPermissions.granted || requestedPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
};

export const notifyForDeliveryChange = async (delivery, previousDelivery, preferences) => {
  if (Platform.OS === 'web' || !delivery || !preferences) return;

  const isNewAssignment = !previousDelivery && delivery.status === 'assigned';
  const statusChanged = previousDelivery && previousDelivery.status !== delivery.status;
  const shouldNotifyAssignment = isNewAssignment && preferences.deliveryAssignments;
  const shouldNotifyStatus = statusChanged && preferences.deliveryStatusUpdates;

  if (!shouldNotifyAssignment && !shouldNotifyStatus) return;

  const statusLabel = STATUS_LABELS[delivery.status] || 'updated';
  const title = shouldNotifyAssignment ? 'New delivery assigned' : 'Delivery status updated';
  const body = shouldNotifyAssignment
    ? `${delivery.foodName || delivery.title || 'A food delivery'} is ${statusLabel}.`
    : `${delivery.foodName || delivery.title || 'Your delivery'} is now ${statusLabel}.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: { deliveryId: delivery.id, status: delivery.status },
    },
    trigger: Platform.OS === 'android' ? { channelId: DELIVERY_CHANNEL_ID } : null,
  });
};

export const notifyForDonorDonationChange = async (donation, previousDonation, preferences) => {
  if (Platform.OS === 'web' || !donation || !previousDonation || preferences?.donationReviewUpdates === false) return;
  if (previousDonation.status !== 'pending_review' || !['available', 'declined'].includes(donation.status)) return;

  const approved = donation.status === 'available';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: approved ? 'Donation approved' : 'Donation not approved',
      body: approved
        ? `${donation.foodName || 'Your donation'} is now available to recipients.`
        : `${donation.foodName || 'Your donation'} was not approved.`,
      sound: 'default',
      data: { donationId: donation.id, status: donation.status },
    },
    trigger: Platform.OS === 'android' ? { channelId: DONOR_CHANNEL_ID } : null,
  });
};

export const notifyForDonorDeliveryChange = async (delivery, previousDelivery, preferences) => {
  if (Platform.OS === 'web' || !delivery || !preferences) return;

  const isNewRequest = !previousDelivery && ['awaiting_approval', 'pending'].includes(delivery.status);
  const statusChanged = previousDelivery && previousDelivery.status !== delivery.status;
  const shouldNotifyRequest = isNewRequest && preferences.newRequests !== false;
  const shouldNotifyStatus = statusChanged
    && preferences.deliveryStatusUpdates !== false
    && DONOR_DELIVERY_STATUS_LABELS[delivery.status];

  if (!shouldNotifyRequest && !shouldNotifyStatus) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: shouldNotifyRequest ? 'New request for your donation' : 'Donation delivery update',
      body: shouldNotifyRequest
        ? `${delivery.foodName || 'Your donation'} has a new recipient request.`
        : DONOR_DELIVERY_STATUS_LABELS[delivery.status],
      sound: 'default',
      data: { deliveryId: delivery.id, donationId: delivery.donationId, status: delivery.status },
    },
    trigger: Platform.OS === 'android' ? { channelId: DONOR_CHANNEL_ID } : null,
  });
};

export const notifyForRecipientRequestChange = async (request, previousRequest, preferences) => {
  if (Platform.OS === 'web' || !request || !previousRequest || !preferences) return;
  if (previousRequest.status === request.status) return;

  const status = request.status;
  const isDecision = ['approved', 'declined'].includes(status);
  const isAssignment = status === 'assigned';
  const isProgress = ['picked_up', 'in_transit', 'at_recipient', 'delivered'].includes(status);
  const shouldNotify = (isDecision && preferences.recipientRequestDecisions !== false)
    || (isAssignment && preferences.recipientDeliveryAssignments !== false)
    || (isProgress && preferences.recipientDeliveryProgress !== false);
  const notification = RECIPIENT_STATUS_LABELS[status];
  if (!shouldNotify || !notification) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body(request),
      sound: 'default',
      data: { requestId: request.id, status },
    },
    trigger: Platform.OS === 'android' ? { channelId: RECIPIENT_CHANNEL_ID } : null,
  });
};

export const notifyCoordinatorForQueueItem = async (type, item, preferences) => {
  if (Platform.OS === 'web' || !item || !preferences) return;

  const isDonation = type === 'donation';
  const preferenceKey = isDonation ? 'coordinatorPendingDonations' : 'coordinatorPendingRequests';
  if (preferences[preferenceKey] === false) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: isDonation ? 'Storable donation for review' : 'Recipient request for review',
      body: isDonation
        ? `${item.foodName || 'A storable donation'} is waiting for your review.`
        : `${item.foodName || 'A food request'} is waiting for your approval.`,
      sound: 'default',
      data: { type, itemId: item.id },
    },
    trigger: Platform.OS === 'android' ? { channelId: COORDINATOR_CHANNEL_ID } : null,
  });
};

export default {
  configureLocalNotifications,
  notifyForDeliveryChange,
  notifyForDonorDonationChange,
  notifyForDonorDeliveryChange,
  notifyForRecipientRequestChange,
  notifyCoordinatorForQueueItem,
};
