const express = require('express');
const supabase = require('../../supabaseClient');

const router = express.Router();

// POST /update_organization_info
router.post('/update_organization_info', async (req, res) => {
  const { org_id, description, address, registration_document, bankDetails } = req.body;

  if (!org_id) {
    return res.status(400).json({ message: 'org_id is required' });
  }

  try {
    // --- Update organization details if provided ---
    const updateFields = {};
    if (description !== undefined) updateFields.description = description;
    if (address !== undefined) updateFields.address = address;
    if (registration_document !== undefined) updateFields.registration_document = registration_document;

    if (Object.keys(updateFields).length > 0) {
      const { error: orgUpdateError } = await supabase
        .from('organization')
        .update(updateFields)
        .eq('id', org_id);

      if (orgUpdateError) {
        console.error('❌ Error updating organization:', orgUpdateError);
        return res.status(500).json({ message: 'Failed to update organization details', error: orgUpdateError });
      }
    }

    // --- Insert bank details if provided ---
    if (bankDetails !== undefined) {
      if (!Array.isArray(bankDetails) || bankDetails.length === 0) {
        return res.status(400).json({ message: 'bankDetails must be a non-empty array if provided' });
      }

      for (const entry of bankDetails) {
        const { account_title, account_number, bank_name, iban } = entry;
        if (!account_title || !account_number || !bank_name || !iban) {
          return res.status(400).json({
            message: 'Each bank detail must include account_title, account_number, bank_name, and iban',
          });
        }
      }

      // Inject org_id into all entries
      const bankDetailsWithOrgId = bankDetails.map(detail => ({ ...detail, org_id }));

      const { error: bankError } = await supabase
        .from('bank_details')
        .insert(bankDetailsWithOrgId);

      if (bankError) {
        console.error('❌ Error inserting bank details:', bankError);
        return res.status(500).json({ message: 'Failed to insert bank details', error: bankError });
      }
    }

    return res.status(200).json({ message: 'Organization info updated successfully' });
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
  }
});

module.exports = router;
