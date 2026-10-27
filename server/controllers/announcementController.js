const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { logActivity, sendNotification } = require('../utils/logger');

// @desc    Get announcements (role-filtered)
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res, next) => {
  try {
    const { category, priority, status } = req.query;
    const query = {};

    // HR_ADMIN can see drafts and archives; Manager and Employee see only PUBLISHED
    if (req.user.role === 'HR_ADMIN') {
      if (status) query.status = status;
    } else {
      query.status = 'PUBLISHED';

      const audienceConditions = [{ targetAudience: 'ALL' }];

      if (req.user.role === 'MANAGER') {
        audienceConditions.push({ targetAudience: 'MANAGERS' });
      }

      if (req.user.employee && req.user.employee.department) {
        audienceConditions.push({
          targetAudience: 'DEPARTMENT',
          targetDepartment: req.user.employee.department
        });
      }

      query.$or = audienceConditions;
    }

    if (category) query.category = category;
    if (priority) query.priority = priority;

    const announcements = await Announcement.find(query)
      .populate('author', 'name email')
      .populate('targetDepartment', 'name code')
      .sort({ publishedAt: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: announcements.length,
      announcements
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private (HR_ADMIN only)
const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, category, priority, status, targetAudience, targetDepartment } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required.'
      });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      category: category || 'GENERAL',
      priority: priority || 'MEDIUM',
      status: status || 'PUBLISHED',
      targetAudience: targetAudience || 'ALL',
      targetDepartment: targetDepartment || null,
      author: req.user._id,
      publishedAt: status === 'PUBLISHED' ? new Date() : null
    });

    // Notify all active users if published
    if (announcement.status === 'PUBLISHED') {
      const activeUsers = await User.find({ isActive: true }).select('_id');
      for (const u of activeUsers) {
        if (u._id.toString() !== req.user._id.toString()) {
          await sendNotification({
            recipient: u._id,
            title: `New Company Announcement: ${announcement.title}`,
            message: announcement.content.substring(0, 100) + '...',
            type: 'ANNOUNCEMENT',
            relatedLink: '/announcements'
          });
        }
      }
    }

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'CREATE_ANNOUNCEMENT',
      module: 'ANNOUNCEMENT',
      targetId: announcement._id,
      details: { title: announcement.title, priority: announcement.priority },
      ipAddress: req.ip
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('author', 'name email')
      .populate('targetDepartment', 'name code');

    res.status(201).json({
      success: true,
      message: 'Announcement published successfully.',
      announcement: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private (HR_ADMIN only)
const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    const { title, content, category, priority, status, targetAudience, targetDepartment } = req.body;

    if (title) announcement.title = title.trim();
    if (content) announcement.content = content.trim();
    if (category) announcement.category = category;
    if (priority) announcement.priority = priority;
    if (targetAudience) announcement.targetAudience = targetAudience;
    if (targetDepartment !== undefined) announcement.targetDepartment = targetDepartment || null;

    if (status && status !== announcement.status) {
      announcement.status = status;
      if (status === 'PUBLISHED' && !announcement.publishedAt) {
        announcement.publishedAt = new Date();
      }
    }

    await announcement.save();

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'UPDATE_ANNOUNCEMENT',
      module: 'ANNOUNCEMENT',
      targetId: announcement._id,
      details: { title: announcement.title },
      ipAddress: req.ip
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('author', 'name email')
      .populate('targetDepartment', 'name code');

    res.status(200).json({
      success: true,
      message: 'Announcement updated successfully.',
      announcement: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (HR_ADMIN only)
const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    await announcement.deleteOne();

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'DELETE_ANNOUNCEMENT',
      module: 'ANNOUNCEMENT',
      targetId: req.params.id,
      details: { title: announcement.title },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Announcement removed successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
