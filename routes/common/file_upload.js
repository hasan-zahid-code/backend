const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

// Middleware to handle raw binary data
const router = express.Router();
router.use(express.raw({ type: 'application/octet-stream', limit: '50mb' })); // Adjust the limit as needed

// Endpoint to upload binary file
router.post('/file_upload', async (req, res) => {
    // Validate if the raw file data is in the request
    if (!req.body || req.body.length === 0) {
        return res.status(400).json({ message: 'File is required' });
    }

    try {
        const fileBuffer = req.body; // Binary data from request body
        const fileName = `donations/${Date.now()}.jpg`; // You can generate dynamic filenames here

        // Upload the file to Supabase storage (bucket 'giventake')
        const { data, error: uploadError } = await supabase.storage
            .from('giventake') // Your Supabase storage bucket
            .upload(fileName, fileBuffer);

        if (uploadError) {
            throw uploadError;
        }

        // Get the public URL of the uploaded file
        const fileUrl = supabase.storage.from('giventake').getPublicUrl(fileName).publicURL;

        // Return the file URL in the response
        res.status(200).json({ fileUrl: fileUrl });
    } catch (error) {
        res.status(500).json({ message: 'Failed to upload file', error: error.message });
    }
});

module.exports = router;
