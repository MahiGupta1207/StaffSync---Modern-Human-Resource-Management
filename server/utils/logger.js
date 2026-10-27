const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');

const logActivity = async ({ actor, actorName, action, module, targetId, details, ipAddress }) => {
  try {
    await ActivityLog.create({
      actor: actor || null,
      actorName: actorName || 'System',
      action,
      module,
      targetId: targetId ? targetId.toString() : null,
      details: details || {},
      ipAddress: ipAddress || ''
    });
  } catch (err) {
    console.error('[ActivityLog Error]', err.message);
  }
};

const sendNotification = async ({ recipient, title, message, type = 'SYSTEM', relatedLink = '' }) => {
  try {
    if (!recipient) return;
    await Notification.create({
      recipient,
      title,
      message,
      type,
      relatedLink
    });
  } catch (err) {
    console.error('[Notification Error]', err.message);
  }
};

module.exports = { logActivity, sendNotification };
