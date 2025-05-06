const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();
router.get('/:organizationId/requests', async (req, res) => {
    const { organizationId } = req.params;

    if (!organizationId) {
        return res.status(400).json({ success: false, error: 'Organization ID is required' });
    }

    try {
        const { data: donationRequests, error: requestsError } = await supabase
            .from('donations')
            .select(`
                id,
                donor_id,
                status,
                location,
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
                    address,
                    image_url
                )
            `)
            .eq('org_id', organizationId)
            .order('created_at', { ascending: false });

        if (requestsError) {
            return res.status(500).json({ success: false, error: 'Failed to fetch donation requests', details: requestsError });
        }

        if (!donationRequests || donationRequests.length === 0) {
            return res.status(200).json({ success: true, requests: [] });
        }

        // 🔥 Filter to only include requests with "food" or "clothes" items
        const filteredRequests = donationRequests.filter(request =>
            request.donation_items?.some(item => item.type === 'food' || item.type === 'clothes')
        );

        if (filteredRequests.length === 0) {
            return res.status(200).json({ success: true, requests: [] });
        }

        const donationIds = filteredRequests.map(request => request.id);

        const [foodResult, clothesResult] = await Promise.all([
            supabase.from('food').select('*').in('donation_id', donationIds),
            supabase.from('clothes').select('*').in('donation_id', donationIds)
        ]);

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

        const formattedRequests = filteredRequests.map(request => {
            const donorFullName = [request.donor?.fname, request.donor?.lname].filter(Boolean).join(' ') || 'Unknown Donor';
            const donationTypes = request.donation_items?.map(item => item.type) || [];

            const formattedRequest = {
                id: request.id,
                status: request.status,
                donor: {
                    id: request.donor_id,
                    name: donorFullName,
                    contact: request.donor?.phone,
                    image_url: request.donor?.image_url || ''
                },
                location: request.location?? {},
                donationTypes: donationTypes,
                donationItems: [] // To store multiple donation items
            };

            // Iterate through donation_items and map each one
            request.donation_items.forEach(item => {
                const itemDetails = item.type === 'food' ? foodMap[request.id] : clothesMap[request.id];

                const formattedItem = {
                    type: item.type,
                    description: itemDetails?.additional_comments || 'No description provided',
                    quantity: itemDetails?.qty || 'Not specified',
                    images: itemDetails?.image_urls || [],
                    additionalDetails: {}
                };

                if (item.type === 'food' && itemDetails) {
                    formattedItem.additionalDetails = {
                        name: itemDetails.name,
                        food_type: itemDetails.type,
                        package_type: itemDetails.pkg_type,
                        expiration_date: itemDetails.exp_date,
                        unit: itemDetails.unit,
                        storage: itemDetails.storage
                    };
                }

                if (item.type === 'clothes' && itemDetails) {
                    formattedItem.additionalDetails = {
                        type: itemDetails.type,
                        size: itemDetails.size,
                        condition: itemDetails.condition,
                        fabric_type: itemDetails.fabric_type
                    };
                }

                formattedRequest.donationItems.push(formattedItem);
            });

            return formattedRequest;
        });
        // console.log("✅ Donation requests fetched successfully:", formattedRequests);

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
