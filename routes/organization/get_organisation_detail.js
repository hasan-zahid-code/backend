const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

// GET endpoint to fetch a single organization by ID
router.get('/get_organization_detail', async (req, res) => {
    const { id } = req.query;

    console.log('[GET] /get_organization_detail - id:', req.query);

    if (!id) {
        console.error('Missing "id" in query parameters');
        return res.status(400).json({ message: 'organization ID is required' });
    }

    try {
        console.log(`Fetching organization with ID: ${id}`);

        const { data, error } = await supabase
            .from('organization')
            .select('*')
            .eq('id', id)
            .single(); // Ensures we get a single object, not an array

        if (error) {
            console.error('Supabase error:', error.message);
            throw error;
        }

        if (!data) {
            console.warn(`No organization found with ID: ${id}`);
            return res.status(404).json({ message: 'organization not found' });
        }

        console.log('organization data retrieved:', data.id);

        res.status(200).json({ message: 'organization retrieved successfully', data });
    } catch (error) {
        console.error('Unhandled error while fetching organization:', error);
        res.status(500).json({ message: 'Failed to fetch organization', error: error.message });
    }
});

module.exports = router;
