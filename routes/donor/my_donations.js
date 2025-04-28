const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

router.get('/my-donations', async (req, res) => {
    const { donor_id } = req.query;

    console.log('GET /my-donations called with:', { donor_id });

    if (!donor_id) {
        console.warn('Missing donor_id');
        return res.status(400).json({ message: 'donor_id is required' });
    }

    try {
        const { data, error } = await supabase
            .from('donations')
            .select(`
                *,
                organization (
                    name,
                    image_url
                ),
                donation_items (
                    type
                )
            `)
            .eq('donor_id', donor_id);

        if (error) {
            console.error('Supabase query error:', error.message);
            throw error;
        }

        console.log(`Found ${data.length} donations for donor_id "${donor_id}"`);

        res.status(200).json({
            message: 'Donations with donor, organization, and item types fetched successfully',
            data
        });
    } catch (error) {
        console.error('Error fetching donations:', error.message);
        res.status(500).json({ message: 'Failed to fetch donations', error: error.message });
    }
});


module.exports = router;
