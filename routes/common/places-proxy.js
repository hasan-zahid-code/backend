
const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config(); // For loading API key from .env file

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Place Autocomplete endpoint
router.get('/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;
    
    // Validate input
    if (!input) {
      return res.status(400).json({ error: 'Input parameter is required' });
    }
    
    // Optional parameters
    const components = req.query.components || 'country:pk'; // Default to Pakistan
    
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=${encodeURIComponent(components)}&key=${API_KEY}`;
    
    const response = await axios.get(url);
    
    // Forward the response from Google
    res.json(response.data);
  } catch (error) {
    console.error('Error in Place Autocomplete:', error.message);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Place Details endpoint
router.get('/details', async (req, res) => {
  try {
    const { place_id } = req.query;
    
    // Validate place_id
    if (!place_id) {
      return res.status(400).json({ error: 'place_id parameter is required' });
    }
    
    // Fields to fetch (can be customized)
    const fields = req.query.fields || 'address_component,formatted_address,geometry';
    
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&key=${API_KEY}`;
    
    const response = await axios.get(url);
    
    // Forward the response from Google
    res.json(response.data);
  } catch (error) {
    console.error('Error in Place Details:', error.message);
    res.status(500).json({ error: 'Failed to fetch place details' });
  }
});

module.exports = router;