const express = require('express');
const router = express.Router();
const supabase = require('../../supabaseClient'); // adjust path as needed

// GET endpoint to retrieve address field from donor or organization table
router.get('/get_address', async (req, res) => {
  const { id, context } = req.query;

  if (!id || !context) {
    return res.status(400).json({ message: 'id and context are required' });
  }

  try {
    const table = context === 'organization' ? 'organization'
                : context === 'donor'        ? 'donor'
                : null;

    if (!table) {
      return res.status(400).json({ message: 'Invalid context provided' });
    }

    const { data, error } = await supabase
      .from(table)
      .select('address')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase fetch error:', error.message);
      return res.status(500).json({ message: 'Failed to fetch address', error: error.message });
    }

    res.status(200).json({ message: 'Address fetched successfully', data });
  } catch (err) {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
