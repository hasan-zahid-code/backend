const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

router.get('/get_feedback', async (req, res) => {
  const { donation_id } = req.query;

  if (!donation_id) {
    return res.status(400).json({ message: 'donation_id is required' });
  }

  try {
    // Fetch feedback based on the donation_id
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('donation_id', donation_id);

    if (error || !data) {
      console.error('Error fetching feedback:', error);
      return res.status(500).json({ message: 'Error fetching feedback data' });
    }

    if (data.length === 0) {
      return res.status(404).json({ message: 'No feedback found for the given donation_id' });
    }

    // Return the feedback data
    return res.status(200).json({
      message: 'Feedback fetched successfully',
      data: data
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

module.exports = router;
