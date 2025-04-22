const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

/**
 * GET /donation-requests/:requestId/status
 * Fetch the current status of a donation request by ID
 */
router.get('/donation-requests/:requestId/status', async (req, res) => {
  const { requestId } = req.params;
  if (!requestId) {
    return res.status(400).json({
      message: 'Request ID is required'
    });
  }

  try {
    const { data, error } = await supabase
      .from('donations')
      .select('id, status')
      .eq('id', requestId)
      .single();

    if (error) {
      console.error('❌ Failed to fetch donation status:', error);
      return res.status(500).json({
        message: 'Failed to fetch donation status',
        details: error.message || error
      });
    }

    if (!data) {
      return res.status(404).json({
        message: 'Donation not found'
      });
    }
    console.log("get request status hit ", data.id, data.status);

    return res.status(200).json({
      donation_id: data.id,
      status: data.status
    });
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({
      message: 'An unexpected error occurred',
      error: err.message || err
    });
  }
});

module.exports = router;
