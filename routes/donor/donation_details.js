const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

router.get('/donation-details', async (req, res) => {
  const { donationId } = req.query;

  console.log('GET /donation-details called with:', { donationId });

  if (!donationId) {
    console.warn('Missing donationId');
    return res.status(400).json({ message: 'donationId is required' });
  }

  try {
    // 1. Get donation with org + donation items
    const { data, error } = await supabase
      .from('donations')
      .select(`
        *,
        organisation (
          name,
          image_url
        ),
        donation_items (
          id,
          type
        )
      `)
      .eq('id', donationId);

    if (error) {
      console.error('Supabase query error:', error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const donation = data[0];

    // 2. Fetch extra data based on item types
    const enrichedItems = await Promise.all(
      donation.donation_items.map(async (item) => {
        let tableName;

        // determine which table to query
        switch (item.type) {
          case 'food':
            tableName = 'food';
            break;
          case 'clothes':
            tableName = 'clothes';
            break;
          case 'other':
            tableName = 'other';
            break;
          default:
            return { ...item, details: null };
        }

        const { data: extraData, error: extraError } = await supabase
          .from(tableName)
          .select('*')
          .eq('donation_item_id', item.id) // assumes foreign key to donation_items

        if (extraError) {
          console.warn(`Failed to fetch from ${tableName} for item ${item.id}:`, extraError.message);
        }

        return {
          ...item,
          details: extraData || null,
        };
      })
    );

    // Replace donation_items with enriched version
    donation.donation_items = enrichedItems;

    console.log(`Fetched donation with ID "${donationId}"`);

    res.status(200).json({
      message: 'Donation details fetched successfully',
      data: donation,
    });
  } catch (error) {
    console.error('Error fetching donation details:', error.message);
    res.status(500).json({ message: 'Failed to fetch donation details', error: error.message });
  }
});

module.exports = router;
