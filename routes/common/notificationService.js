
const supabase = require('../../supabaseClient');

/**
 * Creates a generalized notification with dynamic context
 * @param {Object} options - Notification configuration
 * @param {string} options.type - Type of notification (donation, request, etc.)
 * @param {string} [options.user_type] - User type (donor, organization, admin)
 * @param {uuid} [options.recipient_id] - Specific recipient ID
 * @param {string} [options.message] - Optional custom message
 * @param {Object} [options.metadata] - Contextual data (must include donation_id for donation-type)
 * @param {string} [options.status='unread'] - Notification status
 * @returns {Promise} Supabase insert result
 */
async function createNotification({
  type,
  user_type = null,
  recipient_id = null,
  message = null,
  metadata = {},
  status = 'unread'
}) {
  if (!type) throw new Error('Missing required notification type');
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Metadata must be a plain object');
  }

  const allowedTypes = [
    'donation', 'request', 'system', 'alert',
    'message', 'update', 'reminder'
  ];

  if (!allowedTypes.includes(type)) {
    throw new Error(`Invalid notification type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  let dynamicMessage = message;

  try {
    let donationData = null;
    let userData = null;
    let orgData = null;

    if (type === 'donation' && metadata.donation_id) {
      // 1. Fetch Donation
      const { data: donation, error: donationError } = await supabase
        .from('donations')
        .select('id, status, donor_id, org_id')
        .eq('id', metadata.donation_id)
        .single();

      if (donationError || !donation) {
        throw new Error(`Failed to retrieve donation: ${donationError?.message}`);
      }
      donationData = donation;

      // 2. Fetch Donor
      if (donation.donor_id) {
        const { data: donor, error: userError } = await supabase
          .from('users')
          .select('id, fname, lname')
          .eq('id', donation.donor_id)
          .single();

        if (userError || !donor) {
          throw new Error(`Failed to retrieve donor: ${userError?.message}`);
        }
        userData = donor;
      }

      // 3. Fetch Organization
      if (donation.org_id) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', donation.org_id)
          .single();

        if (orgError || !org) {
          throw new Error(`Failed to retrieve organization: ${orgError?.message}`);
        }
        orgData = org;
      }

      // 4. Generate Dynamic Message
      const status = donation.status;
      const donorName = userData?.fname || 'Donor';
      const orgName = orgData?.name || 'the organization';

      const statusMessages = {
        in_progress: `${donorName}, your donation is now being processed by ${orgName}.`,
        rejected: `Sorry ${donorName}, your donation was rejected by ${orgName}.`,
        cancelled: `Your donation has been cancelled. If this was unintentional, you can submit a new request.`,
        picked_up: `Your donation was picked up by ${orgName}. Thank you for your generosity!`,
        completed: `Your donation has been successfully completed. ${orgName} appreciates your help!`
      };

      dynamicMessage = message || statusMessages[status] || `Your donation status is now: ${status}`;
      recipient_id = recipient_id || donation.donor_id;

      const notifications = [];

      // 5. Create Donor Notification
      notifications.push({
        type,
        user_type: 'donor',
        recipient_id: donation.donor_id,
        message: dynamicMessage,
        status,
        metadata: JSON.stringify(metadata),
        created_at: new Date().toISOString()
      });

      // 6. Create Organization Notification on donor cancellation
      if (status === 'cancelled' && donation.org_id) {
        notifications.push({
          type,
          user_type: 'organization',
          recipient_id: donation.org_id,
          message: `${donorName} has cancelled their donation.`,
          status,
          metadata: JSON.stringify(metadata),
          created_at: new Date().toISOString()
        });
      }

      const { data, error } = await supabase
        .from('notification')
        .insert(notifications)
        .select();

      if (error) {
        console.error('❌ Notification creation error:', error);
        throw error;
      }

      console.log(`✅ ${notifications.length} notification(s) created for donation ${donation.id}`);
      return data;
    } else {
      // Fallback generic notification
      const notificationPayload = {
        type,
        user_type,
        recipient_id,
        message: dynamicMessage || 'New notification',
        status,
        metadata: JSON.stringify(metadata),
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('notification')
        .insert(notificationPayload)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Notification creation error:', error);
        throw error;
      }

      console.log(`✅ Notification created for ${type}`);
      return data;
    }
  } catch (err) {
    console.error('❌ Unexpected notification creation error:', err);
    throw err;
  }
}


/**
 * Retrieve notifications with flexible filtering
 * @param {Object} filters - Filtering options
 * @returns {Promise} List of notifications
 */
async function getNotifications(filters = {}) {
  try {
    let query = supabase.from('notification').select('*');

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Notification retrieval error:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Unexpected notification retrieval error:', err);
    throw err;
  }
}

/**
 * Mark notifications as read
 * @param {string[]} notificationIds - Array of notification IDs to mark as read
 * @returns {Promise} Update result
 */
async function markNotificationsAsRead(notificationIds) {
  try {
    const { data, error } = await supabase
      .from('notification')
      .update({ status: 'read' })
      .in('id', notificationIds);

    if (error) {
      console.error('Notification update error:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Unexpected notification update error:', err);
    throw err;
  }
}

module.exports = {
  createNotification,
  getNotifications,
  markNotificationsAsRead
};
