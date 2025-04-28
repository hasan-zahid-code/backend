const express = require("express");
const supabase = require("../../supabaseClient");
require("dotenv").config();

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("\n🔹 [Login Attempt] Email:", email);

  if (!email || !password) {
    console.warn("⚠️ [Validation Error] Missing email or password");
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Step 1: Authenticate using Supabase Auth
    console.log("🔐 [Step 1] Authenticating with Supabase Auth...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error("⛔ [Auth Error] Supabase Auth failed:", authError.message);
      return res.status(401).json({ message: authError.message });
    }

    console.log("✅ [Supabase Auth Successful] User ID:", authData.user.id);

    // Step 2: Fetch user from `users` table
    console.log("🔍 [Step 2] Fetching user profile from 'users' table...");
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("id, email, user_type")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError || !userProfile) {
      console.error("⛔ [DB Error] Failed to fetch user profile:", profileError?.message);
      return res.status(500).json({ message: "User profile not found" });
    }

    console.log("✅ [User Profile Found] Type:", userProfile.user_type);

    // Step 3: Fetch role-specific details
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
      console.log(`🔍 [Step 3] Fetching additional details from '${roleTable}' table...`);
      const { data, error } = await supabase
        .from(roleTable)
        .select("*")
        .eq("user_id", userProfile.id)
        .maybeSingle();

      if (error) {
        console.error(`⛔ [DB Error] Failed to fetch ${userProfile.user_type} details:`, error.message);
      } else if (data) {
        // console.log(`✅ [${userProfile.user_type} Data Fetched]`, data);
        roleData = data;
      }
    }

    // Step 4: Return the token received from Supabase Auth
    console.log("[Login Successful]", { ...userProfile, ...roleData }, authData.session);
    res.status(200).json({
      message: "Login successful",
      user: { ...userProfile, ...roleData },
      session: authData.session,  // includes access_token, refresh_token, expires_in, etc.
    });
  } catch (error) {
    console.error("[Unexpected Error] Login failed:", error.message);
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
});

module.exports = router;
