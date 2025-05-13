const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

router.get('/get_org_posts', async (req, res) => {
  const { org_id } = req.query;

  if (!org_id) {
    return res.status(400).json({ message: 'org_id is required' });
  }

  try {
    // Step 1: Get donations with matching org_id and statuses
    const { data: donations, error: donationError } = await supabase
      .from('donations')
      .select('id, status, donor_id')
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
    const donationMap = new Map(donations.map(d => [d.id, { status: d.status, donor_id: d.donor_id }]));

    // Step 2: Fetch from 'others' table
    const { data: othersData, error: othersError } = await supabase
      .from('others')
      .select('donation_id, description, image_urls, created_at')
      .in('donation_id', donationIds);

    if (othersError) {
      console.error('❌ Error fetching from others table:', othersError);
      return res.status(500).json({ message: 'Failed to fetch donation posts', error: othersError });
    }

    // Step 3: Get donor details (only unique donor_ids)
    const donorIds = [...new Set(donations.map(d => d.donor_id))];
    const { data: donorsData, error: donorError } = await supabase
      .from('donor')
      .select('id, fname, lname, phone, image_url')
      .in('id', donorIds);

    if (donorError) {
      console.error('❌ Error fetching donor info:', donorError);
      return res.status(500).json({ message: 'Failed to fetch donor info', error: donorError });
    }

    const donorMap = new Map(donorsData.map(d => [d.id, d]));

    // Step 4: Enrich posts with status and donor info
    const result = othersData.map(post => {
      const donationInfo = donationMap.get(post.donation_id);
      const donor = donorMap.get(donationInfo?.donor_id) || {};

      return {
        donation_id: post.donation_id,
        description: post.description,
        image_urls: post.image_urls,
        status: donationInfo?.status,
        created_at: post.created_at,
        donor_name: donor.fname && donor.lname ? `${donor.fname} ${donor.lname}` : null,
        donor_phone: donor.phone || null,
        donor_imageurl: donor.image_url || null,
      };
    });

    return res.status(200).json({
      message: 'Donation posts retrieved successfully',
      data: result,
    });

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
