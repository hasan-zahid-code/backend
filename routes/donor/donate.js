const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

router.post('/donate', async (req, res) => {
    // Extract the data from the new payload structure
    const { donor_id, org_id, status, donation_date, donation_items, food, clothes } = req.body;
    let donation_id = null;
    
    console.log({ donor_id, org_id, status, donation_date, donation_items });
    
    // Validate required fields
    if (!donor_id || !org_id || !status) {
        console.error("❌ Missing required fields:", { donor_id, org_id, status });
        return res.status(400).json({ message: 'Donor ID, Org ID, and Status are required' });
    }

    // Check if we have donation items (either in donation_items array or in food/clothes properties)
    const hasDonationItems = (donation_items && donation_items.length > 0) || 
                            (food && food.forms && food.forms.length > 0) || 
                            (clothes && clothes.forms && clothes.forms.length > 0);
    
    if (!hasDonationItems) {
        console.error("❌ No donation items provided");
        return res.status(400).json({ message: 'At least one donation item is required' });
    }

    console.log("✅ Starting donation process...", { donor_id, org_id });
    console.log("📊 Request payload:", JSON.stringify(req.body, null, 2));

    try {
        // Insert donation record
        const { data: donationData, error: donationError } = await supabase
            .from('donations')
            .insert([{ 
                donor_id, 
                org_id, 
                status,
                created_at:donation_date
            }])
            .select('*')
            .single();

        if (donationError) {
            console.error("❌ Donation insert failed:", donationError);
            return res.status(500).json({
                message: 'Failed to insert donation record',
                error: donationError.message || donationError,
                code: donationError.code,
                details: donationError.details
            });
        }

        if (!donationData) {
            console.error("❌ No donation data returned after insertion");
            return res.status(500).json({ message: 'No donation data returned after insertion' });
        }

        donation_id = donationData.id;

        if (!donation_id) {
            console.error("❌ Donation ID is missing after successful insertion", donationData);
            return res.status(500).json({
                message: 'Donation ID is missing after insertion',
                data: donationData
            });
        }

        console.log(`✅ Donation inserted successfully. Generated donation_id: ${donation_id}`);

        const rollbackDonation = async (reason) => {
            if (!donation_id) return;

            console.log(`🔄 Rolling back donation record ${donation_id} due to: ${reason}`);
            const { error: rollbackError } = await supabase
                .from('donations')
                .delete()
                .eq('id', donation_id);

            if (rollbackError) {
                console.error(`⚠️ Failed to rollback donation ${donation_id}:`, rollbackError);
            } else {
                console.log(`✅ Successfully rolled back donation ${donation_id}`);
            }
        };

        // Process donation items 
        // First, determine which categories to process based on either donation_items array or direct food/clothes properties
        const categories = [];
        
        // If using donation_items array
        if (donation_items && Array.isArray(donation_items)) {
            donation_items.forEach(item => {
                if (item.category && !categories.includes(item.category)) {
                    categories.push(item.category);
                }
            });
        }
        
        // Also check direct food/clothes properties for backward compatibility
        if (food && food.forms && food.forms.length > 0 && !categories.includes('food')) {
            categories.push('food');
        }
        
        if (clothes && clothes.forms && clothes.forms.length > 0 && !categories.includes('clothes')) {
            categories.push('clothes');
        }

        // Insert donation_items records
        let insertedDonationItems = categories.map(category => ({ donation_id, type: category }));
        
        if (insertedDonationItems.length === 0) {
            console.error("❌ No valid donation item categories found");
            await rollbackDonation('no valid donation item categories');
            return res.status(400).json({ message: 'No valid donation item categories found' });
        }

        const { data: donationItemData, error: donationItemError } = await supabase
            .from('donation_items')
            .insert(insertedDonationItems)
            .select('*');

        if (donationItemError) {
            console.error("❌ Donation item insert failed:", donationItemError);
            await rollbackDonation('donation item insertion failure');

            return res.status(500).json({
                message: 'Failed to insert donation items',
                error: donationItemError.message || donationItemError,
                code: donationItemError.code,
                details: donationItemError.details
            });
        }

        if (!donationItemData || donationItemData.length === 0) {
            console.error("❌ No donation item data returned after insertion");
            await rollbackDonation('missing donation item data');
            return res.status(500).json({ message: 'No donation item data returned after insertion' });
        }

        const donationItemMap = {};
        donationItemData.forEach(item => {
            if (item && item.id && item.type) {
                donationItemMap[item.type] = item.id;
            } else {
                console.warn("⚠️ Invalid donation item returned:", item);
            }
        });

        // Validate that we have IDs for all expected categories
        const missingCategories = categories.filter(category => !donationItemMap[category]);
        if (missingCategories.length > 0) {
            console.error("❌ Missing expected donation item IDs", {
                expected: categories,
                received: Object.keys(donationItemMap)
            });
            await rollbackDonation('missing expected donation item IDs');

            return res.status(500).json({
                message: 'Missing expected donation item IDs after insertion',
                expected: categories,
                missing: missingCategories
            });
        }

        let insertFailures = [];

        // Process food items from either donation_items array or direct food property
        const foodForms = [];
        if (donation_items && Array.isArray(donation_items)) {
            const foodItem = donation_items.find(item => item.category === 'food');
            if (foodItem && foodItem.data && Array.isArray(foodItem.data.forms)) {
                foodForms.push(...foodItem.data.forms);
            }
        }
        
        // Also check direct food property for backward compatibility
        if (food && food.forms && Array.isArray(food.forms)) {
            foodForms.push(...food.forms);
        }

        // Handle food items
        for (let f of foodForms) {
            const { name, type, qty, unit, pkg_type, exp_date, storage, additional_comments } = f;
            const missingFields = [];
            if (!name) missingFields.push('name');
            if (!type) missingFields.push('type');
            if (!qty) missingFields.push('qty');
            if (!pkg_type) missingFields.push('pkg_type');
            if (!exp_date) missingFields.push('exp_date');

            if (missingFields.length > 0) {
                const errorMsg = `Missing required food fields: ${missingFields.join(', ')}`;
                console.error("❌ " + errorMsg);
                insertFailures.push(errorMsg);
                continue;
            }

            const { error: foodError } = await supabase
                .from('food')
                .insert([{
                    name, 
                    qty, 
                    unit, // Add unit field 
                    exp_date, 
                    storage, // Add storage field
                    additional_comments, 
                    type, 
                    pkg_type,
                    donation_id,
                    donation_item_id: donationItemMap['food']
                }]);

            if (foodError) {
                console.error("❌ Food insert failed:", foodError);
                insertFailures.push({
                    type: 'food',
                    message: foodError.message || String(foodError),
                    code: foodError.code,
                    details: foodError.details
                });
            }
        }

        // Process clothes items from either donation_items array or direct clothes property
        const clothesForms = [];
        if (donation_items && Array.isArray(donation_items)) {
            const clothesItem = donation_items.find(item => item.category === 'clothes');
            if (clothesItem && clothesItem.data && Array.isArray(clothesItem.data.forms)) {
                clothesForms.push(...clothesItem.data.forms);
            }
        }
        
        // Also check direct clothes property for backward compatibility
        if (clothes && clothes.forms && Array.isArray(clothes.forms)) {
            clothesForms.push(...clothes.forms);
        }

        // Handle clothes items
        for (let c of clothesForms) {
            const { type, size, condition, fabric_type, qty, additional_comments } = c;
            const missingFields = [];
            if (!type) missingFields.push('type');
            if (!size) missingFields.push('size');
            if (!condition) missingFields.push('condition');
            if (!fabric_type) missingFields.push('fabric_type');
            if (!qty) missingFields.push('qty');

            if (missingFields.length > 0) {
                const errorMsg = `Missing required clothes fields: ${missingFields.join(', ')}`;
                console.error("❌ " + errorMsg);
                insertFailures.push(errorMsg);
                continue;
            }

            const { error: clothesError } = await supabase
                .from('clothes')
                .insert([{
                    qty, 
                    additional_comments, 
                    type, 
                    fabric_type, 
                    size, 
                    condition,
                    donation_id,
                    donation_item_id: donationItemMap['clothes']
                }]);

            if (clothesError) {
                console.error("❌ Clothes insert failed:", clothesError);
                insertFailures.push({
                    type: 'clothes',
                    message: clothesError.message || String(clothesError),
                    code: clothesError.code,
                    details: clothesError.details
                });
            }
        }

        if (insertFailures.length > 0) {
            console.error("⚠️ Some inserts failed:", JSON.stringify(insertFailures, null, 2));
            await rollbackDonation('partial insertion failure');
            return res.status(500).json({
                message: 'Failed to insert all donation details, transaction rolled back',
                errors: insertFailures
            });
        }

        console.log("✅ Donation process completed successfully for donation_id:", donation_id);
        res.status(201).json({
            message: 'Donation details added successfully',
            donation_id,
            donationItemData
        });

    } catch (error) {
        console.error("❌ Unexpected error in donation process:", error);
        if (donation_id) {
            try {
                console.log(`🔄 Rolling back donation ${donation_id} due to unexpected error`);
                await supabase.from('donations').delete().eq('id', donation_id);
                console.log(`✅ Successfully rolled back donation ${donation_id}`);
            } catch (rollbackError) {
                console.error(`⚠️ Failed to rollback donation ${donation_id}:`, rollbackError);
            }
        }

        const errorDetails = {
            message: error.message || String(error),
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            code: error.code,
            details: error.details
        };

        res.status(500).json({
            message: 'Failed to process donation due to an unexpected error',
            error: errorDetails,
            rollback_status: donation_id ? 'attempted' : 'not_needed'
        });
    }
});

module.exports = router;