const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

// GET endpoint to fetch a single organisation by ID
router.get('/get_organisation_detail', async (req, res) => {
    const { id } = req.query;

    console.log('[GET] /get_organisation_detail - id:', req.query);

    if (!id) {
        console.error('Missing "id" in query parameters');
        return res.status(400).json({ message: 'Organisation ID is required' });
    }

    try {
        console.log(`Fetching organisation with ID: ${id}`);

        const { data, error } = await supabase
            .from('organisation')
            .select('*')
            .eq('id', id)
            .single(); // Ensures we get a single object, not an array

        if (error) {
            console.error('Supabase error:', error.message);
            throw error;
        }

        if (!data) {
            console.warn(`No organisation found with ID: ${id}`);
            return res.status(404).json({ message: 'Organisation not found' });
        }

        console.log('Organisation data retrieved:', data.id);

        res.status(200).json({ message: 'Organisation retrieved successfully', data });
    } catch (error) {
        console.error('Unhandled error while fetching organisation:', error);
        res.status(500).json({ message: 'Failed to fetch organisation', error: error.message });
    }
});

module.exports = router;
