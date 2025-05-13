const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

// GET endpoint to fetch a single organization by ID
router.get('/get_donor_detail', async (req, res) => {
    const { id } = req.query;

    console.log('[GET] /get_donor_detail - id:', req.query);

    if (!id) {
        console.error('Missing "id" in query parameters');
        return res.status(400).json({ message: 'donor ID is required' });
    }

    try {
        console.log(`Fetching donor with ID: ${id}`);

        const { data, error } = await supabase
            .from('donor')
            .select('*')
            .eq('id', id)
            .single(); // Ensures we get a single object, not an array

        if (error) {
            console.error('Supabase error:', error.message);
            throw error;
        }

        if (!data) {
            console.warn(`No donor found with ID: ${id}`);
            return res.status(404).json({ message: 'donor not found' });
        }

        console.log('donor data retrieved:', data.id);

        res.status(200).json({ message: 'donor retrieved successfully', data });
    } catch (error) {
        console.error('Unhandled error while fetching donor:', error);
        res.status(500).json({ message: 'Failed to fetch donor', error: error.message });
    }
});

module.exports = router;
