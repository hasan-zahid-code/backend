const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

router.get('/get_stats', async (req, res) => {
  const { donor_id } = req.query;

  if (!donor_id) {
    return res.status(400).json({ message: 'donor_id is required' });
  }

  try {
    // Fetch completed donations for the donor
    const { data: donations, error } = await supabase
      .from('donations')
      .select('org_id, people_helped')
      .eq('donor_id', donor_id)
      .eq('status', 'completed');

    if (error || !donations) {
      console.error('Error fetching donations:', error);
      return res.status(500).json({ message: 'error fetching data' });
    }

    const completed_donations = donations.length;
    const total_people_helped = donations.reduce((sum, d) => sum + (d.people_helped || 0), 0);
    const uniqueOrgCount = new Set(donations.map(d => d.org_id)).size;

    return res.status(200).json({
      completed_donations,
      total_people_helped,
      distinct_organization_count: uniqueOrgCount
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ message: 'unexpected error' });
  }
});

module.exports = router;
