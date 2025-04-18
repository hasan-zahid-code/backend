const express = require('express');
const supabase = require('../../supabaseClient');
require('dotenv').config();

const router = express.Router();

router.post('/donate', async (req, res) => {
    const { donor_id, org_id, status, food, clothes } = req.body;
    let donation_id = null; // Track donation ID for potential rollbacks
    
    // Request validation
    if (!donor_id || !org_id || !status) {
        console.error("❌ Missing required fields:", { donor_id, org_id, status });
        return res.status(400).json({ message: 'Donor ID, Org ID, and Status are required' });
    }
    
    // Validate that at least one donation item is present
    if (!food && !clothes) {
        console.error("❌ No donation items provided");
        return res.status(400).json({ message: 'At least one donation item (food or clothes) is required' });
    }

    console.log("✅ Starting donation process...", { donor_id, org_id });
    console.log("📊 Request payload:", JSON.stringify(req.body, null, 2));

    try {
        // Insert donation record with detailed logging
        console.log("📌 Inserting into donations table...");
        const { data: donationData, error: donationError } = await supabase
            .from('donations')
            .insert([{ donor_id, org_id, status }])
            .select('*')  // Explicitly select all fields
            .single();

        // Handle donation insertion error
        if (donationError) {
            console.error("❌ Donation insert failed:", donationError);
            return res.status(500).json({ 
                message: 'Failed to insert donation record', 
                error: donationError.message || donationError,
                code: donationError.code,
                details: donationError.details
            });
        }

        // Validate donation data returned
        if (!donationData) {
            console.error("❌ No donation data returned after insertion");
            return res.status(500).json({ message: 'No donation data returned after insertion' });
        }

        donation_id = donationData.id;
        
        // Validate donation_id
        if (!donation_id) {
            console.error("❌ Donation ID is missing after successful insertion", donationData);
            return res.status(500).json({ 
                message: 'Donation ID is missing after insertion',
                data: donationData
            });
        }

        console.log(`✅ Donation inserted successfully. Generated donation_id: ${donation_id}`, donationData);

        // Helper function to handle rollback if needed
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

        // Prepare donation items for insertion
        let insertedDonationItems = [];
        if (food) insertedDonationItems.push({ donation_id, type: 'food' });
        if (clothes) insertedDonationItems.push({ donation_id, type: 'clothes' });

        console.log("🟢 Donation Items to be inserted:", JSON.stringify(insertedDonationItems, null, 2));

        // Insert into donation_item table with transaction safety
        console.log("📌 Inserting into donation_item table...");
        const { data: donationItemData, error: donationItemError } = await supabase
            .from('donation_items')
            .insert(insertedDonationItems)
            .select('*');  // Explicitly select all fields

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

        // Validate donation item data
        if (!donationItemData || donationItemData.length === 0) {
            console.error("❌ No donation item data returned after insertion");
            await rollbackDonation('missing donation item data');
            
            return res.status(500).json({ message: 'No donation item data returned after insertion' });
        }

        // Create mapping for donation item types to their IDs
        const donationItemMap = {};
        donationItemData.forEach(item => {
            if (item && item.id && item.type) {
                donationItemMap[item.type] = item.id;
            } else {
                console.warn("⚠️ Invalid donation item returned:", item);
            }
        });

        console.log(`✅ Donation items inserted: ${JSON.stringify(donationItemMap)}`);

        // Validate that we have all expected donation item IDs
        if ((food && !donationItemMap['food']) || (clothes && !donationItemMap['clothes'])) {
            console.error("❌ Missing expected donation item IDs", { 
                expected: { food: !!food, clothes: !!clothes },
                received: donationItemMap
            });
            await rollbackDonation('missing expected donation item IDs');
            
            return res.status(500).json({ 
                message: 'Missing expected donation item IDs after insertion',
                expected: { food: !!food, clothes: !!clothes },
                received: donationItemMap
            });
        }

        // Track failed inserts
        let insertFailures = [];

        // Process food donation if present
        if (food) {
            const { name, type, qty, pkg_type, exp_date, additional_comments } = food;
            
            // Validate food donation data
            if (!name || !qty || !exp_date || !type || !pkg_type) {
                const missingFields = [];
                if (!name) missingFields.push('name');
                if (!type) missingFields.push('type');
                if (!qty) missingFields.push('qty');
                if (!pkg_type) missingFields.push('pkg_type');
                if (!exp_date) missingFields.push('exp_date');
                
                const errorMsg = `Missing required food fields: ${missingFields.join(', ')}`;
                console.error("❌ " + errorMsg);
                insertFailures.push(errorMsg);
            } else {
                // Insert food donation details
                console.log("📌 Inserting into food table...", { donation_id, donation_item_id: donationItemMap['food'] });
                const { data: foodData, error: foodError } = await supabase
                    .from('food')
                    .insert([{
                        name, qty, exp_date, additional_comments, type, pkg_type,
                        donation_id,
                        donation_item_id: donationItemMap['food']
                    }])
                    .select('*');

                if (foodError) {
                    console.error("❌ Food insert failed:", foodError);
                    insertFailures.push({
                        type: 'food',
                        message: foodError.message || String(foodError),
                        code: foodError.code,
                        details: foodError.details
                    });
                } else {
                    console.log("✅ Food details inserted successfully");
                }
            }
        }

        // Process clothes donation if present
        if (clothes) {
            const { type, size, condition, fabric_type, qty, additional_comments } = clothes;
            
            // Validate clothes donation data
            if (!qty || !size || !type || !fabric_type || !condition) {
                const missingFields = [];
                if (!type) missingFields.push('type');
                if (!size) missingFields.push('size');
                if (!condition) missingFields.push('condition');
                if (!fabric_type) missingFields.push('fabric_type');
                if (!qty) missingFields.push('qty');
                
                const errorMsg = `Missing required clothes fields: ${missingFields.join(', ')}`;
                console.error("❌ " + errorMsg);
                insertFailures.push(errorMsg);
            } else {
                // Insert clothes donation details
                console.log("📌 Inserting into clothes table...", { donation_id, donation_item_id: donationItemMap['clothes'] });
                const { data: clothesData, error: clothesError } = await supabase
                    .from('clothes')
                    .insert([{
                        qty, additional_comments, type, fabric_type, size, condition,
                        donation_id,
                        donation_item_id: donationItemMap['clothes']
                    }])
                    .select('*');

                if (clothesError) {
                    console.error("❌ Clothes insert failed:", clothesError);
                    insertFailures.push({
                        type: 'clothes',
                        message: clothesError.message || String(clothesError),
                        code: clothesError.code,
                        details: clothesError.details
                    });
                } else {
                    console.log("✅ Clothes details inserted successfully");
                }
            }
        }

        // Handle partial failures - roll back entire donation if any part fails
        if (insertFailures.length > 0) {
            console.error("⚠️ Some inserts failed:", JSON.stringify(insertFailures, null, 2));
            
            // Rollback the donation record and all associated data
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
        // Handle unexpected errors and roll back if we have a donation ID
        console.error("❌ Unexpected error in donation process:", error);
        
        // Attempt rollback if donation was created
        if (donation_id) {
            try {
                console.log(`🔄 Rolling back donation ${donation_id} due to unexpected error`);
                await supabase.from('donations').delete().eq('id', donation_id);
                console.log(`✅ Successfully rolled back donation ${donation_id}`);
            } catch (rollbackError) {
                console.error(`⚠️ Failed to rollback donation ${donation_id}:`, rollbackError);
            }
        }
        
        // Extract useful error information
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