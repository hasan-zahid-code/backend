const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

router.get('/get_campaign_details', async (req, res) => {
    const { donor_id } = req.query;

    if (!donor_id) {
        return res.status(400).json({ message: 'donor_id is required' });
    }

    try {
        // Step 1: Get all donations by this donor that have a campaign_id
        const { data: donations, error: donationError } = await supabase
            .from('donations')
            .select('id, campaign_id')
            .eq('donor_id', donor_id)
            .not('campaign_id', 'is', null);

        if (donationError) throw donationError;

        if (!donations.length) {
            return res.status(200).json({ message: 'No campaign donations found', data: [] });
        }

        const responseData = [];

        for (const donation of donations) {
            // Step 2: Get the donation_items of type 'campaign' for this donation
            const { data: item, error: itemError } = await supabase
                .from('donation_items')
                .select('amount_donated')
                .eq('donation_id', donation.id)
                .eq('type', 'campaign')
                .maybeSingle();

            if (itemError) throw itemError;

            // Step 3: Get campaign details
            const { data: campaign, error: campaignError } = await supabase
                .from('campaign')
                .select('*')
                .eq('id', donation.campaign_id)
                .maybeSingle();

            if (campaignError) throw campaignError;

            // Step 4: Combine the data
            if (campaign && item) {
                responseData.push({
                    campaign_id: donation.campaign_id,
                    amount_donated: item.amount_donated,
                    campaign_details: campaign
                });
            }
        }

        res.status(200).json({
            message: 'Campaign donations retrieved successfully',
            data: responseData
        });

    } catch (error) {
        console.error('Error fetching campaign donations:', error.message);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

module.exports = router;
