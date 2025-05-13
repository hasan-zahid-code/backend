const express = require("express");
const supabase = require("../../supabaseClient");
require("dotenv").config();

const router = express.Router();

router.post("/change-password", async (req, res) => {
  const { current_password, new_password } = req.body;
  const token = req.headers.authorization?.replace("Bearer ", "");

  console.log("🔐 Incoming /change-password request");
  console.log("🟡 Body:", req.body);

  if (!token) {
    console.error("❌ Unauthorized: No token provided");
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    // Get current user using the access token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("❌ Error getting user from token:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    console.log("✅ User fetched:", user.email);

    // (Optional) Re-authenticate
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    });

    if (signInError) {
      console.error("❌ Re-authentication failed:", signInError.message);
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    console.log("🔐 Current password verified");

    // Update password
    const { error: updateError } = await supabase.auth.updateUser(
      { password: new_password },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (updateError) {
      console.error("❌ Password update failed:", updateError.message);
      return res.status(400).json({ error: updateError.message });
    }

    console.log("✅ Password updated successfully");
    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("❌ Unexpected server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
