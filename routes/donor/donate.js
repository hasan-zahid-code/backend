const express = require('express');
const supabase = require('../../supabaseClient');
const { createNotification } = require('../common/notificationService.js');


const router = express.Router();

router.post('/donate', async (req, res) => {
    const { donor_id, org_id, status, location, donation_items } = req.body;
    
    let donation_id = null; // Track donation ID for rollbacks
    console.log(donation_items);
    // Request validation
    if (!donor_id || !org_id || !status) {
        console.error('Missing required fields: donor_id, org_id, status');
        return res.status(400).json({ message: 'Donor ID, Org ID, and Status are required' });
    }

    // Validate donation items
    if (!donation_items || !Array.isArray(donation_items) || donation_items.length === 0) {
        console.error('Invalid donation_items structure or empty array');
        return res.status(400).json({ message: 'At least one donation item is required' });
    }

    try {
        // Insert donation record
        console.log('Inserting donation record...');
        const { data: donationData, error: donationError } = await supabase
            .from('donations')
            .insert([{
                donor_id,
                org_id,
                status,
                location
            }])
            .select('*')
            .single();

        // Handle donation insertion error
        if (donationError) {
            console.error('Failed to insert donation:', donationError.message);
            return res.status(500).json({
                message: 'Failed to add donation record',
                error: donationError.message
            });
        }

        donation_id = donationData.id;
        console.log('Donation record inserted, ID:', donation_id);

        // Helper function to handle rollback if needed
        const rollbackDonation = async () => {
            if (!donation_id) return;

            console.log('Rolling back donation record with ID:', donation_id);
            const { error: rollbackError } = await supabase
                .from('donations')
                .delete()
                .eq('id', donation_id);

            if (rollbackError) {
                console.error(`Failed to rollback donation ${donation_id}:`, rollbackError);
            } else {
                console.log(`Donation ${donation_id} successfully rolled back`);
            }
        };

        // Process categories from donation items
        const categories = [...new Set(donation_items.map(item => item.category))];
        console.log('Processing categories:', categories);

        const categoryMap = {};

        // Insert donation item categories
        for (const category of categories) {
            console.log(`Inserting category ${category}...`);
            const { data: itemData, error: itemError } = await supabase
                .from('donation_items')
                .insert([{ donation_id, type: category }])
                .select('*')
                .single();

            if (itemError) {
                console.error(`Failed to insert ${category} category:`, itemError.message);
                await rollbackDonation();
                return res.status(500).json({
                    message: `Failed to insert ${category} category`,
                    error: itemError.message
                });
            }

            categoryMap[category] = itemData.id;
            console.log(`Category ${category} inserted, ID:`, itemData.id);
        }

        // Process all donation items
        let insertErrors = [];
        // console.log('Inserting donation items...');

        for (const item of donation_items) {
            const { category, data } = item;

            if (!category || !data) {
                insertErrors.push(`Invalid item structure: missing category or data`);
                console.error('Invalid item structure:', item);
                continue;
            }

            const donation_item_id = categoryMap[category];

            if (!donation_item_id) {
                insertErrors.push(`Invalid category: ${category}`);
                console.error('Invalid category for item:', category);
                continue;
            }

            if (category === 'food') {
                // Map food data to expected schema
                const foodData = {
                    name: data.name,
                    type: data.type,
                    qty: data.qty,
                    pkg_type: data.pkg_type,
                    exp_date: data.exp_date,
                    unit: data.unit,
                    storage: data.storage,
                    additional_comments: data.comments,
                    image_urls: data.imageUrls,
                    donation_id,
                    donation_item_id
                };

                // console.log('Inserting food item with data:', foodData);

                // Validate required fields
                if (!foodData.name || !foodData.type || !foodData.qty ||
                    !foodData.pkg_type || !foodData.exp_date) {
                    insertErrors.push(`Missing required food fields for item: ${JSON.stringify(data)}`);
                    console.error('Missing required food fields:', data);
                    continue;
                }

                // Insert food item
                const { error: foodError } = await supabase
                    .from('food')
                    .insert([foodData]);

                if (foodError) {
                    insertErrors.push(`Failed to insert food item: ${foodError.message}`);
                    console.error('Failed to insert food item:', foodError.message);
                }
            }
            else if (category === 'clothes') {
                // Map clothes data to expected schema
                const clothesData = {
                    type: data.type,
                    size: data.size,
                    condition: data.condition,
                    fabric_type: data.fabric_type,
                    qty: data.qty || data.quantity,
                    image_urls: data.imageUrls,
                    additional_comments: data.comments,
                    donation_id,
                    donation_item_id
                };

                // console.log('Inserting clothes item with data:', clothesData);

                // Validate required fields
                if (!clothesData.type || !clothesData.size || !clothesData.condition ||
                    !clothesData.fabric_type || !clothesData.qty) {
                    insertErrors.push(`Missing required clothes fields for item: ${JSON.stringify(data)}`);
                    console.error('Missing required clothes fields:', data);
                    continue;
                }

                // Insert clothes item
                const { error: clothesError } = await supabase
                    .from('clothes')
                    .insert([clothesData]);

                if (clothesError) {
                    insertErrors.push(`Failed to insert clothes item: ${clothesError.message}`);
                    console.error('Failed to insert clothes item:', clothesError.message);
                }
            }
            else if (category === 'others') {
                const othersData = {
                    description: data.description,
                    image_urls: data.image_urls,
                    donation_id,
                    donation_item_id
                };

                if (!data.description || !data.image_urls) {
                    insertErrors.push(`Missing required other fields for item: ${JSON.stringify(data)}`);
                    console.error('Missing required other fields:', data);
                    continue;
                }

                const { error: othersError } = await supabase
                    .from('others')
                    .insert([othersData]);

                if (othersError) {
                    insertErrors.push(`Failed to insert other item: ${othersError.message}`);
                    console.error('Failed to insert other item:', othersError.message);
                }
            }
            else {
                insertErrors.push(`Unsupported category: ${category}`);
                console.error('Unsupported category:', category);
            }
        }

        // Check if any items failed to insert
        if (insertErrors.length > 0) {
            console.error('Errors during donation item insertion:', insertErrors);
            await rollbackDonation();
            return res.status(500).json({
                message: 'Failed to insert all donation items, transaction rolled back',
                errors: insertErrors
            });
        }

        // Create a notification for the organization
        // const notification = await createNotification({
        //     type: 'donation',
        //     user_type: 'organization',
        //     recipient_id: org_id,
        //     metadata: {
        //         donation_id,
        //         donation_status: status
        //     }
        // });

        // Success response
        // console.log('Donation processed successfully');
        res.status(201).json({
            message: 'Donation request sent successfully',
            donation_id,
            // notification
        });

        

    } catch (error) {
        // Handle unexpected errors
        console.error('Unexpected error during donation processing:', error.message);

        if (donation_id) {
            try {
                console.log('Rolling back donation record due to unexpected error');
                await supabase.from('donations').delete().eq('id', donation_id);
            } catch (rollbackError) {
                console.error(`Failed to rollback donation ${donation_id}:`, rollbackError);
            }
        }

        res.status(500).json({
            message: 'Failed to process donation due to an unexpected error',
            error: error.message
        });
    }
});

module.exports = router;
