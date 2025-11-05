// // controllers/notificationController.js
// const { Notification, Admin } = require("../models");

// // ✅ Send a new notification
// exports.sendNotification = async (req, res) => {
//   try {
//     const { recipientId, recipientType, message } = req.body;

//     if (!recipientId || !recipientType || !message) {
//       return res.status(400).json({ success: false, message: "Missing fields" });
//     }

//     const notification = await Notification.create({
//       recipientId,
//       recipientType,
//       message,
//     });

//     res.status(201).json({ success: true, notification });
//   } catch (error) {
//     console.error("Send Notification Error:", error);
//     res.status(500).json({ success: false, message: "Failed to send notification" });
//   }
// };

// // ---------------- In-memory micro-cache (short TTL) ----------------
// const __mcNotif = new Map(); // key -> { ts, headers, body }
// const NOTIF_TTL_MS = 8000;

// function mcNGet(key) {
//   const e = __mcNotif.get(key);
//   if (!e) return null;
//   if (Date.now() - e.ts > NOTIF_TTL_MS) {
//     __mcNotif.delete(key);
//     return null;
//   }
//   return e;
// }
// function mcNSet(key, value) {
//   __mcNotif.set(key, { ts: Date.now(), ...value });
// }

// // ✅ Fetch all notifications (latest first)
// exports.getNotifications = async (req, res) => {
//   try {
//     const cacheKey = `notifs:list`;
//     const bypass = req.headers['cache-control'] === 'no-cache';
//     if (!bypass) {
//       const cached = mcNGet(cacheKey);
//       if (cached) {
//         if (cached.headers) {
//           if (cached.headers['Cache-Control']) res.set('Cache-Control', cached.headers['Cache-Control']);
//           if (cached.headers['Last-Modified']) res.set('Last-Modified', cached.headers['Last-Modified']);
//           if (cached.headers['ETag']) res.set('ETag', cached.headers['ETag']);
//         }
//         if (req.headers['if-none-match'] && cached.headers?.ETag && req.headers['if-none-match'] === cached.headers.ETag) {
//           return res.status(304).end();
//         }
//         if (req.headers['if-modified-since'] && cached.headers?.['Last-Modified']) {
//           const ifMs = new Date(req.headers['if-modified-since']);
//           const lastMs = new Date(cached.headers['Last-Modified']);
//           if (!isNaN(ifMs) && lastMs <= ifMs) {
//             return res.status(304).end();
//           }
//         }
//         return res.status(200).json(cached.body);
//       }
//     }

//     const notifications = await Notification.findAll({
//       include: [{ model: Admin, as: "recipient", attributes: ["id", "name", "email"] }],
//       order: [["createdAt", "DESC"]],
//     });

//     const crypto = require('crypto');
//     const lastMod = new Date();
//     const lastModUTC = lastMod.toUTCString();
//     const etagBase = `notifs|${notifications?.length || 0}|${notifications?.[0]?.id || ''}`;
//     const etag = crypto.createHash('md5').update(etagBase).digest('hex');
//     const cacheControl = 'private, max-age=5, stale-while-revalidate=30';
//     res.set('Cache-Control', cacheControl);
//     res.set('Last-Modified', lastModUTC);
//     res.set('ETag', etag);

//     if (req.headers['if-none-match'] === etag) {
//       return res.status(304).end();
//     }
//     const ifMs = req.headers['if-modified-since'] ? new Date(req.headers['if-modified-since']) : null;
//     if (ifMs && lastMod <= ifMs) {
//       return res.status(304).end();
//     }

//     const payload = { success: true, notifications };
//     mcNSet(cacheKey, { headers: { 'Cache-Control': cacheControl, 'Last-Modified': lastModUTC, 'ETag': etag }, body: payload });
//     res.status(200).json(payload);
//   } catch (error) {
//     console.error("Get Notifications Error:", error);
//     res.status(500).json({ success: false, message: "Failed to fetch notifications" });
//   }
// };

// controllers/notificationController.js
const { Notification, Admin } = require("../models"); // ✅ Admin added

// Send notification
exports.sendNotification = async (req, res) => {
  try {
    const { recipientId, recipientType, message } = req.body;

    if (!recipientId || !recipientType || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide recipientId, recipientType, and message",
      });
    }

    const notification = await Notification.create({
      recipientId,
      recipientType,
      message,
    });

    return res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
    });
  } catch (error) {
    console.error("Send Notification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send notification",
      error: error.message,
    });
  }
};

// Get notifications for logged-in subadmin
exports.getNotifications = async (req, res) => {
  try {
    const subadminId = req.user.id;         // logged in subadmin id
    const subadminType = req.user.type;     // 'trial' or 'paid'

    const notifications = await Notification.findAll({
      where: { recipientId: subadminId, recipientType: subadminType },
      include: [
        {
          model: Admin,
          as: "recipient",
          attributes: ["id", "name", "email"], // fetch recipient info
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Fetch Notification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};
