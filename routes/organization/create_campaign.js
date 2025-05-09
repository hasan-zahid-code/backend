const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

router.post('/create_campaign', async (req, res) => {
  const {
    org_id,
    name,
    description,
    thumbnail,
    fundraising_type,
    fundraising_goal,
    amount,
    amount_raised,
  } = req.body;

  // --- Basic required validation ---
  if (!org_id || !name || typeof amount_raised !== 'number') {
    return res.status(400).json({ message: 'org_id, name, and amount_raised are required' });
  }

  // --- Conditional validation ---
  if (fundraising_type === true) {
    if (!fundraising_goal || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        message: 'fundraising_goal and amount are required and must be valid if fundraising_type is true',
      });
    }
  }

  try {
    const { error, data } = await supabase
      .from('campaign')
      .insert([{
        org_id,
        name,
        description,
        thumbnail,
        fundraising_type,
        fundraising_goal: fundraising_type ? fundraising_goal : null,
        amount: fundraising_type ? amount : null,
        amount_raised, // ✅ Include in DB insert
      }]);

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
