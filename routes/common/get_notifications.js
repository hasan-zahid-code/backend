const express = require('express');
const supabase = require('../../supabaseClient');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const router = express.Router();

// Reusable helper function for donation description enrichment
async function fetchDonationDescription(user_type, donation_id) {
  let response = {};

  if (user_type === 'donor') {
    const { data: donationData, error: donationError } = await supabase
      .from('donations')
      .select('id, org_id')
      .eq('id', donation_id)
      .single();

    if (donationError || !donationData) {
      console.warn(`⚠️ Donation not found for donor, ID: ${donation_id}`);
      return {};
    }

    const { org_id } = donationData;

    const { data: donationItems, error: itemsError } = await supabase
      .from('donation_items')
      .select('type')
      .eq('donation_id', donation_id);

    if (itemsError || !donationItems || donationItems.length === 0) {
      console.warn(`⚠️ Donation items not found for ID: ${donation_id}`);
      return {};
    }

    const type = donationItems.map(item => item.type).join(', ');

    const { data: organization, error: orgError } = await supabase
      .from('organization')
      .select('name')
      .eq('id', org_id)
      .single();

    if (orgError || !organization) {
      console.warn(`⚠️ Organization not found for org_id: ${org_id}`);
      return {};
    }

    response.name = organization.name;
    response.donation_type = type;

  } else if (user_type === 'organization') {
    const { data: donationData, error: donationError } = await supabase
      .from('donations')
      .select('id, donor_id')
      .eq('id', donation_id)
      .single();

    if (donationError || !donationData) {
      console.warn(`⚠️ Donation not found for organization, ID: ${donation_id}`);
      return {};
    }

    const { donor_id } = donationData;

    const { data: donationItems, error: itemsError } = await supabase
      .from('donation_items')
      .select('type')
      .eq('donation_id', donation_id);

    if (itemsError || !donationItems || donationItems.length === 0) {
      console.warn(`⚠️ Donation items not found for ID: ${donation_id}`);
      return {};
    }

    const type = donationItems.map(item => item.type).join(', ');

    const { data: donor, error: donorError } = await supabase
      .from('donor')
      .select('fname, lname')
      .eq('id', donor_id)
      .single();

    if (donorError || !donor) {
      console.warn(`⚠️ Donor not found for donor_id: ${donor_id}`);
      return {};
    }

    response.name = `${donor.fname} ${donor.lname}`;
    response.donation_type = type;
  }

  return response;
}

router.get('/get_notifications', async (req, res) => {
  const { recipient_id } = req.query;

  if (!recipient_id) {
    return res.status(400).json({ message: 'recipient_id is required' });
  }

  try {
    const { data, error } = await supabase
      .from('notification')
      .select('id, type, user_type, status, message, metadata, created_at')
      .eq('recipient_id', recipient_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      return res.status(500).json({ message: 'Failed to fetch notifications', error });
    }

    const enrichedNotifications = await Promise.all(
      data.map(async (notification) => {

        const donation_id = (() => {
          try {
            return JSON.parse(notification.metadata)?.donation_id;
          } catch {
            return null;
          }
        })();

        const base = {
          id: notification.id,
          type: notification.type,
          user_type: notification.user_type,
          status: notification.status,
          message: notification.message,
          metadata: notification.metadata, // raw string
          time_ago: dayjs(notification.created_at).fromNow(),
          time_formatted: dayjs(notification.created_at).format('MMMM D, h:mm A')
        };

        if (!donation_id || !notification.user_type) {
          console.warn(`⚠️ Skipping enrichment for notification ${notification.id} due to missing donation_id or user_type`);
          return base;
        }

        const enrichment = await fetchDonationDescription(notification.user_type, donation_id);
        return {
          ...base,
          ...enrichment,
        };
      })
    );

    return res.status(200).json({
      message: 'Notifications retrieved successfully',
      data: enrichedNotifications,
    });

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
