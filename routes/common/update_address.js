const express = require('express');
const router = express.Router();
const supabase = require('../../supabaseClient'); // adjust path as needed

// POST endpoint to update address field in donors or organization table
router.post('/update_address', async (req, res) => {
  const { id, context, location_data } = req.body;

  if (!id || !context || !location_data) {
    return res.status(400).json({ message: 'id, context and location_data are required' });
  }

  try {
    const table = context === 'organization' ? 'organization'
                : context === 'donor'        ? 'donor'
                : null;

    if (!table) {
      return res.status(400).json({ message: 'Invalid context provided' });
    }

    // Update the address field with location_data
    const { data, error } = await supabase
      .from(table)
      .update({ address: location_data })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase update error:', error.message);
      return res.status(500).json({ message: 'Failed to update address', error: error.message });
    }

    res.status(200).json({ message: 'Address updated successfully', data });
  } catch (err) {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
