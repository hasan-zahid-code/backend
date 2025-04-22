const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

// Endpoint to add food details
router.post('/add-food', async (req, res) => {
    const { name, type, qty, pkg_type, exp_date, donation_id, donation_item_id,  additional_comments} = req.body;

    // Validate required fields
    if (!id || !name || !qty || !exp_date || !type || !pkg_type) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Insert food details into the "food" table
        const { data, error } = await supabase.from('food').insert([
            {
                id,
                name,
                qty,
                exp_date,
                additional_comments,
                type,
                pkg_type,
                donation_id,
                donation_item_id

            }
        ]);

        if (error) {
            throw error;
        }

        res.status(201).json({ message: 'Food details added successfully', data });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add food details', error: error.message });
    }
});

module.exports = router;
