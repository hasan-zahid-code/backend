const express = require('express');
const supabase = require('../../supabaseClient');
const { createNotification } = require('./notificationService.js');

const router = express.Router();

router.post('/request', async (req, res) => {
  const { donation_id, status, created_at } = req.body;

  // Validate input
  if (!donation_id || !status || !created_at) {
    return res.status(400).json({ 
      message: 'donation_id, status, and created_at are required' 
    });
  }

  const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';

  if (!['accepted', 'rejected'].includes(normalizedStatus)) {
    return res.status(400).json({ 
      message: 'Status must be either "accepted" or "rejected"' 
    });
  }

  try {
    console.log("🔄 Updating donation and creating notification...");

    // Update donation status
    const { error: updateError, data: updatedDonation } = await supabase
      .from('donations')
      .update({ 
        status: normalizedStatus.charAt(0) + normalizedStatus.slice(1) 
      })
      .eq('created_at', created_at)
      .select('*')
      .single();

    if (updateError) {
      console.error("❌ Failed to update donation:", updateError);
      return res.status(500).json({ 
        message: 'Failed to update donation',
        details: updateError.message || updateError 
      });
    }

    if (!updatedDonation) {
      return res.status(404).json({ 
        message: 'No donation found with the specified created_at' 
      });
    }

    // Create a notification for the donor
    const notificationMessage = `Your donation has been ${normalizedStatus}.`;
    const notification = await createNotification({
      type: 'donation',
      user_type: 'donor',
      message: notificationMessage,
      status: 'unread',
      recipient_id: updatedDonation.donor_id,
      metadata: {
        donation_id,
        message: notificationMessage,
        original_status: normalizedStatus,
        donation_created_at: created_at
      }
    });

    return res.status(200).json({
      message: `Donation ${normalizedStatus} and notification sent.`,
      donation: updatedDonation,
      notification
    });

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return res.status(500).json({
      message: 'An unexpected error occurred',
      error: err.message || err
    });
  }
});

module.exports = router;
