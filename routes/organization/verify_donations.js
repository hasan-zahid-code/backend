const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

router.get('/verify_donations', async (req, res) => {
  const { campaign_id } = req.query;

  if (!campaign_id) {
    return res.status(400).json({ message: 'campaign_id is required' });
  }

  try {
    // Fetch donations related to the provided campaign_id
    const { data: donations, error } = await supabase
      .from('donations')
      .select(`
        id, donor_id, acc_statement_img,
        donation_items (amount_donated),
        campaign_id
      `)
      .eq('campaign_id', campaign_id);

    if (error || !donations) {
      console.error('Error fetching donations:', error);
      return res.status(500).json({ message: 'Error fetching donations' });
    }

    // Get donor details (fname, lname) for each donation
    const donorPromises = donations.map(async (donation) => {
      const { data: donorData, error: donorError } = await supabase
        .from('donor')
        .select('fname, lname')
        .eq('id', donation.donor_id)
        .single();

      if (donorError) {
        console.warn(`Failed to fetch donor details for donation ${donation.id}:`, donorError.message);
        return null;
      }

      // Get the amount donated from donation_items for this specific donation
      const amountDonated = donation.donation_items[0]?.amount_donated || 0; // Assuming only one item for simplicity

      return {
        donor_full_name: `${donorData.fname} ${donorData.lname}`,
        acc_statement_img: donation.acc_statement_img,
        amount_donated: amountDonated,
      };
    });

    // Wait for all donor data to be fetched
    const donorDetails = await Promise.all(donorPromises);

    // Filter out any failed donor data fetches
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
