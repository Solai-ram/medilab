import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { Procedure, ProcedureCategory, CreateProcedureInput } from '@lab/shared-types';
import { formatCurrency } from '@lab/billing-engine';
import { useAuth } from '../auth/AuthContext';
import {
  TestTubes,
  Search,
  Plus,
  Edit2,
  Power,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  X,
  Droplet,
  Layers,
  Activity,
  DollarSign,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';

export const ProceduresView: React.FC = () => {
  const { isAdmin } = useAuth();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [categories, setCategories] = useState<ProcedureCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);

  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sampleType, setSampleType] = useState('Serum');
  const [department, setDepartment] = useState('Biochemistry');
  const [price, setPrice] = useState('');

  // Department Management Modal
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [deptError, setDeptError] = useState<string | null>(null);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');

  // Inline department creation inside Procedure Modal
  const [isCreatingInlineDept, setIsCreatingInlineDept] = useState(false);
  const [inlineDeptName, setInlineDeptName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [procs, cats] = await Promise.all([
      dbService.getProcedures(),
      dbService.getCategories(),
    ]);
    setProcedures(procs);
    setCategories(cats);
    if (cats.length > 0 && !categoryId) {
      setCategoryId(cats[0].id);
    }
  };

  const filteredProcedures = procedures.filter((p) => {
    const matchCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.code.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.department && p.department.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const getSampleBadgeColor = (sample?: string) => {
    const s = (sample || '').toLowerCase();
    if (s.includes('edta') || s.includes('whole blood')) return 'bg-purple-950/70 border-purple-800 text-purple-300';
    if (s.includes('serum')) return 'bg-rose-950/70 border-rose-800 text-rose-300';
    if (s.includes('fluoride') || s.includes('plasma')) return 'bg-slate-800 border-slate-700 text-slate-300';
    if (s.includes('urine')) return 'bg-amber-950/70 border-amber-800 text-amber-300';
    if (s.includes('citrate')) return 'bg-sky-950/70 border-sky-800 text-sky-300';
    return 'bg-teal-950/70 border-teal-800 text-teal-300';
  };

  const handleOpenAdd = () => {
    setEditingProcedure(null);
    setCode(`PROC${String(procedures.length + 1).padStart(3, '0')}`);
    setName('');
    setSampleType('Serum');
    setDepartment('Biochemistry');
    setPrice('');
    setShowModal(true);
  };

  const handleOpenEdit = (proc: Procedure) => {
    setEditingProcedure(proc);
    setCode(proc.code);
    setName(proc.name);
    setCategoryId(proc.categoryId);
    setSampleType(proc.sampleType || '');
    setDepartment(proc.department || '');
    setPrice(proc.price.toString());
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !categoryId || !price) return;

    await dbService.upsertProcedure({
      id: editingProcedure?.id,
      code,
      name,
      categoryId,
      sampleType,
      department,
      price: parseFloat(price) || 0,
    });

    await loadData();
    setShowModal(false);
  };

  const handleToggleStatus = async (proc: Procedure) => {
    if (!isAdmin) return;
    await dbService.toggleProcedureStatus(proc.id);
    await loadData();
  };

  const handleCreateDepartment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newDeptName.trim();
    if (!trimmed) {
      setDeptError('Department name is required');
      return;
    }
    try {
      const created = await dbService.createCategory(trimmed);
      setNewDeptName('');
      setDeptError(null);
      await loadData();
      setCategoryId(created.id);
      setDepartment(created.name);
    } catch (err: any) {
      setDeptError(err.message || 'Failed to create department');
    }
  };

  const handleUpdateDepartment = async (id: string) => {
    const trimmed = editingDeptName.trim();
    if (!trimmed) return;
    try {
      await dbService.updateCategory(id, trimmed);
      setEditingDeptId(null);
      setEditingDeptName('');
      await loadData();
    } catch (err: any) {
      setDeptError(err.message || 'Failed to update department');
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      setDeptError(null);
      await dbService.deleteCategory(id);
      await loadData();
    } catch (err: any) {
      setDeptError(err.message || 'Cannot delete department');
    }
  };

  const handleCreateInlineDept = async () => {
    const trimmed = inlineDeptName.trim();
    if (!trimmed) return;
    try {
      const created = await dbService.createCategory(trimmed);
      await loadData();
      setCategoryId(created.id);
      setDepartment(created.name);
      setInlineDeptName('');
      setIsCreatingInlineDept(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create department');
    }
  };

  const activeCount = procedures.filter((p) => p.status === 'ACTIVE').length;
  const avgPrice = procedures.length > 0
    ? procedures.reduce((a, b) => a + b.price, 0) / procedures.length
    : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-md">
            <TestTubes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-wide">Diagnostic Procedure Master</h2>
            <p className="text-xs text-slate-400 font-medium">Laboratory test directory, sample types, and tariffs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, name, department..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 shadow-inner"
            />
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-950/50 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Investigation</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Procedures</div>
            <div className="text-2xl font-extrabold text-white mt-0.5">{activeCount} <span className="text-xs text-slate-500 font-normal">/ {procedures.length} total</span></div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-teal-950 border border-teal-800 flex items-center justify-center text-teal-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Specialized Categories</div>
            <div className="text-2xl font-extrabold text-teal-300 mt-0.5">{categories.length}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Test Tariff</div>
            <div className="text-2xl font-extrabold font-mono text-emerald-300 mt-0.5">{formatCurrency(avgPrice)}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap shadow-sm ${
            selectedCategory === 'ALL'
              ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-950/60'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All Departments ({procedures.length})
        </button>
        {categories.map((cat) => {
          const count = procedures.filter((p) => p.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap shadow-sm ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-950/60'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/60 text-slate-300 font-mono">
                {count}
              </span>
            </button>
          );
        })}

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setDeptError(null);
              setNewDeptName('');
              setShowDeptModal(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/70 border border-dashed border-teal-500/50 text-teal-400 hover:text-teal-200 hover:bg-slate-800/80 transition whitespace-nowrap shadow-sm"
            title="Create a new laboratory department"
          >
            <Plus className="w-3 h-3" />
            <span>New Dept</span>
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden flex flex-col min-h-0 shadow-md backdrop-blur-sm">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Investigation / Procedure</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Sample Specimen</th>
                <th className="py-3 px-4 text-right">Standard Tariff</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3 px-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProcedures.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500 italic">
                    No procedures found.
                  </td>
                </tr>
              ) : (
                filteredProcedures.map((proc) => (
                  <tr key={proc.id} className="hover:bg-slate-800/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-teal-400">{proc.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-100">{proc.name}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800">
                        {proc.categoryName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${getSampleBadgeColor(
                          proc.sampleType
                        )}`}
                      >
                        <Droplet className="w-3 h-3" />
                        <span>{proc.sampleType || 'Standard'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-white text-sm">
                      {formatCurrency(proc.price)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          proc.status === 'ACTIVE'
                            ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                            : 'bg-rose-950/70 border border-rose-800 text-rose-300'
                        }`}
                      >
                        {proc.status === 'ACTIVE' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{proc.status}</span>
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(proc)}
                            className="p-1.5 text-slate-400 hover:text-teal-400 rounded-lg hover:bg-slate-800 transition"
                            title="Edit Procedure"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(proc)}
                            className={`p-1.5 rounded-lg hover:bg-slate-800 transition ${
                              proc.status === 'ACTIVE'
                                ? 'text-slate-400 hover:text-rose-400'
                                : 'text-slate-400 hover:text-emerald-400'
                            }`}
                            title={proc.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TestTubes className="w-5 h-5 text-teal-400" />
                {editingProcedure ? `Edit Procedure (${editingProcedure.code})` : 'New Laboratory Investigation'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Procedure Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CBC001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 shadow-inner font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Standard Tariff (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 350.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 shadow-inner font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Test Description / Investigation *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Complete Blood Count (CBC)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">Department Category *</label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingInlineDept((prev) => !prev)}
                      className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 transition"
                      title="Quickly create a new department"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isCreatingInlineDept ? 'Choose Existing' : '+ New Dept'}</span>
                    </button>
                  </div>

                  {isCreatingInlineDept ? (
                    <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-teal-500/60 rounded-xl">
                      <input
                        type="text"
                        value={inlineDeptName}
                        onChange={(e) => setInlineDeptName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateInlineDept();
                          }
                        }}
                        placeholder="e.g. Microbiology..."
                        className="flex-1 bg-transparent text-xs text-white px-2 py-1 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleCreateInlineDept}
                        disabled={!inlineDeptName.trim()}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg shadow transition"
                      >
                        Add & Select
                      </button>
                    </div>
                  ) : (
                    <select
                      value={categoryId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCategoryId(val);
                        const c = categories.find((cat) => cat.id === val);
                        if (c) setDepartment(c.name);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sub-Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Hematology"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sample Specimen Type</label>
                <input
                  type="text"
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  placeholder="e.g. EDTA Whole Blood, Serum Fasting, Urine"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                />
                {/* Specimen quick chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
                  <span className="text-slate-500 font-semibold uppercase">Quick Samples:</span>
                  {[
                    { label: 'EDTA Blood', val: 'EDTA Whole Blood', color: 'bg-purple-950/60 border-purple-800 text-purple-300' },
                    { label: 'Plain Serum', val: 'Serum Fasting', color: 'bg-rose-950/60 border-rose-800 text-rose-300' },
                    { label: 'Fluoride Plasma', val: 'Fluoride Plasma', color: 'bg-slate-800 border-slate-700 text-slate-300' },
                    { label: 'Spot Urine', val: 'Spot Urine Sample', color: 'bg-amber-950/60 border-amber-800 text-amber-300' },
                    { label: 'Citrate Plasma', val: 'Citrate Plasma', color: 'bg-sky-950/60 border-sky-800 text-sky-300' },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setSampleType(s.val)}
                      className={`px-2 py-0.5 rounded-lg border text-[10px] font-medium transition hover:scale-105 ${s.color}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {editingProcedure && (
                <div className="p-3.5 bg-amber-950/30 border border-amber-800/60 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Price alterations are automatically tracked in the audit trail and do not modify existing historical invoices.
                  </span>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-xl shadow"
                >
                  {editingProcedure ? 'Update Tariff' : 'Save Investigation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Master Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-950 border border-teal-800 text-teal-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Laboratory Departments Master</h3>
                  <p className="text-xs text-slate-400 font-medium">Create and organize diagnostic divisions</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDeptModal(false);
                  setDeptError(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Create New Department Input Form */}
            <form onSubmit={handleCreateDepartment} className="mt-4 pb-4 border-b border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Create New Diagnostic Department
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newDeptName}
                    onChange={(e) => {
                      setNewDeptName(e.target.value);
                      if (deptError) setDeptError(null);
                    }}
                    placeholder="e.g. Microbiology, Radiology, Histopathology..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-medium placeholder-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newDeptName.trim()}
                  className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-950/50 transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create Dept</span>
                </button>
              </div>

              {deptError && (
                <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 font-medium bg-rose-950/40 p-2 rounded-lg border border-rose-900/60">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{deptError}</span>
                </div>
              )}
            </form>

            {/* Existing Departments List */}
            <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Existing Departments ({categories.length})</span>
                <span className="text-[10px] text-slate-500 font-normal">Active diagnostic divisions</span>
              </div>

              {categories.map((cat) => {
                const testCount = procedures.filter((p) => p.categoryId === cat.id).length;
                const isEditing = editingDeptId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingDeptName}
                          onChange={(e) => setEditingDeptName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateDepartment(cat.id);
                            if (e.key === 'Escape') setEditingDeptId(null);
                          }}
                          className="flex-1 bg-slate-900 border border-teal-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateDepartment(cat.id)}
                          className="p-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDeptId(null)}
                          className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-teal-400" />
                        <span className="text-xs font-bold text-slate-200">{cat.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                          {testCount} test{testCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDeptId(cat.id);
                            setEditingDeptName(cat.name);
                            setDeptError(null);
                          }}
                          className="p-1 text-slate-400 hover:text-teal-400 rounded-lg hover:bg-slate-800 transition"
                          title="Edit department name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDepartment(cat.id)}
                          disabled={testCount > 0}
                          className={`p-1 rounded-lg transition ${
                            testCount > 0
                              ? 'text-slate-600 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                          }`}
                          title={
                            testCount > 0
                              ? 'Cannot delete department with active tests'
                              : 'Delete unused department'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeptModal(false);
                  setDeptError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
