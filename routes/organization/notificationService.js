
const supabase = require('../../supabaseClient');

/**
 * Creates a generalized notification
 * @param {Object} options - Notification configuration
 * @param {string} options.type - Type of notification (donation, request, system, etc.)
 * @param {string} [options.user_type] - User type (donor, organization, admin)
 * @param {uuid} [options.recipient_id] - Specific recipient ID
 * @param {string} options.message - Notification message
 * @param {Object} [options.metadata] - Additional contextual data
 * @param {string} [options.status='unread'] - Notification status
 * @returns {Promise} Supabase insert result
 */
async function createNotification({
  type,
  user_type = null,
  recipient_id = null,
  message,
  metadata = {},
  status = 'unread'
}) {
  if (!type || !message) {
    throw new Error('Missing required notification parameters');
  }

  const allowedTypes = [
    'donation', 'request', 'system', 'alert',
    'message', 'update', 'reminder'
  ];

  if (!allowedTypes.includes(type)) {
    throw new Error(`Invalid notification type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Ensure metadata is always an object and store donation_id inside it if needed
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Metadata must be a plain object');
  }

  const notificationPayload = {
    type,
    user_type,
    recipient_id,
    message,
    status,
    metadata: JSON.stringify(metadata),
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('notification')
      .insert(notificationPayload)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Notification creation error:', error);
      throw error;
    }

    console.log(`✅ ${type} notification created`);
    return data;
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
