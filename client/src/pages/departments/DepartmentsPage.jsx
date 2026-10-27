import React, { useEffect, useState, useCallback } from 'react';
import { departmentService } from '../../services/index';
import { Plus, Building2, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getErrorMsg } from '../../utils/helpers';
import { X } from 'lucide-react';

const DepartmentsPage = () => {
  const { user }      = useAuth();
  const isAdmin       = user?.role === 'HR_ADMIN';
  const [departments, setDepts]   = useState([]);
  const [designations, setDesigs] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [deletingDept, setDeletingDept] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeptForm, setShowDeptForm]   = useState(false);
  const [showDesigForm, setShowDesigForm] = useState(false);
  const [editDept, setEditDept]           = useState(null);
  const [saving, setSaving]               = useState(false);
  const [formError, setFormError]         = useState('');

  // Dept form state
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });
  // Desig form state
  const [desigForm, setDesigForm] = useState({ title: '', department: '', description: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dRes, dgRes] = await Promise.all([
        departmentService.getAll(),
        departmentService.getDesignations(),
      ]);
      setDepts(dRes.data.departments || []);
      setDesigs(dgRes.data.designations || []);
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openEditDept = (dept) => {
    setEditDept(dept);
    setDeptForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    setShowDeptForm(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code) { setFormError('Name and code are required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editDept) {
        await departmentService.update(editDept._id, deptForm);
      } else {
        await departmentService.create(deptForm);
      }
      setShowDeptForm(false);
      setEditDept(null);
      setDeptForm({ name: '', code: '', description: '' });
      fetchAll();
    } catch (err) {
      setFormError(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDesig = async (e) => {
    e.preventDefault();
    if (!desigForm.title || !desigForm.department) { setFormError('Title and department are required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      await departmentService.createDesignation(desigForm);
      setShowDesigForm(false);
      setDesigForm({ title: '', department: '', description: '' });
      fetchAll();
    } catch (err) {
      setFormError(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;
    setDeleteLoading(true);
    try {
      await departmentService.remove(deletingDept._id);
      setDeletingDept(null);
      fetchAll();
    } catch (err) {
      setError(getErrorMsg(err));
      setDeletingDept(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <LoadingSpinner overlay message="Loading departments…" />;

  return (
    <div>
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <h1>Departments & Designations</h1>
          <p>Organize your company structure with departments and roles.</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ss-btn ss-btn-outline" onClick={() => { setShowDesigForm(true); setFormError(''); }}>
              <Plus size={14} /> Add Designation
            </button>
            <button className="ss-btn ss-btn-primary" onClick={() => { setShowDeptForm(true); setEditDept(null); setDeptForm({ name:'', code:'', description:'' }); setFormError(''); }}>
              <Plus size={14} /> Add Department
            </button>
          </div>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchAll} />}

      {/* Departments Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {departments.length === 0 ? (
          <div style={{ gridColumn: '1/-1' }}>
            <EmptyState icon={Building2} title="No departments yet" message="Create your first department to start organizing your workforce." />
          </div>
        ) : departments.map((dept) => (
          <div key={dept._id} className="ss-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--ss-mint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} color="var(--ss-primary)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{dept.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>{dept.code}</div>
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="ss-btn ss-btn-outline ss-btn-sm" onClick={() => openEditDept(dept)} title="Edit">
                    <Edit2 size={12} />
                  </button>
                  <button className="ss-btn ss-btn-outline ss-btn-sm" onClick={() => setDeletingDept(dept)} title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ss-primary)' }}>{dept.employeeCount || 0}</div>
                <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>Employees</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ss-orange)' }}>{dept.designationCount || 0}</div>
                <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>Designations</div>
              </div>
            </div>
            {dept.description && (
              <p style={{ fontSize: 12, color: 'var(--ss-text-muted)', marginTop: 12, lineHeight: 1.5 }}>{dept.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Designations Table */}
      <div className="ss-card">
        <div className="ss-card-header">
          <span className="ss-card-title">All Designations</span>
          <span style={{ fontSize: 12, color: 'var(--ss-text-muted)' }}>{designations.length} designation{designations.length !== 1 ? 's' : ''}</span>
        </div>
        {designations.length === 0 ? (
          <EmptyState title="No designations" message="Add designations to define employee roles." />
        ) : (
          <div className="ss-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="ss-table">
              <thead>
                <tr><th>Title</th><th>Department</th><th>Description</th></tr>
              </thead>
              <tbody>
                {designations.map((d) => (
                  <tr key={d._id}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{d.title}</td>
                    <td>
                      <span style={{ background: 'var(--ss-mint)', color: 'var(--ss-primary)', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                        {d.department?.name || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--ss-text-muted)' }}>{d.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dept Form Modal */}
      {showDeptForm && (
        <div className="ss-modal-overlay" onClick={() => setShowDeptForm(false)}>
          <div className="ss-modal ss-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="ss-modal-header">
              <span className="ss-modal-title">{editDept ? 'Edit Department' : 'New Department'}</span>
              <button className="ss-modal-close" onClick={() => setShowDeptForm(false)}><X size={14} /></button>
            </div>
            <div className="ss-modal-body">
              {formError && <div className="ss-alert ss-alert-danger" style={{ marginBottom: 12 }}>{formError}</div>}
              <div className="ss-form-group">
                <label className="ss-label">Name <span style={{ color: 'var(--ss-danger)' }}>*</span></label>
                <input className="ss-input" value={deptForm.name} onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Engineering" />
              </div>
              <div className="ss-form-group">
                <label className="ss-label">Code <span style={{ color: 'var(--ss-danger)' }}>*</span></label>
                <input className="ss-input" value={deptForm.code} onChange={(e) => setDeptForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. ENG" maxLength={10} disabled={!!editDept} />
              </div>
              <div className="ss-form-group">
                <label className="ss-label">Description</label>
                <textarea className="ss-input ss-textarea" value={deptForm.description} onChange={(e) => setDeptForm((p) => ({ ...p, description: e.target.value }))} placeholder="Department description…" />
              </div>
            </div>
            <div className="ss-modal-footer">
              <button className="ss-btn ss-btn-outline" onClick={() => setShowDeptForm(false)}>Cancel</button>
              <button className="ss-btn ss-btn-primary" onClick={handleSaveDept} disabled={saving}>
                {saving ? <LoadingSpinner size="sm" /> : editDept ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desig Form Modal */}
      {showDesigForm && (
        <div className="ss-modal-overlay" onClick={() => setShowDesigForm(false)}>
          <div className="ss-modal ss-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="ss-modal-header">
              <span className="ss-modal-title">New Designation</span>
              <button className="ss-modal-close" onClick={() => setShowDesigForm(false)}><X size={14} /></button>
            </div>
            <div className="ss-modal-body">
              {formError && <div className="ss-alert ss-alert-danger" style={{ marginBottom: 12 }}>{formError}</div>}
              <div className="ss-form-group">
                <label className="ss-label">Title <span style={{ color: 'var(--ss-danger)' }}>*</span></label>
                <input className="ss-input" value={desigForm.title} onChange={(e) => setDesigForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Senior Engineer" />
              </div>
              <div className="ss-form-group">
                <label className="ss-label">Department <span style={{ color: 'var(--ss-danger)' }}>*</span></label>
                <select className="ss-input ss-select" value={desigForm.department} onChange={(e) => setDesigForm((p) => ({ ...p, department: e.target.value }))}>
                  <option value="">— Select —</option>
                  {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
              <div className="ss-form-group">
                <label className="ss-label">Description</label>
                <textarea className="ss-input ss-textarea" value={desigForm.description} onChange={(e) => setDesigForm((p) => ({ ...p, description: e.target.value }))} placeholder="Role description…" />
              </div>
            </div>
            <div className="ss-modal-footer">
              <button className="ss-btn ss-btn-outline" onClick={() => setShowDesigForm(false)}>Cancel</button>
              <button className="ss-btn ss-btn-primary" onClick={handleSaveDesig} disabled={saving}>
                {saving ? <LoadingSpinner size="sm" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deletingDept}
        title="Delete Department"
        message={`Are you sure you want to delete "${deletingDept?.name}"? This action also removes associated designations. Active employees must be reassigned first.`}
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeletingDept(null)}
      />
    </div>
  );
};

export default DepartmentsPage;
