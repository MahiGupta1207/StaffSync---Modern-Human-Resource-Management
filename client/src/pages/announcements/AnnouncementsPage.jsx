import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { announcementService, departmentService } from '../../services/index';
import {
  Megaphone, Plus, Trash2, Edit3, Calendar,
  Users, Tag, AlertTriangle, CheckCircle2, X
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDate, timeAgo, getErrorMsg, humanEnum } from '../../utils/helpers';

const CATEGORIES = ['GENERAL', 'POLICY', 'EVENT', 'HOLIDAY', 'URGENT'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN';

  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    status: 'PUBLISHED',
    targetAudience: 'ALL',
    targetDepartment: ''
  });

  // Delete Dialog State
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch Announcements
  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await announcementService.getAll({
        category: categoryFilter || undefined,
        priority: priorityFilter || undefined
      });
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, priorityFilter]);

  useEffect(() => {
    fetchAnnouncements();
    if (isAdmin) {
      departmentService.getAll()
        .then(res => setDepartments(res.data.departments || []))
        .catch(() => {});
    }
  }, [fetchAnnouncements, isAdmin]);

  // Open Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      title: '',
      content: '',
      category: 'GENERAL',
      priority: 'MEDIUM',
      status: 'PUBLISHED',
      targetAudience: 'ALL',
      targetDepartment: ''
    });
    setFormError('');
    setShowModal(true);
  };

  // Open Edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      content: item.content,
      category: item.category || 'GENERAL',
      priority: item.priority || 'MEDIUM',
      status: item.status || 'PUBLISHED',
      targetAudience: item.targetAudience || 'ALL',
      targetDepartment: item.targetDepartment?._id || item.targetDepartment || ''
    });
    setFormError('');
    setShowModal(true);
  };

  // Save (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setFormError('Title and content are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form };
      if (payload.targetAudience !== 'DEPARTMENT') {
        payload.targetDepartment = null;
      }
      if (editingItem) {
        await announcementService.update(editingItem._id, payload);
        setSuccessMsg('Announcement updated successfully.');
      } else {
        await announcementService.create(payload);
        setSuccessMsg('Announcement published successfully.');
      }
      setShowModal(false);
      fetchAnnouncements();
    } catch (err) {
      setFormError(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await announcementService.remove(deletingId);
      setDeletingId(null);
      setSuccessMsg('Announcement deleted.');
      fetchAnnouncements();
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'URGENT': return 'ss-badge ss-badge-danger';
      case 'HIGH':   return 'ss-badge ss-badge-orange';
      case 'MEDIUM': return 'ss-badge ss-badge-teal';
      default:       return 'ss-badge ss-badge-gray';
    }
  };

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      {/* Header */}
      <div className="ss-page-header">
        <div>
          <h1 className="ss-page-title">Company Announcements</h1>
          <p className="ss-page-subtitle">Organizational notices, policy updates, and staff bulletins</p>
        </div>
        {isAdmin && (
          <button className="ss-btn ss-btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> New Announcement
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}
      {successMsg && (
        <div className="ss-alert ss-alert-success" style={{ marginBottom: 20 }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="ss-card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div className="row g-2 align-items-center">
          <div className="col-12 col-sm-6 col-md-3">
            <select
              className="ss-select ss-select-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{humanEnum(c)}</option>)}
            </select>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <select
              className="ss-select ss-select-sm"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{humanEnum(p)}</option>)}
            </select>
          </div>
          {(categoryFilter || priorityFilter) && (
            <div className="col-auto">
              <button
                className="ss-btn ss-btn-secondary ss-btn-sm"
                onClick={() => { setCategoryFilter(''); setPriorityFilter(''); }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <LoadingSpinner message="Loading bulletins..." />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements found"
          description="There are currently no company announcements matching your filters."
        />
      ) : (
        <div className="row g-3">
          {announcements.map((item) => (
            <div key={item._id} className="col-12 col-lg-6">
              <div className="ss-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="ss-card-header" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span className={getPriorityBadgeClass(item.priority)}>
                        {item.priority}
                      </span>
                      <span className="ss-badge ss-badge-teal">
                        {humanEnum(item.category)}
                      </span>
                      {isAdmin && (
                        <StatusBadge status={item.status} />
                      )}
                      <span style={{ fontSize: 12, color: 'var(--ss-text-muted)' }}>
                        {timeAgo(item.publishedAt || item.createdAt)}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--ss-text)' }}>
                      {item.title}
                    </h3>
                  </div>

                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        className="ss-btn ss-btn-secondary ss-btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => handleOpenEdit(item)}
                        title="Edit announcement"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="ss-btn ss-btn-danger ss-btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => setDeletingId(item._id)}
                        title="Delete announcement"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="ss-card-body" style={{ flex: 1 }}>
                  <p style={{
                    fontSize: 14,
                    color: 'var(--ss-text)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    margin: 0
                  }}>
                    {item.content}
                  </p>
                </div>

                <div style={{
                  padding: '12px 20px',
                  background: 'var(--ss-bg)',
                  borderTop: '1px solid var(--ss-border)',
                  borderBottomLeftRadius: 'var(--ss-radius)',
                  borderBottomRightRadius: 'var(--ss-radius)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  color: 'var(--ss-text-muted)'
                }}>
                  <div>
                    Audience: <strong>{item.targetAudience === 'DEPARTMENT' ? item.targetDepartment?.name || 'Department' : humanEnum(item.targetAudience)}</strong>
                  </div>
                  <div>
                    Author: {item.author?.name || 'HR Admin'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="ss-modal-backdrop">
          <div className="ss-modal" style={{ maxWidth: 560 }}>
            <div className="ss-modal-header">
              <h3 className="ss-modal-title">
                {editingItem ? 'Edit Announcement' : 'Publish New Announcement'}
              </h3>
              <button className="ss-modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="ss-modal-body">
                {formError && <ErrorAlert message={formError} onClose={() => setFormError('')} />}

                <div className="ss-form-group">
                  <label className="ss-label">Title</label>
                  <input
                    type="text"
                    className="ss-input"
                    placeholder="Enter announcement headline..."
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Category</label>
                      <select
                        className="ss-select"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{humanEnum(c)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Priority</label>
                      <select
                        className="ss-select"
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      >
                        {PRIORITIES.map(p => <option key={p} value={p}>{humanEnum(p)}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Target Audience</label>
                      <select
                        className="ss-select"
                        value={form.targetAudience}
                        onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                      >
                        <option value="ALL">All Staff</option>
                        <option value="MANAGERS">Managers Only</option>
                        <option value="DEPARTMENT">Specific Department</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Status</label>
                      <select
                        className="ss-select"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="PUBLISHED">Published</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                  </div>
                </div>

                {form.targetAudience === 'DEPARTMENT' && (
                  <div className="ss-form-group">
                    <label className="ss-label">Select Department</label>
                    <select
                      className="ss-select"
                      value={form.targetDepartment}
                      onChange={(e) => setForm({ ...form, targetDepartment: e.target.value })}
                      required
                    >
                      <option value="">Choose department...</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="ss-form-group">
                  <label className="ss-label">Bulletin Message</label>
                  <textarea
                    className="ss-textarea"
                    rows={5}
                    placeholder="Provide full notice details..."
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="ss-modal-footer">
                <button
                  type="button"
                  className="ss-btn ss-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ss-btn ss-btn-primary"
                  disabled={saving}
                >
                  {saving ? <LoadingSpinner size="sm" /> : (editingItem ? 'Save Changes' : 'Publish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingId}
        title="Delete Announcement"
        message="Are you sure you want to delete this notice? This action is permanent."
        confirmLabel="Delete"
        danger
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};

export default AnnouncementsPage;
