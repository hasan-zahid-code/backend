const express = require("express");
const supabase = require("../../supabaseClient");
require("dotenv").config();

const router = express.Router();

router.get("/profile/:id", async (req, res) => {
    const { id } = req.params;
    console.log("\n🔹 [Fetch profile attempt]", id);

    try {
        // Fetch user data from the 'users' table
        const { data: userData, error: uError } = await supabase
            .from('users')
            .select('id, email, user_type')
            .eq('id', id)
            .single();

        if (uError) {
            console.error(uError);
            return res.status(400).json({
                success: false,
                error: uError.message || 'Failed to fetch user data'
            });
        }

        // If user data exists, fetch additional profile data based on user_type
        if (userData) {
            const { data: profileData, error: pError } = await supabase
                .from(userData.user_type) 
                .select('*') 
                .eq('user_id', id)
                .single();

            if (pError) {
                console.error(pError);
                return res.status(400).json({
                    success: false,
                    error: pError.message || 'Failed to fetch profile data'
                });
            }

            // Combine the user data and profile data into one response
            const combinedData = { ...userData, ...profileData };

            return res.status(200).json({
                success: true,
                data: combinedData
            });
        }

        return res.status(404).json({
            success: false,
            error: 'User not found'
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            error: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
