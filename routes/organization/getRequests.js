// routes/organization/getRequests.js
const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

/**
 * @route GET /api/organization/:organizationId/requests
 * @desc Get all donation requests for a specific organization
 * @access Private (would typically be protected by auth middleware)
 */
router.get('/:organizationId/requests', async (req, res) => {
    const { organizationId } = req.params;

    // Request validation
    if (!organizationId) {
        console.error("❌ Missing organization ID");
        return res.status(400).json({ 
            success: false, 
            error: 'Organization ID is required' 
        });
    }

    console.log(`📌 Fetching donation requests for organization ID: ${organizationId}`);

    try {
        // Query the donations and related details from the database
        // Using Supabase query builder to get donation requests with related items
        
        // First, get all donation requests for this organization
        const { data: donationRequests, error: requestsError } = await supabase
            .from('donations')
            .select(`
                id,
                donor_id,
                status,
                created_at,
                updated_at,
                donation_items (
                    id,
                    type
                ),
                donor:donor_id (
                    fname,
                    lname,
                    phone,
                    location,
                    address
                )
            `)
            .eq('org_id', organizationId)
            .order('created_at', { ascending: false });

        if (requestsError) {
            console.error("❌ Error fetching donation requests:", requestsError);
            return res.status(500).json({ 
                success: false,
                error: 'Failed to fetch donation requests',
                details: requestsError
            });
        }

        // If no donation requests found, return empty array
        if (!donationRequests || donationRequests.length === 0) {
            console.log("ℹ️ No donation requests found for this organization");
            return res.status(200).json({ 
                success: true,
                requests: [] 
            });
        }

        // Get donation item details for each request
        const donationIds = donationRequests.map(request => request.id);
        const promises = [];

        // Get food donation details
        promises.push(
            supabase
                .from('food')
                .select('*')
                .in('donation_id', donationIds)
        );

        // Get clothes donation details
        promises.push(
            supabase
                .from('clothes')
                .select('*')
                .in('donation_id', donationIds)
        );

        // Execute both queries
        const [foodResult, clothesResult] = await Promise.all(promises);

        // Check for errors
        if (foodResult.error) {
            console.error("❌ Error fetching food donation details:", foodResult.error);
        }

        if (clothesResult.error) {
            console.error("❌ Error fetching clothes donation details:", clothesResult.error);
        }

        // Map the food and clothes data to their respective donations
        const foodMap = {};
        if (foodResult.data) {
            foodResult.data.forEach(food => {
                foodMap[food.donation_id] = food;
            });
        }

        const clothesMap = {};
        if (clothesResult.data) {
            clothesResult.data.forEach(clothes => {
                clothesMap[clothes.donation_id] = clothes;
            });
        }

        // Transform the data to match the DonationRequest model in the Flutter app
        const formattedRequests = donationRequests.map(request => {
            // Create full name from fname and lname
            const donorFullName = [
                request.donor?.fname || '',
                request.donor?.lname || ''
            ].filter(Boolean).join(' ') || 'Unknown Donor';
            
            // Determine donation type based on donation_items
            const donationTypes = request.donation_items?.map(item => item.type) || [];
            
            // Find the specific donation details (food or clothes)
            const foodDetails = foodMap[request.id];
            const clothesDetails = clothesMap[request.id];

            // Base data structure
            const formattedRequest = {
                id: request.id,
                donorId: request.donor_id,
                donorName: donorFullName,
                donorContact: request.donor?.phone || 'No contact provided',
                organizationId: organizationId,
                category: donationTypes.join(', ') || 'Unknown',
                item: '', // Will be set based on donation type
                quantity: '', // Will be set based on donation type
                description: '',
                location: request.donor?.location || request.donor?.address || 'Unknown location',
                requestDate: request.created_at,
                status: request.status || 'pending',
                images: [], // Would be populated from storage in a real implementation
                additionalDetails: {}
            };

            // Add food-specific details
            if (foodDetails) {
                formattedRequest.item = foodDetails.name || 'Food items';
                formattedRequest.quantity = foodDetails.qty || 'Not specified';
                formattedRequest.description = foodDetails.additional_comments || 'Food donation';
                formattedRequest.additionalDetails = {
                    food_type: foodDetails.type,
                    package_type: foodDetails.pkg_type,
                    expiration_date: foodDetails.exp_date
                };
            }

            // Add clothes-specific details
            if (clothesDetails) {
                formattedRequest.item = clothesDetails.type || 'Clothing items';
                formattedRequest.quantity = clothesDetails.qty || 'Not specified';
                formattedRequest.description = clothesDetails.additional_comments || 'Clothing donation';
                formattedRequest.additionalDetails = {
                    size: clothesDetails.size,
                    condition: clothesDetails.condition,
                    fabric_type: clothesDetails.fabric_type
                };
            }

            return formattedRequest;
        });

        console.log(`✅ Successfully fetched ${formattedRequests.length} donation requests`);
        
        // Return formatted requests
        return res.status(200).json({
            success: true,
            requests: formattedRequests
        });
        
    } catch (error) {
        console.error("❌ Unexpected error fetching donation requests:", error);
        
        return res.status(500).json({
            success: false,
            error: 'An unexpected error occurred while fetching donation requests',
            details: error.message || String(error)
        });
    }
});

module.exports = router;