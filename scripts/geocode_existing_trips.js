const axios = require('axios');
const { CabAssignment } = require('../models');
const { Op } = require('sequelize');

const GOOGLE_MAPS_API_KEY = 'AIzaSyAKjmBSUJ3XR8uD10vG2ptzqLJAZnOlzqI';

async function geocodeExistingTrips() {
  try {
    console.log('🔍 Finding trips with null coordinates...');
    
    const trips = await CabAssignment.findAll({
      where: {
        pickupLocation: { [Op.ne]: null },
        pickupLatitude: null
      }
    });

    console.log(`📍 Found ${trips.length} trips to geocode`);

    for (const trip of trips) {
      console.log(`\n🚗 Processing trip #${trip.id}`);
      
      // Geocode pickup
      if (trip.pickupLocation && !trip.pickupLatitude) {
        try {
          const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
            params: {
              address: trip.pickupLocation,
              key: GOOGLE_MAPS_API_KEY
            }
          });
          
          if (response.data.results && response.data.results.length > 0) {
            const location = response.data.results[0].geometry.location;
            trip.pickupLatitude = location.lat;
            trip.pickupLongitude = location.lng;
            console.log(`  ✅ Pickup: ${trip.pickupLocation} -> ${location.lat}, ${location.lng}`);
          }
        } catch (err) {
          console.log(`  ❌ Pickup geocoding failed: ${err.message}`);
        }
      }

      // Geocode drop
      if (trip.dropLocation && !trip.dropLatitude) {
        try {
          const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
            params: {
              address: trip.dropLocation,
              key: GOOGLE_MAPS_API_KEY
            }
          });
          
          if (response.data.results && response.data.results.length > 0) {
            const location = response.data.results[0].geometry.location;
            trip.dropLatitude = location.lat;
            trip.dropLongitude = location.lng;
            console.log(`  ✅ Drop: ${trip.dropLocation} -> ${location.lat}, ${location.lng}`);
          }
        } catch (err) {
          console.log(`  ❌ Drop geocoding failed: ${err.message}`);
        }
      }

      // Save
      await trip.save();
      console.log(`  💾 Saved trip #${trip.id}`);
      
      // Rate limit (1 request per second)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✅ All trips geocoded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

geocodeExistingTrips();
