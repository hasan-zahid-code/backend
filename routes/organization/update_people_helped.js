const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

router.post('/update_people_helped', async (req, res) => {
  const { description, image, people_helped, donation_id } = req.body;

  if (!description || !people_helped || !donation_id) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Step 1: Check if feedback already exists
    const { data: existingFeedback, error: checkError } = await supabase
      .from('feedback')
      .select('id')
      .eq('donation_id', donation_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking feedback:', checkError.message);
      return res.status(500).json({ message: 'Error checking feedback' });
    }

    // Step 2: Get donor_id from donation
    const { data: donationData, error: donorError } = await supabase
      .from('donations')
      .select('donor_id')
      .eq('id', donation_id)
      .single();

    if (donorError || !donationData) {
      console.error('Error fetching donation:', donorError?.message);
      return res.status(404).json({ message: 'Donation not found' });
    }

    const donor_id = donationData.donor_id;

    // Step 3: Insert or Update
    if (existingFeedback) {
      // Update existing feedback
      const { error: updateError } = await supabase
        .from('feedback')
        .update({
          description,
          image,
          people_helped,
          donor_id,
        })
        .eq('donation_id', donation_id);

      if (updateError) {
        console.error('Error updating feedback:', updateError.message);
        return res.status(500).json({ message: 'Failed to update feedback' });
      }

      return res.status(200).json({ message: 'Feedback updated successfully' });
    } else {
      // Insert new feedback
      const { error: insertError } = await supabase
        .from('feedback')
        .insert([{
          description,
          image,
          people_helped,
          donation_id,
          donor_id,
        }]);

      if (insertError) {
        console.error('Error inserting feedback:', insertError.message);
        return res.status(500).json({ message: 'Failed to insert feedback' });
      }

      return res.status(200).json({ message: 'Feedback submitted successfully' });
    }
  } catch (error) {
    console.error('Unexpected error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
