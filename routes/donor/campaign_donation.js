const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

router.post('/campaign_donate', async (req, res) => {
    const { donor_id, org_id, status, campaign_id, amount, acc_statement_img } = req.body;

    if (!donor_id || !org_id || !status || !amount) {
        return res.status(400).json({ message: 'Required fields: donor_id, org_id, status, amount' });
    }

    try {
        // Step 1: Insert into donations table
        const { data: donationData, error: donationError } = await supabase
            .from('donations')
            .insert([
                {
                    donor_id,
                    org_id,
                    status,
                    campaign_id,
                    acc_statement_img
                }
            ])
            .select()
            .single(); // get the inserted row

        if (donationError) {
            console.error('Error inserting donation:', donationError.message);
            return res.status(500).json({ message: 'Failed to create donation', error: donationError.message });
        }

        const donation_id = donationData.id;

        // Step 2: Insert into donation_items table
        const { error: itemError } = await supabase
            .from('donation_items')
            .insert([
                {
                    donation_id,
                    type: 'campaign',
                    amount_donated: amount
                }
            ]);

        if (itemError) {
            console.error('Error inserting donation item:', itemError.message);
            return res.status(500).json({ message: 'Failed to add donation item', error: itemError.message });
        }

        res.status(201).json({
            message: 'Campaign donation created successfully',
            donation_id
        });
    } catch (error) {
        console.error('Unexpected error:', error.message);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

module.exports = router;
