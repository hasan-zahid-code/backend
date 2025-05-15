
const supabase = require('../../supabaseClient');
/**
 * Creates a generalized notification with schema-aligned constraints.
 * @param {Object} options - Notification configuration
 * @param {string} options.type - One of: donation, request, system, alert, message, update, reminder
 * @param {string} [options.user_type] - One of: donor, organization, admin, system
 * @param {uuid} [options.recipient_id] - User/org/admin ID
 * @param {string} [options.message] - Custom message
 * @param {Object} [options.metadata] - Context data (e.g., donation_id)
 * @param {string} [options.status='unread'] - One of: unread, read, important, archived
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
    'donation', 'request', 'system', 'alert', 'message', 'update', 'reminder'
  ];
  const allowedUserTypes = ['donor', 'organization', 'admin', 'system'];
  const allowedStatuses = ['unread', 'read', 'important', 'archived'];

  if (!allowedTypes.includes(type)) {
    throw new Error(`Invalid type. Must be one of: ${allowedTypes.join(', ')}`);
  }

  if (user_type && !allowedUserTypes.includes(user_type)) {
    throw new Error(`Invalid user_type. Must be one of: ${allowedUserTypes.join(', ')}`);
  }

  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${allowedStatuses.join(', ')}`);
  }

  try {
    let dynamicMessage = message;

    // Donation-specific message logic
    if (type === 'donation' && metadata.donation_id) {
      const { data: donation, error: donationError } = await supabase
        .from('donations')
        .select('id, status, donor_id, org_id')
        .eq('id', metadata.donation_id)
        .single();

      if (donationError || !donation) {
        throw new Error(`Failed to retrieve donation: ${donationError?.message}`);
      }

      const { data: donor, error: donorError } = await supabase
        .from('donor')
        .select('id, fname, lname')
        .eq('id', donation.donor_id)
        .single();

      const { data: org, error: orgError } = await supabase
        .from('organization')
        .select('id, name')
        .eq('id', donation.org_id)
        .single();

      const donorName = donor?.fname || 'Donor';
      const orgName = org?.name || 'the organization';
      const donationStatus = donation.status;

      const statusMessages = {
        in_progress: `${donorName}, your donation is now being processed by ${orgName}.`,
        rejected: `Sorry ${donorName}, your donation was rejected by ${orgName}.`,
        cancelled: `Your donation has been cancelled.`,
        picked_up: `Your donation was picked up by ${orgName}. Thank you!`,
        completed: `Your donation is complete. ${orgName} appreciates your help!`
      };

      dynamicMessage = message || statusMessages[donationStatus] || `Your donation status is now: ${donationStatus}`;

      const notifications = [
        {
          type,
          user_type: 'donor',
          recipient_id: donation.donor_id,
          message: dynamicMessage,
          status,
          metadata: JSON.stringify(metadata),
          created_at: new Date().toISOString()
        }
      ];

      if (donationStatus === 'cancelled' && donation.org_id) {
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

      if (error) throw error;
      return data;
    }

    // Generic notification fallback
    const payload = {
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
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    return data;
  } catch (err) {
    console.error('❌ Notification creation failed:', err.message);
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
