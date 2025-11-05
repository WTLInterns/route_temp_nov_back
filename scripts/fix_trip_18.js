const { CabAssignment } = require('../models');

async function fixTrip18() {
  try {
    const trip = await CabAssignment.findByPk(18);
    
    if (!trip) {
      console.log('❌ Trip #18 not found');
      process.exit(1);
    }

    console.log('📍 Current trip #18:');
    console.log('  Pickup:', trip.pickupLocation);
    console.log('  Pickup Coords:', trip.pickupLatitude, trip.pickupLongitude);
    console.log('  Drop:', trip.dropLocation);
    console.log('  Drop Coords:', trip.dropLatitude, trip.dropLongitude);

    // Update with geocoded coordinates
    // city vista, Tukaram Nagar, Kharadi, Pune -> 18.5508446, 73.9312289
    // Wagholi, Pune, Maharashtra, India -> 18.580772, 73.978706
    
    await trip.update({
      pickupLatitude: 18.5508446,
      pickupLongitude: 73.9312289,
      dropLatitude: 18.580772,
      dropLongitude: 73.978706
    });

    console.log('\n✅ Updated trip #18:');
    console.log('  Pickup Coords:', trip.pickupLatitude, trip.pickupLongitude);
    console.log('  Drop Coords:', trip.dropLatitude, trip.dropLongitude);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTrip18();
