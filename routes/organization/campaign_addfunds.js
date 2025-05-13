const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

router.post('/campaign_addfunds', async (req, res) => {
    const { campaign_id, amount } = req.body;

    if (!campaign_id || amount == null) {
        return res.status(400).json({ message: 'campaign_id and amount are required' });
    }

    try {
        // Get current amount_raised
        const { data: campaign, error: fetchError } = await supabase
            .from('campaign')
            .select('amount_raised')
            .eq('id', campaign_id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const newTotal = (campaign.amount_raised || 0) + amount;

        // Update campaign amount_raised
        const { error: updateError } = await supabase
            .from('campaign')
            .update({ amount_raised: newTotal })
            .eq('id', campaign_id);

        if (updateError) throw updateError;

        res.status(200).json({
            message: 'Funds added to campaign successfully',
            updated_amount_raised: newTotal
        });

    } catch (error) {
        console.error('Error updating campaign:', error.message);
        res.status(500).json({ message: 'Failed to add funds to campaign', error: error.message });
    }
});

module.exports = router;
