const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();
const router = express.Router();

router.post('/donation-details', async (req, res) => {
    const { donor_id, context } = req.body;

    if (!donor_id || !context) {
        return res.status(400).json({ message: 'donor_id and context are required' });
    }

    // 🛑 Only allow known contexts
    if (context !== 'recent-activities' && context !== 'my-donations') {
        return res.status(400).json({ message: 'Invalid context. Use "recent-activities" or "my-donations".' });
    }

    try {
        let query = supabase
            .from('donations')
            .select(`
                status,
                updated_at,
                organisation ( name ),
                donation_items ( type )
            `)
            .eq('donor_id', donor_id);

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
