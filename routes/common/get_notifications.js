const express = require('express');
const supabase = require('../../supabaseClient');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const router = express.Router();

router.get('/get_notifications', async (req, res) => {
  const { recipient_id } = req.query;

  if (!recipient_id) {
    return res.status(400).json({ message: 'recipient_id is required' });
  }

  try {
    const { data, error } = await supabase
      .from('notification')
      .select('id, type, user_type, status, message, metadata, created_at')
      .eq('recipient_id', recipient_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      return res.status(500).json({ message: 'Failed to fetch notifications', error });
    }

    const formattedData = data.map(notification => ({
      id: notification.id,
      type: notification.type,
      user_type: notification.user_type,
      status: notification.status,
      message: notification.message,
      metadata: notification.metadata,
      time_ago: dayjs(notification.created_at).fromNow()
    }));

    return res.status(200).json({
      message: 'Notifications retrieved successfully',
      data: formattedData
    });

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
