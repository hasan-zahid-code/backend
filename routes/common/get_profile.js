const express = require("express");
const supabase = require("../../supabaseClient");
require("dotenv").config();

const router = express.Router();

router.get("/profile/:id", async (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "") || req.query.token;


    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authorization token missing"
        });
    }

    try {
        // Step 1: Validate token and get session user
        const {
            data: { user: authUser },
            error: authError,
        } = await supabase.auth.getUser(token);

        if (authError || !authUser) {
            console.error(authError || "Invalid token");
            return res.status(401).json({
                success: false,
                message: authError?.message || "Invalid or expired token",
            });
        }

        // Step 2: Fetch basic user profile
        const { data: userProfile, error: uError } = await supabase
            .from("users")
            .select("id, email, user_type")
            .eq("id", id)
            .maybeSingle();

        if (uError || !userProfile) {
            console.error("⛔ [DB Error] Failed to fetch user profile:", uError?.message);
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        // Step 3: Fetch role-specific data
        let roleTable;
        if (userProfile.user_type === "donor") {
            roleTable = "donor";
        } else if (userProfile.user_type === "organization") {
            roleTable = "organization";
        } else if (userProfile.user_type === "admin") {
            roleTable = "admin";
        }

        let roleData = {};
        if (roleTable) {
            const { data, error } = await supabase
                .from(roleTable)
                .select("*")
                .eq("user_id", userProfile.id)
                .maybeSingle();

            if (error) {
                console.error(`⛔ [DB Error] Failed to fetch ${userProfile.user_type} details:`, error.message);
            } else if (data) {
                roleData = data;
            }
        }

        // Step 4: Return unified structure like login
        return res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            user: {
                ...userProfile,
                ...roleData,
            },
            session: authUser,
        });
    } catch (err) {
        console.error("[Unexpected Error] Profile fetch failed:", err.message);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred",
            error: err.message
        });
    }
});

module.exports = router;
