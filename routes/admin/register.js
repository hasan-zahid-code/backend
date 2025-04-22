const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Admin Registration Route
router.post('/register', async (req, res) => {
    const { email, password, admin_secret } = req.body;

    // Validate input
    if (!email || !password || !admin_secret) {
        return res.status(400).json({ message: 'Email, password, and admin secret are required' });
    }

    // Check if the provided admin secret is correct
    if (admin_secret !== ADMIN_SECRET) {
        return res.status(403).json({ message: 'Invalid admin secret' });
    }

    try {
        // Check if admin already exists
        const { data: existingAdmin, error: fetchError } = await supabase
            .from('role')
            .select('*')
            .eq('email', email)
            .single();

        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new admin into the role table
        const { data, error } = await supabase
            .from('role')
            .insert([{ email, password: hashedPassword, role: 'admin' }]);

        if (error) {
            console.error('Supabase Error:', error);
            return res.status(500).json({ message: 'Error registering admin' });
        }

        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
