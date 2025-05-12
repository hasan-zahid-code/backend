const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

router.get('/get_org_posts', async (req, res) => {
  const { org_id } = req.query;

  if (!org_id) {
    return res.status(400).json({ message: 'org_id is required' });
  }

  try {
    // Step 1: Get donations for this org with matching statuses
    const { data: donations, error: donationError } = await supabase
      .from('donations')
      .select('id, status')
      .eq('org_id', org_id)
      .in('status', ['in_progress', 'picked_up', 'completed']);

    if (donationError) {
      console.error('❌ Error fetching donations:', donationError);
      return res.status(500).json({ message: 'Failed to fetch donations', error: donationError });
    }

    if (!donations || donations.length === 0) {
      return res.status(200).json({ message: 'No matching donations found', data: [] });
    }

    const donationIds = donations.map(d => d.id);
    const donationMap = new Map(donations.map(d => [d.id, d.status]));

    // Step 2: Join 'others' with 'donation_items' to get type as well
    const { data: othersData, error: othersError } = await supabase
      .from('others')
      .select(`
        donation_id,
        description,
        image_urls,
        created_at,
        donation_items (
          type
        )
      `)
      .in('donation_id', donationIds);

    if (othersError) {
      console.error('❌ Error fetching from others table:', othersError);
      return res.status(500).json({ message: 'Failed to fetch donation posts', error: othersError });
    }

    const result = othersData.map(post => ({
      donation_id: post.donation_id,
      description: post.description,
      image_urls: post.image_urls,
      type: post.donation_items?.type || null,
      status: donationMap.get(post.donation_id),
      created_at: post.created_at,
    }));

    return res.status(200).json({
      message: 'Donation posts (type: others) retrieved successfully',
      data: result,
    });

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
