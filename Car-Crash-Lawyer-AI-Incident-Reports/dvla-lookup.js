const axios = require('axios');

// Set your API key for the DVLA Vehicle Enquiry API.  You can either
// provide it directly here by replacing `YOUR_API_KEY` with your live or
// test key, or set an environment variable `DVLA_API_KEY` in your runtime
// environment.  The environment variable will take precedence if defined.
const API_KEY = process.env.DVLA_API_KEY || 'YOUR_API_KEY';

// Registration mark for the vehicle you want to look up.  This should be
// formatted without any spaces and can be changed dynamically when the script
// is invoked.  The example below uses a placeholder value.
const VRM = process.env.DVLA_VRM || 'F11NGO';

(async () => {
  try {
    const response = await axios.get('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      params: { registrationNumber: VRM },
      headers: {
        // Pass the API key via the x-api-key header.  The Accept header
        // ensures that JSON will be returned from the API.  See the DVLA
        // documentation for details: https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service
        'x-api-key': API_KEY,
        'Accept': 'application/json'
      }
    });
    console.log('Vehicle Data:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Error:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
})();
