const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

// GET endpoint to fetch all organizations
router.get('/get_organisations', async (req, res) => {
    try {
        // Fetch all organization records from the database
        const { data, error } = await supabase
            .from('organisation')
            .select('*');

        if (error) {
            throw error;
        }

        res.status(200).json({ message: 'Organisations retrieved successfully', data });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch organisations', error: error.message });
    }
});

module.exports = router;
