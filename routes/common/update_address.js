const express = require('express');
const router = express.Router();
const supabase = require('../../supabaseClient'); // adjust path as needed

// POST endpoint to update address or location field
router.post('/update_address', async (req, res) => {
  const { id, context, location_data } = req.body;

  if (!id || !context || !location_data) {
    return res.status(400).json({ message: 'id, context and location_data are required' });
  }

  try {
    let table, updateField;

    if (context === 'organization') {
      table = 'organization';
      updateField = 'location';
    } else if (context === 'donor') {
      table = 'donor';
      updateField = 'address';
    } else {
      return res.status(400).json({ message: 'Invalid context provided' });
    }

    // Prepare the update object
    const updateObj = {};
    updateObj[updateField] = location_data;

    // Perform the update
    const { data, error } = await supabase
      .from(table)
      .update(updateObj)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase update error:', error.message);
      return res.status(500).json({ message: 'Failed to update address/location', error: error.message });
    }

    res.status(200).json({ message: `${updateField} updated successfully`, data });
  } catch (err) {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
