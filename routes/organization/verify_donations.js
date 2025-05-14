const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

router.get('/verify_donations', async (req, res) => {
  const { campaign_id } = req.query;

  if (!campaign_id) {
    return res.status(400).json({ message: 'campaign_id is required' });
  }

  try {
    // Fetch all donations for the given campaign_id (no status filter)
    const { data: donations, error } = await supabase
      .from('donations')
      .select(`
        id, donor_id, acc_statement_img, status,
        donation_items (amount_donated),
        campaign_id
      `)
      .eq('campaign_id', campaign_id);

    if (error || !donations) {
      console.error('Error fetching donations:', error);
      return res.status(500).json({ message: 'Error fetching donations' });
    }

    // Enrich with donor details
    const donorPromises = donations.map(async (donation) => {
      const { data: donorData, error: donorError } = await supabase
        .from('donor')
        .select('fname, lname, image_url')
        .eq('id', donation.donor_id)
        .single();

      if (donorError) {
        console.warn(`Failed to fetch donor for donation ${donation.id}:`, donorError.message);
        return null;
      }

      const amountDonated = donation.donation_items[0]?.amount_donated || 0;

      return {
        donation_id: donation.id,
        donor_full_name: `${donorData.fname} ${donorData.lname}`,
        donor_image_url: donorData.image_url || null,
        acc_statement_img: donation.acc_statement_img,
        amount_donated: amountDonated,
        status: donation.status, // ✅ Include status
      };
    });

    const donorDetails = await Promise.all(donorPromises);
    const validDonorDetails = donorDetails.filter(detail => detail !== null);

    return res.status(200).json({
      campaign_id,
      donations: validDonorDetails,
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

module.exports = router;
