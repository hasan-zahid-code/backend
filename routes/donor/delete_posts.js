const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

router.delete('/delete_posts', async (req, res) => {
  const { donation_id } = req.query;

  if (!donation_id) {
    return res.status(400).json({ message: 'donation_id parameter is required' });
  }

  try {
    const { error } = await supabase
      .from('donations')
      .delete()
      .eq('id', donation_id);

    if (error) {
      console.error('❌ Error deleting donation:', error);
      return res.status(500).json({ message: 'Failed to delete donation', error });
    }

    return res.status(200).json({ message: 'Donation deleted successfully' });
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
