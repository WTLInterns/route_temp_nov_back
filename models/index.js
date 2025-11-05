
// const { Sequelize } = require('sequelize');
// const AdminModel = require('./Admin');
// const MasterAdminModel = require('./masterAdmin');
// const DriverModel = require('./loginModel');
// const CabsDetailsModel = require('./CabsDetails');
// const CabAssignmentModel = require('./CabAssignment');
// const CabModel = require('./Cab');
// const ServicingAssignmentModel = require('./ServicingAssignment');

// const sequelize = new Sequelize('Car-Expengo', 'postgres', 'root', {
//   host: 'localhost',
//   dialect: 'postgres',
//   logging: false,
// });

// // Initialize models
// const Admin = AdminModel(sequelize);
// const MasterAdmin = MasterAdminModel(sequelize);
// const Driver = DriverModel(sequelize);
// const CabsDetails = CabsDetailsModel(sequelize);
// const CabAssignment = CabAssignmentModel(sequelize);
// const Cab = CabModel(sequelize);
// const ServicingAssignment = ServicingAssignmentModel(sequelize);

// // Associations
// Driver.hasMany(CabAssignment, { foreignKey: 'driverId' });
// CabAssignment.belongsTo(Driver, { foreignKey: 'driverId' });

// CabsDetails.hasMany(CabAssignment, { foreignKey: 'cabId' });
// CabAssignment.belongsTo(CabsDetails, { foreignKey: 'cabId' });

// Admin.hasMany(CabAssignment, { foreignKey: 'assignedBy' });
// CabAssignment.belongsTo(Admin, { foreignKey: 'assignedBy' });

// CabsDetails.belongsTo(Driver, { foreignKey: 'driverId' });
// CabsDetails.belongsTo(Admin, { foreignKey: 'addedBy' });

// Cab.belongsTo(CabsDetails, { foreignKey: 'cabNumberId' });
// CabsDetails.hasMany(Cab, { foreignKey: 'cabNumberId' });

// // Servicing Associations (NO ALIASES USED)
// ServicingAssignment.belongsTo(CabsDetails, { foreignKey: 'cabId' });
// CabsDetails.hasMany(ServicingAssignment, { foreignKey: 'cabId' });

// ServicingAssignment.belongsTo(Driver, { foreignKey: 'driverId' });
// Driver.hasMany(ServicingAssignment, { foreignKey: 'driverId' });

// ServicingAssignment.belongsTo(Admin, { foreignKey: 'assignedBy' });
// Admin.hasMany(ServicingAssignment, { foreignKey: 'assignedBy' });

// // Sync DB
// sequelize
//   .sync({ alter: true })
//   .then(() => console.log('✅ Database synced successfully'))
//   .catch((err) => console.error('❌ Failed to sync database:', err));

// module.exports = {
//   sequelize,
//   Admin,
//   MasterAdmin,
//   Driver,
//   CabsDetails,
//   CabAssignment,
//   Cab,
//   ServicingAssignment,
// };



const { Sequelize, DataTypes } = require('sequelize');

// Sequelize instance
const sequelize = new Sequelize('Route-Budget', 'postgres', 'SaurabhS2151', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
});

// Import models
const AdminModel = require('./Admin');
const MasterAdminModel = require('./masterAdmin');
const DriverModel = require('./loginModel');
const CabsDetailsModel = require('./CabsDetails');
const CabAssignmentModel = require('./CabAssignment');
const CabModel = require('./Cab');
const ServicingAssignmentModel = require('./ServicingAssignment');
const AnalyticsModel = require('./SubadminAnalytics');
const ExpenseModel = require('./Expense');
const SubAdminPermissionsModel = require('./subAdminPermissions');
const SubadminExpensesModel = require ("./subAdminExpenses")
const JobPostMarketModel = require("./JobPostMarket")
const NotificationModel = require("./notification"); 
// FASTag models
const TagModel = require('./Tag');
const WalletModel = require('./Wallet');
const WalletLedgerModel = require('./WalletLedger');
const TxnModel = require('./Txn');
const RechargeAuditModel = require('./RechargeAudit');
const ProviderBalanceModel = require('./ProviderBalance');
const AttendanceModel = require('./Attendance');
const DriverSalaryModel = require('./DriverSalary');
const SalaryDeductionModel = require('./SalaryDeduction');

// Initialize models
const Admin = AdminModel(sequelize, DataTypes);
const MasterAdmin = MasterAdminModel(sequelize, DataTypes);
const Driver = DriverModel(sequelize, DataTypes);
const CabsDetails = CabsDetailsModel(sequelize, DataTypes);
const CabAssignment = CabAssignmentModel(sequelize, DataTypes);
const Cab = CabModel(sequelize, DataTypes);
const ServicingAssignment = ServicingAssignmentModel(sequelize, DataTypes);
const Analytics = AnalyticsModel(sequelize, DataTypes);
const Expense = ExpenseModel(sequelize, DataTypes);
const SubAdminPermissions = SubAdminPermissionsModel(sequelize, DataTypes);
const SubadminExpenses = SubadminExpensesModel(sequelize,DataTypes);
const JobPostMarket = JobPostMarketModel(sequelize, DataTypes);
const Notification = NotificationModel(sequelize, DataTypes);
// FASTag inits
const Tag = TagModel(sequelize, DataTypes);
const Wallet = WalletModel(sequelize, DataTypes);
const WalletLedger = WalletLedgerModel(sequelize, DataTypes);
const Txn = TxnModel(sequelize, DataTypes);
const RechargeAudit = RechargeAuditModel(sequelize, DataTypes);
const ProviderBalance = ProviderBalanceModel(sequelize, DataTypes);
const Attendance = AttendanceModel(sequelize, DataTypes);
const DriverSalary = DriverSalaryModel(sequelize, DataTypes);
const SalaryDeduction = SalaryDeductionModel(sequelize, DataTypes);

// Associations
Driver.hasMany(CabAssignment, { foreignKey: 'driverId' });
CabAssignment.belongsTo(Driver, { foreignKey: 'driverId' });

CabsDetails.hasMany(CabAssignment, { foreignKey: 'cabId' });
CabAssignment.belongsTo(CabsDetails, { foreignKey: 'cabId' });

Admin.hasMany(CabAssignment, { foreignKey: 'assignedBy' });
CabAssignment.belongsTo(Admin, { foreignKey: 'assignedBy' });



Driver.hasMany(CabAssignment, { foreignKey: 'driverId' });
CabAssignment.belongsTo(Driver, { foreignKey: 'driverId' });

Admin.hasMany(CabAssignment, { foreignKey: 'assignedBy' });
CabAssignment.belongsTo(Admin, { foreignKey: 'assignedBy' });




CabsDetails.belongsTo(Driver, { foreignKey: 'driverId' });
CabsDetails.belongsTo(Admin, { foreignKey: 'addedBy' });

Cab.belongsTo(CabsDetails, { foreignKey: 'cabNumberId' });
CabsDetails.hasMany(Cab, { foreignKey: 'cabNumberId' });

ServicingAssignment.belongsTo(CabsDetails, { foreignKey: 'cabId' });
CabsDetails.hasMany(ServicingAssignment, { foreignKey: 'cabId' });

ServicingAssignment.belongsTo(Driver, { foreignKey: 'driverId' });
Driver.hasMany(ServicingAssignment, { foreignKey: 'driverId' });

ServicingAssignment.belongsTo(Admin, { foreignKey: 'assignedBy' });
Admin.hasMany(ServicingAssignment, { foreignKey: 'assignedBy' });

// Optional association for SubAdminPermissions (if Admin → SubAdmin)
SubAdminPermissions.belongsTo(Admin, { foreignKey: 'subAdminId' });
Admin.hasMany(SubAdminPermissions, { foreignKey: 'subAdminId' });

Admin.hasMany(Expense, { foreignKey: 'adminId' });
Expense.belongsTo(Admin, { foreignKey: 'adminId' });

// ✅ SubadminExpenses
Admin.hasMany(SubadminExpenses, { foreignKey: 'adminId' });
SubadminExpenses.belongsTo(Admin, { foreignKey: 'adminId' });

//job post 

Admin.hasMany(JobPostMarket, { foreignKey: "addedBy" });
JobPostMarket.belongsTo(Admin, { foreignKey: "addedBy" });
Admin.hasMany(JobPostMarket, { foreignKey: "acceptedBy", as: "jobsAccepted" });
JobPostMarket.belongsTo(Admin, { foreignKey: "acceptedBy", as: "acceptedAdmin" });



// Notification.belongsTo(Admin, { foreignKey: "recipientId", as: "recipient" });
// Admin.hasMany(Notification, { foreignKey: "recipientId", as: "notifications" });

Notification.belongsTo(Admin, { 
  foreignKey: "recipientId", 
  as: "recipient",
  onDelete: "CASCADE",   
  hooks: true            
});

Admin.hasMany(Notification, { 
  foreignKey: "recipientId", 
  as: "notifications",
  onDelete: "CASCADE",  
  hooks: true
});


// Attendance associations
Driver.hasMany(Attendance, { foreignKey: 'driverId' });
Attendance.belongsTo(Driver, { foreignKey: 'driverId' });
Admin.hasMany(Attendance, { foreignKey: 'subAdminId' });
Attendance.belongsTo(Admin, { foreignKey: 'subAdminId' });

// DriverSalary associations
Driver.hasOne(DriverSalary, { foreignKey: 'driverId' });
DriverSalary.belongsTo(Driver, { foreignKey: 'driverId' });
Admin.hasMany(DriverSalary, { foreignKey: 'subAdminId' });
DriverSalary.belongsTo(Admin, { foreignKey: 'subAdminId' });

// SalaryDeduction associations
Driver.hasMany(SalaryDeduction, { foreignKey: 'driverId' });
SalaryDeduction.belongsTo(Driver, { foreignKey: 'driverId' });
Admin.hasMany(SalaryDeduction, { foreignKey: 'subAdminId' });
SalaryDeduction.belongsTo(Admin, { foreignKey: 'subAdminId' });


// Sync DB
sequelize
  .sync({ alter: true })
  .then(() => console.log('✅ Database synced successfully'))
  .catch((err) => console.error(' Failed to sync database:', err));

// Export all models
module.exports = {
  sequelize,
  Admin,
  MasterAdmin,
  Driver,
  CabsDetails,
  CabAssignment,
  Cab,
  ServicingAssignment,
  Analytics,
  Expense,
  SubAdminPermissions,
  SubadminExpenses,
  JobPostMarket,
  Notification,
  // FASTag exports
  Tag,
  Wallet,
  WalletLedger,
  Txn,
  RechargeAudit,
  ProviderBalance,
  Attendance,
  DriverSalary,
  SalaryDeduction,
};
