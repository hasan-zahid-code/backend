const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

router.get('/get_org_campaigns', async (req, res) => {
    const { org_id } = req.query;

    if (!org_id) {
        return res.status(400).json({ message: 'org_id is required' });
    }

    try {
        const { data: campaigns, error } = await supabase
            .from('campaign')
            .select('*')
            .eq('org_id', org_id);

        if (error) throw error;

        res.status(200).json({
            message: 'Campaigns fetched successfully',
            data: campaigns
        });

    } catch (error) {
        console.error('Error fetching campaigns:', error.message);
        res.status(500).json({ message: 'Failed to fetch campaigns', error: error.message });
    }
});

module.exports = router;
