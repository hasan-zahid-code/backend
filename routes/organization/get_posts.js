const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

/**
 * GET /get_posts
 * Returns description, image_urls, and donor info for others-category items with donation status 'pending'
 */
router.get('/get_posts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('others')
      .select(`
        description,
        image_urls,
        donation_items!inner(type),
        donations!inner(
          status,
          donor:donor_id(
            fname,
            lname,
            image_url
          )
        )
      `)
      .eq('donation_items.type', 'others')
      .eq('donations.status', 'pending');

    if (error) {
      console.error('❌ Error fetching others posts:', error);
      return res.status(500).json({ message: 'Failed to fetch posts', error });
    }

    const result = data.map(post => ({
      description: post.description,
      image_urls: post.image_urls,
      donor_fname: post.donations.donor?.fname || null,
      donor_lname: post.donations.donor?.lname || null,
      donor_image_url: post.donations.donor?.image_url || null
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
