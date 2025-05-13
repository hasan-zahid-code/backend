const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

/**
 * POST /accept_post
 * Body: { donation_id: string, organisation_id: string }
 * - Updates donations.org_id and donations.status = 'pending'
 */
router.post('/accept_posts', async (req, res) => {
  const { donation_id, organisation_id } = req.body;

  if (!donation_id || !organisation_id) {
    return res.status(400).json({ message: 'donation_id and organisation_id are required' });
  }

  try {
    // Update the donations table with org_id and status
    const { error: updateError } = await supabase
      .from('donations')
      .update({
        org_id: organisation_id,
        status: 'in_progress'
      })
      .eq('id', donation_id);

    if (updateError) {
      console.error('❌ Error updating donations table:', updateError);
      return res.status(500).json({ message: 'Failed to accept post', error: updateError });
    }

    return res.status(200).json({ message: 'Post accepted successfully' });
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
