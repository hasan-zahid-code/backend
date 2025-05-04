const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

/**
 * GET /get_posts?donor_id=<optional>
 * - No donor_id → return donation_id, description, image_urls, created_at, donor info (for pending status)
 * - With donor_id → return description, image_urls, status, created_at (+ org info if status is 'approved')
 */
router.get('/get_posts', async (req, res) => {
  const { donor_id } = req.query;

  try {
    let query = supabase
      .from('others')
      .select(`
        description,
        image_urls,
        created_at,
        ${!donor_id ? 'donation_id,' : ''}
        donation_items!inner(type),
        donations!inner(
          status,
          donor_id,
          org_id,
          donor:donor_id(
            fname,
            lname,
            image_url,
            phone,
            address
          ),
          organization:org_id(
            name,
            image_url,
            latitude,
            longitude
          )
        )
      `)
      .eq('donation_items.type', 'others');

    if (donor_id) {
      query = query.eq('donations.donor_id', donor_id);
    } else {
      query = query.eq('donations.status', 'pending');
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching posts:', error);
      return res.status(500).json({ message: 'Failed to fetch posts', error });
    }

    const result = data.map(post => {
      if (!donor_id) {
        return {
          donation_id: post.donation_id,
          description: post.description,
          image_urls: post.image_urls,
          donor_fname: post.donations.donor?.fname || null,
          donor_lname: post.donations.donor?.lname || null,
          donor_image_url: post.donations.donor?.image_url || null,
          phone: post.donations.donor?.phone || null,
          address: post.donations.donor?.address || null,
          created_at: post.created_at
        };
      }

      const base = {
        description: post.description,
        image_urls: post.image_urls,
        status: post.donations.status,
        created_at: post.created_at
      };

      if (
        post.donations.status !== 'cancelled' &&
        post.donations.status !== 'rejected' &&
        post.donations.status !== 'pending'
      ) {
        base.organization_name = post.donations.organization?.name || null;
        base.organization_image_url = post.donations.organization?.image_url || null;
        base.latitude = post.donations.organization?.latitude || null;
        base.longitude = post.donations.organization?.longitude || null;
      }

      return base;
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
