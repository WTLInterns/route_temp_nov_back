const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Load environment variables BEFORE checking flags
const dotenv = require("dotenv");
dotenv.config();

// Default to enabled unless explicitly disabled with ENABLE_TCP_SERVER=false
const ENABLE_TCP_SERVER = ((process.env.ENABLE_TCP_SERVER || "true").toLowerCase() !== "false")
if (ENABLE_TCP_SERVER) {
  require("./tcp/tcpServer.js")
  console.log("🚚 TCP GPS server enabled via ENABLE_TCP_SERVER=true")
} else {
  console.log("🚫 TCP GPS server disabled (using direct WebSocket updates)")
}
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const path = require("path");
const  OpenAI =require("openai");
const bodyParser = require("body-parser");
const http = require("http");

const {connectDB , sequelize} = require("./config/db.js")
const { setupWebSocketServer } = require("./routes/websocketRoute")
const { setBroadcastGPS, setLatestGPS } = require("./websocketInstance")

const fastagRoutes = require('./routes/fastagRoutes');

console.log("Starting RouteBudget Backend Server..."); 


// Initialize Express app and server
const app = express();
const server = http.createServer(app);

// PORT
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cache-Control",
    "If-None-Match",
    "If-Modified-Since",
    "Pragma"
  ],
  exposedHeaders: [
    "ETag",
    "Last-Modified",
    "Cache-Control"
  ],
}));
app.use(logger("dev"));
app.use(cookieParser());

  // IMPORTANT: raw body parsers for webhooks BEFORE json parser
  app.use('/api/fastag/razorpay-webhook', express.raw({ type: 'application/json' }));
  app.use('/api/fastag/provider-webhook', express.raw({ type: 'application/json' }));
  app.use('/api/fastag/upi-webhook', express.raw({ type: 'application/json' }));

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// Connect MongoDB (if using both MongoDB + Sequelize)
connectDB();

// Sync Sequelize Models with PostgreSQL
sequelize.sync({ alter: true })
  .then(() => console.log("Tables synced"))
  .catch(err => console.error("Sync error", err));

// Import Routes
const loginRoutes = require("./routes/loginRoutes");
const driverRoutes = require("./routes/driverRoutes");
const forgotPasswordRoutes = require("./routes/forgotPasswordRoutes");
const cabRoutes = require("./routes/cabRoutes");
const cabAssignRoutes = require("./routes/cabAssignmentRoutes");
const cabDetailsRoutes = require("./routes/cabsDetailsRoutes");
const subAdminPermissions = require("./routes/subAdminPermissions");
const expenseRoutes = require("./routes/subAdminExpenseRoute");
const analyticsRoutes = require("./routes/adminRoutes"); // handles analytics too
const emailRoutes = require("./routes/adminRoutes");     // for email (if reused)
const adminRoutes = require("./routes/adminRoutes");
const masterAdminRoutes = require("./routes/masterRoutes");
const forpassRoutes = require("./routes/forPassRoutes");
const servicingRoutes = require("./routes/servicing");
const jobPostMarket = require("./routes/jobPostMarketRoutes")
const notificationRoutes = require("./routes/notificationRoutes");
const paymentRouter = require("./routes/paymentRoutes.js");
const walletRoutes = require('./routes/walletRoutes');
const healthRoutes = require('./routes/health');
const attendanceRoutes = require('./routes/attendanceRoutes');
const salaryRoutes = require('./routes/salaryRoutes');

// Apply Routes

// Subadmin and Admin Routes
app.use("/api", loginRoutes);
app.use("/api/auth", forgotPasswordRoutes);
app.use("/api/password", forpassRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/email", emailRoutes); // email sending logic if handled in adminRoutes
app.use("/api/analytics", analyticsRoutes);
app.use("/api/subAdminPermissions", subAdminPermissions);
app.use("/api/expenses", expenseRoutes);
app.use("/api/jobMarket", jobPostMarket)

// Cab Related
app.use("/api/cabs", cabRoutes);
app.use("/api/assigncab", cabAssignRoutes);
app.use("/api/cabDetails", cabDetailsRoutes);
app.use("/api/servicing", servicingRoutes);

// Driver
app.use("/api/driver", driverRoutes);

// Master Admin
app.use("/api/master", masterAdminRoutes);

app.use("/api/notifications", notificationRoutes);


app.use("/api/payment", paymentRouter);

// FASTag routes
app.use('/api/fastag', fastagRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/health', healthRoutes);

// Attendance & Salary
app.use('/api/attendance', attendanceRoutes);
app.use('/api/attdance', attendanceRoutes); // alias as requested
app.use('/api/salary', salaryRoutes);


app.post("/api/ai-response", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const message = completion.choices[0].message.content;
    res.status(200).json({ result: message });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});



// Fallback for unknown routes
app.use((req, res, next) => {
  next(createError(404, "Route not found"));
});

// Error handler middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 HTTP Server running on http://localhost:${PORT}`);
  // Attach WebSocket server to the same HTTP server (enables wss on the same domain/port)
  try {
    const { broadcastGPS, latestGPS } = setupWebSocketServer(server)
    setBroadcastGPS(broadcastGPS)
    setLatestGPS(latestGPS)
    console.log("✅ WebSocket server attached to HTTP server (same domain/port)")
  } catch (e) {
    console.error("❌ Failed to initialize WebSocket server:", e)
  }

  console.log("✅ Backend server setup complete!");
});