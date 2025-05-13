const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

// GET /get_org_info?org_id=xxx
router.get('/get_org_info', async (req, res) => {
  const { org_id } = req.query;

  if (!org_id) {
    return res.status(400).json({ message: 'org_id parameter is required' });
  }

  try {
    // Fetch organization info
    const { data: orgData, error: orgError } = await supabase
      .from('organization')
      .select('description, address')
      .eq('id', org_id)
      .single();

    if (orgError) {
      console.error('❌ Error fetching organization:', orgError);
      return res.status(500).json({ message: 'Failed to fetch organization info', error: orgError });
    }

    if (!orgData) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Fetch bank details
    const { data: bankData, error: bankError } = await supabase
      .from('bank_details')
      .select('id, account_title, bank_name, account_number, iban')
      .eq('org_id', org_id);

    if (bankError) {
      console.error('❌ Error fetching bank details:', bankError);
      return res.status(500).json({ message: 'Failed to fetch bank details', error: bankError });
    }

    const formattedBankDetails = {};
    bankData.forEach(entry => {
      formattedBankDetails[entry.id] = {
        account_title: entry.account_title,
        bank_name: entry.bank_name,
        account_number: entry.account_number,
        iban: entry.iban
      };
    });

    return res.status(200).json({
      message: 'Organization info fetched successfully',
      data: {
        description: orgData.description,
        address: orgData.address,
        bank_details: formattedBankDetails
      }
    });
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
