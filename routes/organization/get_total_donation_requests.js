const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

router.get('/get_all_requests', async (req, res) => {
    const { org_id } = req.query;

    if (!org_id) {
        return res.status(400).json({ message: 'org_id is required' });
    }

    try {
        // Fetch all donations for this org (regardless of status)
        const { data: donations, error: donationError } = await supabase
            .from('donations')
            .select('id, donor_id, status, created_at, location')
            .eq('org_id', org_id);

        if (donationError) throw donationError;

        const results = [];

        for (const donation of donations) {
            // Fetch donor info
            const { data: donor, error: donorError } = await supabase
                .from('donor')
                .select('fname, lname, phone, image_url')
                .eq('id', donation.donor_id)
                .maybeSingle();
            if (donorError) throw donorError;

            // Fetch donation_items
            const { data: items, error: itemError } = await supabase
                .from('donation_items')
                .select('id, type')
                .eq('donation_id', donation.id);
            if (itemError) throw itemError;

            const itemDetails = [];

            for (const item of items) {
                if (item.type === 'others') {
                    continue; 
                }

                let detail = null;

                if (item.type === 'food') {
                    const { data, error } = await supabase
                        .from('food')
                        .select('name, type, qty, pkg_type, exp_date')
                        .eq('donation_item_id', item.id)
                        .maybeSingle();
                    if (error) throw error;
                    detail = data;

                } else if (item.type === 'clothes') {
                    const { data, error } = await supabase
                        .from('clothes')
                        .select('type, size, condition, fabric_type, qty')
                        .eq('donation_item_id', item.id)
                        .maybeSingle();
                    if (error) throw error;
                    detail = data;
                }

                if (detail) {
                    itemDetails.push({
                        type: item.type,
                        details: detail
                    });
                }
            }

            if (itemDetails.length > 0) {
                results.push({
                    donation_id: donation.id,
                    status: donation.status,
                    created_at: donation.created_at,
                    location: donation.location,
                    donor,
                    items: itemDetails
                });
}

        }

        res.status(200).json({
            message: 'All donation requests fetched successfully',
            data: results
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ message: 'Failed to fetch donation requests', error: error.message });
    }
});

module.exports = router;
