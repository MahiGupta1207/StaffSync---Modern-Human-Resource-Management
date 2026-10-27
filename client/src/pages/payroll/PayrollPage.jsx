import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { payrollService, employeeService } from '../../services/index';
import {
  DollarSign, Plus, AlertCircle, CheckCircle2,
  Calendar, FileText, Info, X, ShieldAlert, ArrowRight
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import EmptyState from '../../components/EmptyState';
import { formatDate, getErrorMsg } from '../../utils/helpers';

const PayrollPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Generate Modal (HR Admin)
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [genForm, setGenForm] = useState({
    employeeId: '',
    payPeriodMonth: new Date().getMonth() + 1,
    payPeriodYear: new Date().getFullYear(),
    baseSalary: '',
    allowanceHra: '',
    allowanceOther: '',
    deductionPf: '',
    deductionTax: '',
    paymentNote: ''
  });

  // View Slip Modal
  const [viewRecord, setViewRecord] = useState(null);

  // Status Update Loading
  const [updatingId, setUpdatingId] = useState(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await payrollService.getAll({
        month: filterMonth || undefined,
        year: filterYear || undefined
      });
      setRecords(res.data.records || []);
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear]);

  useEffect(() => {
    fetchRecords();
    if (isAdmin) {
      employeeService.getAll({ limit: 100, status: 'ACTIVE' })
        .then(res => setStaffList(res.data.employees || []))
        .catch(() => {});
    }
  }, [fetchRecords, isAdmin]);

  // Handle Employee selection in generate form to auto-fill base salary
  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    const selected = staffList.find(s => s._id === empId);
    setGenForm(prev => ({
      ...prev,
      employeeId: empId,
      baseSalary: selected?.baseSalary || ''
    }));
  };

  // Submit Generated Payslip
  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenError('');
    if (!genForm.employeeId || !genForm.baseSalary) {
      setGenError('Employee and Base Salary are required.');
      return;
    }
    setGenerating(true);
    try {
      const base = Number(genForm.baseSalary) || 0;
      const allowances = [];
      if (genForm.allowanceHra) {
        allowances.push({ title: 'House Rent Allowance (HRA)', amount: Number(genForm.allowanceHra) });
      }
      if (genForm.allowanceOther) {
        allowances.push({ title: 'Special Allowance', amount: Number(genForm.allowanceOther) });
      }

      const deductions = [];
      if (genForm.deductionPf) {
        deductions.push({ title: 'Provident Fund (PF)', amount: Number(genForm.deductionPf) });
      }
      if (genForm.deductionTax) {
        deductions.push({ title: 'Professional / Income Tax', amount: Number(genForm.deductionTax) });
      }

      await payrollService.create({
        employeeId: genForm.employeeId,
        payPeriodMonth: Number(genForm.payPeriodMonth),
        payPeriodYear: Number(genForm.payPeriodYear),
        baseSalary: base,
        allowances,
        deductions,
        paymentNote: genForm.paymentNote
      });

      setShowGenerateModal(false);
      setSuccessMsg('Payroll record generated successfully.');
      fetchRecords();
    } catch (err) {
      setGenError(getErrorMsg(err));
    } finally {
      setGenerating(false);
    }
  };

  // Update Status (e.g. mark as PAID)
  const handleUpdateStatus = async (recordId, newStatus) => {
    setUpdatingId(recordId);
    try {
      await payrollService.updateStatus(recordId, { status: newStatus });
      setSuccessMsg(`Status updated to ${newStatus}.`);
      fetchRecords();
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setUpdatingId(null);
    }
  };

  // Calculate live preview in Generate Form
  const baseNum = Number(genForm.baseSalary) || 0;
  const allowNum = (Number(genForm.allowanceHra) || 0) + (Number(genForm.allowanceOther) || 0);
  const dedNum = (Number(genForm.deductionPf) || 0) + (Number(genForm.deductionTax) || 0);
  const grossNum = baseNum + allowNum;
  const netNum = Math.max(0, grossNum - dedNum);

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      {/* Header */}
      <div className="ss-page-header">
        <div>
          <h1 className="ss-page-title">Restricted Payroll Records</h1>
          <p className="ss-page-subtitle">Internal compensation tracking, salary records, and payslip generation</p>
        </div>
        {isAdmin && (
          <button className="ss-btn ss-btn-primary" onClick={() => setShowGenerateModal(true)}>
            <Plus size={16} /> Generate Payslip Record
          </button>
        )}
      </div>

      {/* Required Internal Disclaimer Banner */}
      <div className="ss-alert ss-alert-warning" style={{ marginBottom: 20 }}>
        <Info size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Informational HR Simulation Notice:</strong> This module maintains internal corporate HR records only.
          No external banking gateway or automated fund transfer is integrated.
        </div>
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
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="">All Months</option>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <select
              className="ss-select ss-select-sm"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="">All Years</option>
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {(filterMonth || filterYear) && (
            <div className="col-auto">
              <button
                className="ss-btn ss-btn-secondary ss-btn-sm"
                onClick={() => { setFilterMonth(''); setFilterYear(''); }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payroll Table */}
      <div className="ss-card">
        <div className="ss-card-header">
          <h3 className="ss-card-title">
            {isAdmin ? 'Corporate Payroll Directory' : 'My Payslip Records'}
          </h3>
        </div>
        <div className="ss-card-body" style={{ padding: 0 }}>
          {loading ? (
            <LoadingSpinner message="Loading payroll records..." />
          ) : records.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No payroll records on file"
              description="No compensation statements recorded for the selected period."
            />
          ) : (
            <div className="ss-table-wrapper">
              <table className="ss-table">
                <thead>
                  <tr>
                    {isAdmin && <th>Employee</th>}
                    <th>Pay Period</th>
                    <th>Gross Salary</th>
                    <th>Deductions</th>
                    <th>Net Payout</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const emp = rec.employee || {};
                    return (
                      <tr key={rec._id}>
                        {isAdmin && (
                          <td>
                            <div style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</div>
                            <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>{emp.employeeCode}</div>
                          </td>
                        )}
                        <td>
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][rec.payPeriodMonth - 1]} {rec.payPeriodYear}
                        </td>
                        <td>₹{rec.grossSalary?.toLocaleString('en-IN') || 0}</td>
                        <td style={{ color: 'var(--ss-danger)' }}>
                          -₹{rec.totalDeductions?.toLocaleString('en-IN') || 0}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--ss-primary)' }}>
                          ₹{rec.netSalary?.toLocaleString('en-IN') || 0}
                        </td>
                        <td><StatusBadge status={rec.status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="ss-btn ss-btn-secondary ss-btn-sm"
                              onClick={() => setViewRecord(rec)}
                            >
                              <FileText size={14} /> View Slip
                            </button>
                            {isAdmin && rec.status === 'PROCESSED' && (
                              <button
                                className="ss-btn ss-btn-primary ss-btn-sm"
                                onClick={() => handleUpdateStatus(rec._id, 'PAID')}
                                disabled={updatingId === rec._id}
                              >
                                {updatingId === rec._id ? <LoadingSpinner size="sm" /> : 'Mark Paid'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View Payslip Modal */}
      {viewRecord && (
        <div className="ss-modal-backdrop">
          <div className="ss-modal" style={{ maxWidth: 580 }}>
            <div className="ss-modal-header">
              <h3 className="ss-modal-title">StaffSync Salary Slip</h3>
              <button className="ss-modal-close" onClick={() => setViewRecord(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="ss-modal-body">
              {/* Slip Header */}
              <div style={{
                background: 'var(--ss-bg)',
                padding: 16,
                borderRadius: 8,
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                    {viewRecord.employee?.firstName} {viewRecord.employee?.lastName}
                  </h4>
                  <div style={{ fontSize: 12, color: 'var(--ss-text-muted)', marginTop: 2 }}>
                    Code: {viewRecord.employee?.employeeCode} &bull; {viewRecord.employee?.department?.name || 'Department'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][viewRecord.payPeriodMonth - 1]} {viewRecord.payPeriodYear}
                  </div>
                  <StatusBadge status={viewRecord.status} />
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="row g-3">
                {/* Earnings */}
                <div className="col-6">
                  <div style={{ border: '1px solid var(--ss-border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ss-primary)', marginBottom: 8, textTransform: 'uppercase' }}>
                      Earnings
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span>Base Salary:</span>
                      <strong>₹{viewRecord.baseSalary?.toLocaleString('en-IN') || 0}</strong>
                    </div>
                    {viewRecord.allowances?.map((a, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: 'var(--ss-text-muted)' }}>{a.title}:</span>
                        <span>₹{a.amount?.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--ss-border)', paddingTop: 6, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                      <span>Gross Total:</span>
                      <span>₹{viewRecord.grossSalary?.toLocaleString('en-IN') || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="col-6">
                  <div style={{ border: '1px solid var(--ss-border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ss-danger)', marginBottom: 8, textTransform: 'uppercase' }}>
                      Deductions
                    </div>
                    {viewRecord.deductions?.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--ss-text-muted)' }}>No deductions</div>
                    ) : (
                      viewRecord.deductions?.map((d, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ color: 'var(--ss-text-muted)' }}>{d.title}:</span>
                          <span>₹{d.amount?.toLocaleString('en-IN')}</span>
                        </div>
                      ))
                    )}
                    <div style={{ borderTop: '1px solid var(--ss-border)', paddingTop: 6, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                      <span>Total Deductions:</span>
                      <span style={{ color: 'var(--ss-danger)' }}>₹{viewRecord.totalDeductions?.toLocaleString('en-IN') || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Salary Highlight */}
              <div style={{
                marginTop: 20,
                padding: 16,
                background: 'var(--ss-mint)',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ss-primary)' }}>Net Disbursed Amount:</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--ss-primary)' }}>
                  ₹{viewRecord.netSalary?.toLocaleString('en-IN') || 0}
                </span>
              </div>

              {viewRecord.paymentNote && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ss-text-muted)' }}>
                  Note: {viewRecord.paymentNote}
                </div>
              )}

              <div style={{ marginTop: 16, fontSize: 11, color: 'var(--ss-text-muted)', textAlign: 'center' }}>
                {viewRecord.disclaimer}
              </div>
            </div>
            <div className="ss-modal-footer">
              <button className="ss-btn ss-btn-secondary" onClick={() => setViewRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Payslip Modal (HR Admin) */}
      {showGenerateModal && (
        <div className="ss-modal-backdrop">
          <div className="ss-modal" style={{ maxWidth: 540 }}>
            <div className="ss-modal-header">
              <h3 className="ss-modal-title">Generate Employee Payslip</h3>
              <button className="ss-modal-close" onClick={() => setShowGenerateModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleGenerate}>
              <div className="ss-modal-body">
                {genError && <ErrorAlert message={genError} onClose={() => setGenError('')} />}

                <div className="ss-form-group">
                  <label className="ss-label">Select Employee</label>
                  <select
                    className="ss-select"
                    value={genForm.employeeId}
                    onChange={handleEmployeeChange}
                    required
                  >
                    <option value="">Choose employee...</option>
                    {staffList.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Pay Period Month</label>
                      <select
                        className="ss-select"
                        value={genForm.payPeriodMonth}
                        onChange={(e) => setGenForm({ ...genForm, payPeriodMonth: e.target.value })}
                      >
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                          <option key={m} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Pay Period Year</label>
                      <input
                        type="number"
                        className="ss-input"
                        value={genForm.payPeriodYear}
                        onChange={(e) => setGenForm({ ...genForm, payPeriodYear: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="ss-form-group">
                  <label className="ss-label">Base Salary (₹)</label>
                  <input
                    type="number"
                    className="ss-input"
                    placeholder="e.g. 50000"
                    value={genForm.baseSalary}
                    onChange={(e) => setGenForm({ ...genForm, baseSalary: e.target.value })}
                    required
                  />
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">HRA Allowance (₹)</label>
                      <input
                        type="number"
                        className="ss-input"
                        placeholder="0"
                        value={genForm.allowanceHra}
                        onChange={(e) => setGenForm({ ...genForm, allowanceHra: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Special Allowance (₹)</label>
                      <input
                        type="number"
                        className="ss-input"
                        placeholder="0"
                        value={genForm.allowanceOther}
                        onChange={(e) => setGenForm({ ...genForm, allowanceOther: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Provident Fund Deduction (₹)</label>
                      <input
                        type="number"
                        className="ss-input"
                        placeholder="0"
                        value={genForm.deductionPf}
                        onChange={(e) => setGenForm({ ...genForm, deductionPf: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Tax Deduction (₹)</label>
                      <input
                        type="number"
                        className="ss-input"
                        placeholder="0"
                        value={genForm.deductionTax}
                        onChange={(e) => setGenForm({ ...genForm, deductionTax: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation Summary */}
                <div style={{
                  padding: 12,
                  background: 'var(--ss-bg)',
                  borderRadius: 6,
                  marginBottom: 16,
                  fontSize: 13
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Gross Calculation:</span>
                    <strong>₹{grossNum.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--ss-danger)' }}>
                    <span>Total Deductions:</span>
                    <strong>-₹{dedNum.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--ss-border)', paddingTop: 4, fontWeight: 700, color: 'var(--ss-primary)' }}>
                    <span>Estimated Net Pay:</span>
                    <span>₹{netNum.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="ss-form-group">
                  <label className="ss-label">Internal Record Note</label>
                  <input
                    type="text"
                    className="ss-input"
                    placeholder="e.g. October monthly salary cycle"
                    value={genForm.paymentNote}
                    onChange={(e) => setGenForm({ ...genForm, paymentNote: e.target.value })}
                  />
                </div>
              </div>
              <div className="ss-modal-footer">
                <button
                  type="button"
                  className="ss-btn ss-btn-secondary"
                  onClick={() => setShowGenerateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ss-btn ss-btn-primary"
                  disabled={generating}
                >
                  {generating ? <LoadingSpinner size="sm" /> : 'Generate Slip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPage;
