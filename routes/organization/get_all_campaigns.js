const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

// GET /get_all_campaigns
router.get('/get_all_campaigns', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaign')
      .select('*') // or explicitly list columns for control

    if (error) {
      console.error('❌ Error fetching campaigns:', error);
      return res.status(500).json({ message: 'Failed to fetch campaigns', error });
    }

    return res.status(200).json({ message: 'Campaigns retrieved successfully', data });
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
