const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

// POST /create_campaign
router.post('/create_campaign', async (req, res) => {
  const {
    org_id,
    name,
    description,
    thumbnail,
    fundraising_type,
    fundraising_goal,
    amount,
  } = req.body;

  // --- Required validation ---
  if (!org_id || !name) {
    return res.status(400).json({ message: 'org_id and name are required' });
  }

  try {
    const { error, data } = await supabase
      .from('campaign')
      .insert([
        {
          org_id,
          name,
          description,
          thumbnail,
          fundraising_type,
          fundraising_goal,
          amount,
        },
      ]);

    if (error) {
      console.error('❌ Error inserting campaign:', error);
      return res.status(500).json({ message: 'Failed to create campaign', error });
    }

    return res.status(201).json({ message: 'Campaign created successfully', data });
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
