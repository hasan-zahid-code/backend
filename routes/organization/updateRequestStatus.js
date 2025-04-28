const express = require('express');
const supabase = require('../../supabaseClient');
const { createNotification } = require('./notificationService.js');

const router = express.Router();

router.post('/request', async (req, res) => {
  console.log("update request status hit ", req.body);
  const { donation_id, status } = req.body;

  // Validate input
  if (!donation_id || !status) {
    return res.status(400).json({ 
      message: 'donation_id and status are required' 
    });
  }

  if (!['in_progress', 'rejected', 'cancelled', 'picked_up', 'completed'].includes(status)) {
    return res.status(400).json({ 
      message: 'Status must be in_progress, rejected, cancelled, picked_up or completed' 
    });
  }

  try {
    console.log("🔄 Updating donation and creating notification...");

    // Update donation status
    const { error: updateError, data: updatedDonation } = await supabase
      .from('donations')
      .update({ 
        status: status
      })
      .eq('id', donation_id)
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
        message: 'No donation found with the specified donation_id' 
      });
    }

    // Create a notification for the donor
    const notificationMessage = `Your donation has been ${status}.`;
    const notification = await createNotification({
      type: 'donation',
      user_type: 'donor',
      message: notificationMessage,
      status: 'unread',
      recipient_id: updatedDonation.donor_id,
      metadata: {
        donation_id,
        message: notificationMessage,
        donation_status: status
      }
    });

    return res.status(200).json({
      message: `Donation ${status} and notification sent.`,
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
