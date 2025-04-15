const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

router.post('/donation-details', async (req, res) => {
    const { donor_id, context } = req.body;

    // Validate required fields
    if (!donor_id || !context) {
        return res.status(400).json({ message: 'donor_id and context are required' });
    }

    try {
        // Build the base query
        let query = supabase
            .from('donations')
            .select(`
                status,
                updated_at,
                organisation ( name ),
                donation_items ( type )
            `)
            .eq('donor_id', donor_id);

        // If context is "my-donations", filter by status = 'accepted'
        if (context === 'my-donations') {
            query = query.eq('status', 'accepted');
        }

        const { data, error } = await query;

        if (error) throw error;

        res.status(200).json({
            message: `Donation details for context: ${context}`,
            data
        });
    } catch (error) {
        console.error('Error fetching donation details:', error.message);
        res.status(500).json({ message: 'Failed to fetch donation details', error: error.message });
    }
});

module.exports = router;
