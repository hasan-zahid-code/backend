const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

// POST endpoint to create a new bank detail
router.post('/update_bank_details', async (req, res) => {
    const {
        account_title,
        bank_name,
        account_number,
        iban,
        org_id
    } = req.body;

    console.log('[POST] /create_bank_detail - body:', req.body);

    // Validate all fields (none should be null or undefined)
    if (!account_title || !bank_name || !account_number || !iban || !org_id) {
        console.error('Missing one or more required fields');
        return res.status(400).json({
            message: 'All fields (account_title, bank_name, account_number, iban, org_id) are required'
        });
    }

    try {
        console.log('Inserting bank detail into Supabase');

        const { data, error } = await supabase
            .from('bank_details')
            .insert([
                {
                    account_title,
                    bank_name,
                    account_number,
                    iban,
                    org_id
                }
            ])
            .select()
            .single(); // Return the inserted object

        if (error) {
            console.error('Supabase insert error:', error.message);
            throw error;
        }

        console.log('Bank detail inserted successfully:', data.id);

        res.status(201).json({ message: 'Bank detail created successfully', data });
    } catch (error) {
        console.error('Unhandled error while inserting bank detail:', error);
        res.status(500).json({ message: 'Failed to create bank detail', error: error.message });
    }
});

module.exports = router;
