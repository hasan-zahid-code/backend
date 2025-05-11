const express = require('express');
const supabase = require('../../supabaseClient');
const router = express.Router();

router.get('/get_notification_description', async (req, res) => {
  const { user_type, donation_id } = req.query;

  // Validate query parameters
  if (!user_type || !donation_id) {
    return res.status(400).json({ message: 'user_type and donation_id are required' });
  }

  try {
    let response = {};

    if (user_type === 'donor') {
      // Fetch donation item type and organization name for donor
      const { data, error } = await supabase
        .from('donations')
        .select('id, org_id')
        .eq('id', donation_id)
        .single();

      if (error || !data) {
        console.error('❌ Error fetching donation:', error);
        return res.status(404).json({ message: 'Donation not found' });
      }

      const { org_id } = data;

      // Fetch donation items (type)
      const { data: donationItems, error: itemsError } = await supabase
        .from('donation_items')
        .select('type')
        .eq('donation_id', donation_id);

      if (itemsError || !donationItems || donationItems.length === 0) {
        console.error('❌ Error fetching donation items:', itemsError);
        return res.status(404).json({ message: 'Donation items not found' });
      }

      const type = donationItems.map(item => item.type).join(', ');

      // Fetch organization name
      const { data: organization, error: orgError } = await supabase
        .from('organization')
        .select('name')
        .eq('id', org_id)
        .single();

      if (orgError || !organization) {
        console.error('❌ Error fetching organization:', orgError);
        return res.status(404).json({ message: 'Organization not found' });
      }

      response.organization_name = organization.name;
      response.donation_type = type;
    } else if (user_type === 'organization') {
      // Fetch donation item type and donor's full name for organization
      const { data, error } = await supabase
        .from('donations')
        .select('id, donor_id')
        .eq('id', donation_id)
        .single();

      if (error || !data) {
        console.error('❌ Error fetching donation:', error);
        return res.status(404).json({ message: 'Donation not found' });
      }

      const { donor_id } = data;

      // Fetch donation items (type)
      const { data: donationItems, error: itemsError } = await supabase
        .from('donation_items')
        .select('type')
        .eq('donation_id', donation_id);

      if (itemsError || !donationItems || donationItems.length === 0) {
        console.error('❌ Error fetching donation items:', itemsError);
        return res.status(404).json({ message: 'Donation items not found' });
      }

      const type = donationItems.map(item => item.type).join(', ');

      // Fetch donor's full name
      const { data: donor, error: donorError } = await supabase
        .from('donor')
        .select('fname, lname')
        .eq('id', donor_id)
        .single();

      if (donorError || !donor) {
        console.error('❌ Error fetching donor:', donorError);
        return res.status(404).json({ message: 'Donor not found' });
      }

      response.donor_name = `${donor.fname} ${donor.lname}`;
      response.donation_type = type;
    } else {
      return res.status(400).json({ message: 'Invalid user_type' });
    }

    // Return only the last two parameters: organization_name/donor_name and donation_type
    return res.status(200).json({
      message: 'Notification description retrieved successfully',
      data: {
        name: user_type === 'donor' ? response.organization_name : response.donor_name,
        donation_type: response.donation_type,
      },
    });

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
