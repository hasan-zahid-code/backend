const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

router.post('/update_campaign_donation', async (req, res) => {
  const { donation_id, context } = req.body;

  if (!donation_id || !context) {
    return res.status(400).json({ message: 'donation_id and context are required' });
  }

  // Determine new status based on context
  let newStatus = null;

  if (context === 'accept') {
    newStatus = 'completed';
  } else if (context === 'reject') {
    newStatus = 'rejected';
  } else {
    return res.status(400).json({ message: 'Invalid context value. Must be "accept" or "reject".' });
  }

  try {
    // Update donation status
    const { data, error } = await supabase
      .from('donations')
      .update({ status: newStatus })
      .eq('id', donation_id);

    if (error) {
      console.error('Error updating donation status:', error.message);
      return res.status(500).json({ message: 'Failed to update donation status' });
    }

    return res.status(200).json({ message: `Donation status updated to "${newStatus}"` });

  } catch (err) {
    console.error('Unexpected error:', err.message);
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

module.exports = router;
