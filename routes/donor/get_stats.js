const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

router.get('/get_stats', async (req, res) => {
  const { donor_id } = req.query;

  if (!donor_id) {
    return res.status(400).json({ message: 'donor_id is required' });
  }

  try {
    // Fetch completed donations and feedback for the donor
    const { data: donations, error } = await supabase
      .from('donations')
      .select('id, org_id, status')
      .eq('donor_id', donor_id)
      .eq('status', 'completed');

    if (error || !donations) {
      console.error('Error fetching donations:', error);
      return res.status(500).json({ message: 'Error fetching data' });
    }

    // Fetch feedback for completed donations
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('feedback')
      .select('people_helped, donation_id')
      .in('donation_id', donations.map(d => d.id));

    if (feedbackError || !feedbackData) {
      console.error('Error fetching feedback:', feedbackError);
      return res.status(500).json({ message: 'Error fetching feedback data' });
    }

    // Combine donations with feedback and filter valid entries
    const completedDonationsWithFeedback = donations.map(donation => {
      const feedback = feedbackData.find(f => f.donation_id === donation.id);
      return {
        ...donation,
        people_helped: feedback ? feedback.people_helped : 0
      };
    });

    // Filter completed donations
    const completed_donations = completedDonationsWithFeedback.length;

    // Calculate total people helped from the feedback
    const total_people_helped = completedDonationsWithFeedback.reduce(
      (sum, donation) => sum + donation.people_helped,
      0
    );

    // Count unique organizations
    const uniqueOrgCount = new Set(
      completedDonationsWithFeedback.map(donation => donation.org_id)
    ).size;

    return res.status(200).json({
      completed_donations,
      total_people_helped,
      distinct_organization_count: uniqueOrgCount
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

module.exports = router;
