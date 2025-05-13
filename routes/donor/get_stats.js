const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

router.get('/get_stats', async (req, res) => {
  const { donor_id } = req.query;

  if (!donor_id) {
    return res.status(400).json({ message: 'donor_id is required' });
  }

  try {
    // Join donations + feedback for completed donations
    const { data: feedbackData, error } = await supabase
      .from('feedback')
      .select(`
        people_helped,
        donation_id,
        donations (
          id,
          status,
          org_id
        )
      `)
      .eq('donor_id', donor_id);

    if (error || !feedbackData) {
      console.error('Error fetching feedback:', error);
      return res.status(500).json({ message: 'error fetching data' });
    }

    // Filter feedback entries where donation is completed
    const filtered = feedbackData.filter(entry => entry.donations?.status === 'completed');

    const completed_donations = filtered.length;
    const total_people_helped = filtered.reduce((sum, f) => sum + (f.people_helped || 0), 0);
    const uniqueOrgCount = new Set(filtered.map(f => f.donations.org_id)).size;

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
