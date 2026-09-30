import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const DELIVERY_CHANNEL_ID = 'delivery-updates';
const DONOR_CHANNEL_ID = 'donation-updates';

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

  const isNewRequest = !previousDelivery && delivery.status === 'pending';
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

export default {
  configureLocalNotifications,
  notifyForDeliveryChange,
  notifyForDonorDonationChange,
  notifyForDonorDeliveryChange,
};
