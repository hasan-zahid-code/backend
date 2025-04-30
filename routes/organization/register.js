const express = require("express");
const supabase = require("../../supabaseClient");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const router = express.Router();

router.post("/register", async (req, res) => {
  const {
    email,
    password,
    name,
    license_no,
    type,
    mission_statement,
    mission_scope,
    donations_accepted,
    phone,
    registration_document,
  } = req.body;

  const missingFields = [];
  if (!phone) missingFields.push("phone");
  if (!name) missingFields.push("name");
  if (!email) missingFields.push("email");
  if (!password) missingFields.push("password");
  if (!license_no) missingFields.push("license_no");

  if (missingFields.length > 0) {
    console.error(
      "Validation error: Missing fields:",
      missingFields.join(", ")
    );
    return res.status(400).json({
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  try {
    // Check if license number already exists
    const { data: existingOrg, error: orgError } = await supabase
      .from("organization")
      .select("id")
      .eq("license_no", license_no)
      .maybeSingle();

    if (orgError) throw orgError;
    if (existingOrg) {
      return res
        .status(400)
        .json({ message: "License number already registered" });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone,
          user_type: "organization",
        },
      },
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // Insert into `users` table
    const { error: userInsertError } = await supabase.from("users").insert([
      {
        id: userId,
        email,
        password,
        phone,
        full_name: name,
        user_type: "organization",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    if (userInsertError) throw userInsertError;

    // Insert into `organization` table
    const { error: orgInsertError } = await supabase
      .from("organization")
      .insert([
        {
          user_id: userId,
          name,
          license_no,
          type,
          mission_statement,
          mission_scope,
          donations_accepted,
          phone,
          registration_document: registration_document || null,
          status: "pending",
        },
      ]);

    if (orgInsertError) {
      // Rollback user creation
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from("users").delete().eq("id", userId);
      throw orgInsertError;
    }

    res.status(201).json({
      message: "Organization registered successfully",
      user_id: userId,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({
      message: "Registration failed",
      error: error.message || "Unknown error occurred",
    });
  }
});

module.exports = router;
