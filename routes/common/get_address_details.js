const express = require('express');
const router = express.Router();
const supabase = require('../../supabaseClient'); // Adjust path as needed

// GET endpoint to fetch address from donors or organization table
router.get('/get_address', async (req, res) => {
  const { id, context } = req.query;

  if (!id || !context) {
    return res.status(400).json({ error: 'id and context are required' });
  }

  const table = context === 'organization' ? 'organization'
              : context === 'donor'        ? 'donor'
              : null;

  if (!table) {
    return res.status(400).json({ error: 'Invalid context' });
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .select('address')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase fetch error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch address', detail: error.message });
    }

    if (!data || !data.address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const address = typeof data.address === 'string'
      ? JSON.parse(data.address)
      : data.address;

    res.status(200).json(address);
  } catch (err) {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

module.exports = router;
