const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

/**
 * GET /posts/others/pending
 * Returns description and image_urls for others-category items with donation status 'pending'
 */
router.get('/get_posts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('others')
      .select(`
        description,
        image_urls,
        donation_items!inner(type),
        donations!inner(status)
      `)
      .eq('donation_items.type', 'others')
      .eq('donations.status', 'pending');

    if (error) {
      console.error('❌ Error fetching others posts:', error);
      return res.status(500).json({ message: 'Failed to fetch posts', error });
    }

    // Optionally map to just the necessary fields
    const filtered = data.map(post => ({
      description: post.description,
      image_urls: post.image_urls
    }));

    return res.status(200).json(filtered);
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
