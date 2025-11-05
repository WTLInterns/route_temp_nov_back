// const Driver = require("../models/Driver");
// const Driver = require ("../models/CabAssignment")
// const Driver = require ("../models/CabsDetails")

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Register Driver
const registerDriver = async (req, res) => {
    try {
        const newDriver = new Driver(req.body);
        await newDriver.save();
        res.status(201).json({ message: "Driver registered successfully", driver: newDriver });
    } catch (error) {
        res.status(500).json({ message: "Error registering driver", error });
    }
};
const driverLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const driver = await Driver.findOne({ email });

        if (!driver || driver.password !== password) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        res.status(200).json({ message: "Login successful", driver });
    } catch (error) {
        res.status(500).json({ message: "Error logging in", error });
    }
};

// Get Driver Details by ID
const getDriverDetails = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.driverId);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }
        res.status(200).json(driver);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving driver details", error });
    }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




module.exports = { registerDriver, driverLogin, getDriverDetails };
