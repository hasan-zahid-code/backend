const express = require('express');
const router = express.Router();
const supabase = require('../../supabaseClient'); // adjust path as needed

// POST endpoint to update address field in donors or organization table
router.post('/:user/:userid/profile-image', async (req, res) => {
  const { user, userid } = req.params;
  const { profileImage } = req.body;


  if (!userid || !profileImage) {
    return res.status(400).json({ message: 'userid and profileImage are required' });
  }

  const table = user === 'donor' ? 'donor' :
    user === 'org' ? 'organization' :
      null;

  if (!table) {
    return res.status(400).json({ message: 'Invalid user type. Must be "donor" or "org"' });
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .update({ image_url: profileImage })
      .eq('id', userid)
      .select();

    if (error) {
      console.error('Supabase update error:', error.message);
      return res.status(500).json({ message: 'Failed to update profile image', error: error.message });
    }

    res.status(200).json({ message: 'Profile image updated successfully', data });
  } catch (err) {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;