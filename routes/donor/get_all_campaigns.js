const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

// GET /get_all_campaigns
router.get('/get_all_campaigns', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaign')
      .select(`
        *,
        organization (
          name,
          image_url
        )
      `);

    if (error) {
      console.error('❌ Error fetching campaigns:', error);
      return res.status(500).json({ message: 'Failed to fetch campaigns', error });
    }

    // Filter out completed campaigns
    const filteredCampaigns = data.filter(campaign =>
      campaign.amount_raised === null ||
      campaign.amount === null ||
      campaign.amount_raised < campaign.amount
    );

    return res.status(200).json({ message: 'Campaigns retrieved successfully', data: filteredCampaigns });
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
