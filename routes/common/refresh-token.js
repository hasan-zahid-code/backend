const express = require("express");
const supabase = require("../../supabaseClient");
require("dotenv").config();

const router = express.Router();

// POST /api/refresh-token
router.post("/refresh-token", async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession({ refresh_token });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      user: session.user,
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
