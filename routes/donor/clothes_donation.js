const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

// Endpoint to add food details
router.post('/add-clothes', async (req, res) => {
    const { id, type, size, condition, fabric_type,  qty, donation_id, donation_item_id, additional_comments} = req.body;

    // Validate required fields
    if (!id ||  !qty || !size || !type || !fabric_type || !condition) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Insert food details into the "food" table
        const { data, error } = await supabase.from('clothes').insert([
            {
                id,
                qty,
                additional_comments,
                type,
                fabric_type,
                size,
                condition,
                donation_id,
                donation_item_id

            }
        ]);

        if (error) {
            throw error;
        }

        res.status(201).json({ message: 'Clothes detail added successfully', data });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add clothes detail', error: error.message });
    }
});

module.exports = router;
