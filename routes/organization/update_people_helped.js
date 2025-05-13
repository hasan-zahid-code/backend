const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

router.post('/update_people_helped', async (req, res) => {
  const { donation_id, people_helped } = req.body;

  if (!donation_id || typeof people_helped !== 'number') {
    return res.status(400).json({ message: 'failure' });
  }

  try {
    const { error } = await supabase
      .from('donations')
      .update({ people_helped })
      .eq('id', donation_id);

    if (error) {
      console.error('Error updating people_helped:', error);
      return res.status(500).json({ message: 'failure' });
    }

    return res.status(200).json({ message: 'success' });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ message: 'failure' });
  }
});

module.exports = router;
