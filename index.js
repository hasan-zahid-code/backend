const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Allow cross-origin requests

// Import Routes
const donorRegister = require("./routes/donor/register");
const foodForm = require("./routes/donor/food_donation");
const donorDonations = require('./routes/donor/my_donations');
const donationDets = require('./routes/donor/donation_details');
const organizationRegister = require("./routes/organization/register");
const loginRoute = require("./routes/common/login");
const adminRoute = require("./routes/admin/register");
const getOrgs = require("./routes/organization/get_all_organisations");
const getOrgDet = require("./routes/organization/get_organisation_detail");
const getDonorDet = require("./routes/donor/get_donor_detail");
const getProfile = require("./routes/common/get_profile")
const file_upload = require("./routes/common/file_upload");
const donate = require("./routes/donor/donate");
const getRequestsRouter = require('./routes/organization/getRequests');
const updateRequestStatusRouter = require('./routes/organization/updateRequestStatus');
const update_address = require('./routes/common/update_address');
const get_address = require('./routes/common/get_address');
const get_request_status = require('./routes/organization/get_request_status');
const get_posts = require('./routes/common/get_posts');
const accept_posts = require('./routes/organization/accept_posts');
const delete_posts = require('./routes/donor/delete_posts');
const refresh_token = require('./routes/common/refresh-token');
const change_password = require('./routes/common/change_password');
const get_org_info = require('./routes/organization/get_org_info');
const update_organization_info = require('./routes/organization/update_organisation_info');
const create_campaign = require('./routes/organization/create_campaign');
const get_all_campaigns = require('./routes/donor/get_all_campaigns');
const campaign_donation = require('./routes/donor/campaign_donation');
const get_campaign_details = require('./routes/donor/get_campaign_details');
const get_total_donation_requests = require('./routes/organization/get_total_donation_requests');
const campaign_addfunds = require('./routes/organization/campaign_addfunds');
const get_org_campaigns = require('./routes/organization/get_org_campaigns');
const get_notifications = require('./routes/common/get_notifications');
const update_notifications_to_read = require('./routes/common/update_notifications_to_read');
const get_notification_description = require('./routes/common/get_notification_description');

const update_image = require('./routes/common/update_image');



const placesProxy = require('./routes/common/places-proxy');

// Use Routes
app.use("/api/donor", donorRegister);
app.use("/api/donor", foodForm);
app.use('/api/donor', donorDonations);
app.use('/api/donor', donationDets);
app.use("/api/organization", organizationRegister);
app.use('/api/organization', getRequestsRouter);
app.use('/api/organization', updateRequestStatusRouter);
app.use("/api/admin", adminRoute);
app.use("/api", loginRoute);
app.use("/api", getOrgs);
app.use("/api", getOrgDet);
app.use("/api", getDonorDet);
app.use("/api", getProfile);
app.use("/api", update_image);
app.use("/api", change_password);
app.use("/api", refresh_token);
app.use("/api", donate);
app.use("/api", update_address);
app.use("/api", get_address);
app.use("/api", get_request_status);
app.use("/api", get_posts);
app.use("/api", accept_posts);
app.use("/api", delete_posts);
app.use("/api", get_org_info);
app.use("/api", update_organization_info);
app.use("/api", create_campaign);
app.use("/api", get_all_campaigns);
app.use("/api", campaign_donation);
app.use("/api", get_campaign_details);
app.use("/api", get_total_donation_requests);
app.use("/api", campaign_addfunds);
app.use("/api", get_org_campaigns);
app.use("/api", get_notifications);
app.use("/api", update_notifications_to_read);
app.use("/api", get_notification_description);


// places
app.use('/api/places', placesProxy);


// Default Route
app.get("/", (req, res) => {
  const { error, error_code, error_description } = req.query;

  if (error) {
    return res.send(`
        <html>
        <head><title>Error</title></head>
        <body>
          <h2>Signup Error</h2>
          <p><strong>Error:</strong> ${error}</p>
          <p><strong>Code:</strong> ${error_code}</p>
          <p><strong>Description:</strong> ${decodeURIComponent(
            error_description
          )}</p>
          <p>Please try signing up again.</p>
          <a href="/signup">Go to Signup</a>
        </body>
        </html>
      `);
  }

  res.sendFile(path.join(__dirname, "/index.html"));
});
// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
