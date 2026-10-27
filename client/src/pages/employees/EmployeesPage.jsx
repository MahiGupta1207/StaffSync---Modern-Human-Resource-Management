import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { employeeService, departmentService } from '../../services/index';
import { Plus, Search, Filter, Eye, Edit2, ToggleLeft, Trash2, Users } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDate, initials, humanEnum, getErrorMsg } from '../../utils/helpers';
import EmployeeFormModal from './EmployeeFormModal';
import EmployeeDetailModal from './EmployeeDetailModal';

const EmployeesPage = () => {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'HR_ADMIN';

  const [employees, setEmployees]   = useState([]);
  const [departments, setDepts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const [search, setSearch]     = useState('');
  const [deptFilter, setDept]   = useState('');
  const [statusFilter, setStatus] = useState('');

  const [showForm, setShowForm]     = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [detailEmp, setDetailEmp]   = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchEmployees = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await employeeService.getAll({
        page,
        limit: 12,
        search: search || undefined,
        department: deptFilter || undefined,
        status: statusFilter || undefined,
      });
      setEmployees(res.data.employees || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      setCurrentPage(page);
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, statusFilter]);

  useEffect(() => { fetchEmployees(1); }, [fetchEmployees]);

  useEffect(() => {
    departmentService.getAll()
      .then((r) => setDepts(r.data.departments || []))
      .catch(() => {});
  }, []);

  const handleToggleStatus = async () => {
    if (!confirmToggle) return;
    setToggleLoading(true);
    try {
      const newStatus = confirmToggle.employmentStatus === 'ACTIVE' ? 'TERMINATED' : 'ACTIVE';
      await employeeService.toggleStatus(confirmToggle._id, { status: newStatus });
      setConfirmToggle(null);
      fetchEmployees(currentPage);
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setToggleLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      await employeeService.remove(confirmDelete._id);
      setConfirmDelete(null);
      fetchEmployees(currentPage);
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="ss-page-header">
        <div className="ss-page-header-left">
          <h1>Employees</h1>
          <p>{isAdmin ? 'Manage your organization\'s employee records.' : 'View team member information.'}</p>
        </div>
        {isAdmin && (
          <button className="ss-btn ss-btn-primary" onClick={() => { setEditingEmp(null); setShowForm(true); }}>
            <Plus size={15} /> Add Employee
          </button>
        )}
      </div>

      {/* Main Card */}
      <div className="ss-card">
        {/* Filter Bar */}
        <div className="ss-filter-bar">
          <div className="ss-search-input">
            <Search size={14} color="var(--ss-text-muted)" />
            <input
              type="text"
              placeholder="Search by name, email, or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="ss-input ss-select"
            style={{ width: 180 }}
            value={deptFilter}
            onChange={(e) => setDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
          <select
            className="ss-input ss-select"
            style={{ width: 160 }}
            value={statusFilter}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {['ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED'].map((s) => (
              <option key={s} value={s}>{humanEnum(s)}</option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: 'var(--ss-text-muted)', marginLeft: 'auto' }}>
            {total} record{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Error */}
        {error && <div style={{ padding: '0 20px' }}><ErrorAlert message={error} onRetry={() => fetchEmployees(currentPage)} /></div>}

        {/* Table */}
        {loading ? (
          <LoadingSpinner overlay message="Loading employees…" />
        ) : employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees found"
            message={search || deptFilter || statusFilter ? 'Try adjusting your search or filters.' : 'Start adding employees to your organization.'}
            action={isAdmin ? (
              <button className="ss-btn ss-btn-primary" onClick={() => setShowForm(true)}>
                <Plus size={14} /> Add First Employee
              </button>
            ) : null}
          />
        ) : (
          <div className="ss-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="ss-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="ss-avatar" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>
                          {initials(`${emp.firstName} ${emp.lastName}`)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.firstName} {emp.lastName}</div>
                          <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>{emp.employeeCode} · {emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{emp.department?.name || '—'}</td>
                    <td style={{ fontSize: 13 }}>{emp.designation?.title || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--ss-text-muted)' }}>{formatDate(emp.joiningDate)}</td>
                    <td><StatusBadge status={emp.employmentStatus} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="ss-btn ss-btn-outline ss-btn-sm"
                          onClick={() => setDetailEmp(emp)}
                          title="View details"
                        >
                          <Eye size={13} />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              className="ss-btn ss-btn-outline ss-btn-sm"
                              onClick={() => { setEditingEmp(emp); setShowForm(true); }}
                              title="Edit employee"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="ss-btn ss-btn-outline ss-btn-sm"
                              onClick={() => setConfirmToggle(emp)}
                              title={emp.employmentStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            >
                              <ToggleLeft size={13} />
                            </button>
                            <button
                              className="ss-btn ss-btn-outline ss-btn-sm"
                              style={{ color: 'var(--ss-danger)' }}
                              onClick={() => setConfirmDelete(emp)}
                              title="Remove employee"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ padding: '8px 20px' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => fetchEmployees(p)}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <EmployeeFormModal
          employee={editingEmp}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchEmployees(currentPage); }}
        />
      )}
      {detailEmp && (
        <EmployeeDetailModal
          employee={detailEmp}
          onClose={() => setDetailEmp(null)}
        />
      )}
      <ConfirmDialog
        isOpen={!!confirmToggle}
        title="Change Employment Status"
        message={`Are you sure you want to ${confirmToggle?.employmentStatus === 'ACTIVE' ? 'terminate' : 'reactivate'} ${confirmToggle?.firstName} ${confirmToggle?.lastName}? This will also ${confirmToggle?.employmentStatus === 'ACTIVE' ? 'deactivate' : 'activate'} their user account.`}
        confirmLabel={confirmToggle?.employmentStatus === 'ACTIVE' ? 'Terminate' : 'Reactivate'}
        loading={toggleLoading}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirmToggle(null)}
      />
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Remove Employee"
        message={`Are you sure you want to permanently remove ${confirmDelete?.firstName} ${confirmDelete?.lastName} (${confirmDelete?.employeeCode})? This action will remove their employee record and authentication account.`}
        confirmLabel="Remove Employee"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteEmployee}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default EmployeesPage;
