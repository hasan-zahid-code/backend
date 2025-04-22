const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

// Endpoint to add food details
router.post('/donation_items', async (req, res) => {
    const { donation_id, type } = req.body;

    // Validate required fields
    if (!donation_id || !type) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Insert food details into the "food" table
        const { data, error } = await supabase.from('donation_items').insert([
            {
                donation_id, 
                type
            }
        ]);

        if (error) {
            throw error;
        }

        res.status(201).json({ message: 'Donation Items added successfully', data });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add donation item', error: error.message });
    }
});

module.exports = router;
