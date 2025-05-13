const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

router.put('/update_notifications_to_read', async (req, res) => {
  const { recipient_id } = req.body;

  if (!recipient_id) {
    return res.status(400).json({ message: 'recipient_id is required' });
  }

  try {
    const { error } = await supabase
      .from('notification')
      .update({ status: 'read' })
      .eq('recipient_id', recipient_id);

    if (error) {
      console.error('❌ Error updating notifications:', error);
      return res.status(500).json({ message: 'Failed to update notifications', error });
    }

    return res.status(200).json({ message: 'Notifications marked as read successfully' });
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
