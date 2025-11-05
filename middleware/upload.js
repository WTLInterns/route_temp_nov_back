const multer = require("multer");
const path = require("path");
const upload  = require('../middleware/uploadMiddleware')

const uploadFields = upload.fields([
    { name: "fuelReceiptImage", maxCount: 1 },
    { name: "transactionImage", maxCount: 1 },
    { name: "tyrePunctureImage", maxCount: 1 },
    { name: "otherProblemsImage", maxCount: 1 },
    {name :"vehicleServiceImage", maxCount: 1},
    {name :"cabImage", maxCount: 1},
    // { name: "otherProblemsImage", maxCount: 1 },
]);

module.exports = uploadFields;

