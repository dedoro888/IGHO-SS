import React, { useState } from 'react';
import {
  History,
  Search,
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
} from 'lucide-react';
import { PlatformAuditLog } from '../../types';

interface ConsoleAuditLogsViewProps {
  auditLogs: PlatformAuditLog[];
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleAuditLogsView: React.FC<ConsoleAuditLogsViewProps> = ({
  auditLogs,
  onNavigateBreadcrumb,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<PlatformAuditLog | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      log.target.toLowerCase().includes(query) ||
      log.actorEmail.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      (log.previousValue && log.previousValue.toLowerCase().includes(query)) ||
      (log.newValue && log.newValue.toLowerCase().includes(query));

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const pageSize = 12;
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getActionBadge = (action: string) => {
    if (action.includes('APPROVE') || action.includes('REACTIVATE')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (
      action.includes('REJECT') ||
      action.includes('SUSPEND') ||
      action.includes('DELETE') ||
      action.includes('DEACTIVATE')
    ) {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
    if (action.includes('PRICE') || action.includes('REFUND')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    return 'bg-neutral-100 text-neutral-800 border-neutral-200';
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Action', 'Target', 'Target Type', 'Actor', 'Previous', 'New'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      l.action,
      l.target,
      l.targetType,
      l.actorEmail,
      l.previousValue || '',
      l.newValue || '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `igho_audit_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <button
          onClick={onNavigateBreadcrumb}
          className="hover:text-black flex items-center gap-1 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-900 font-bold">Audit Ledger</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              Platform Audit & Security Ledger
            </h1>
            <p className="text-xs text-neutral-500">
              Append-only, immutable transaction ledger capturing every critical administrative action across the IGHO ecosystem.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-full border border-neutral-300 hover:bg-neutral-50 text-neutral-900 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by action, actor email, target or changed value..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 font-medium focus:outline-none focus:border-black"
          >
            <option value="all">All Actions</option>
            <option value="APPROVE_HOTEL">Approve Hotel</option>
            <option value="SUSPEND_HOTEL">Suspend Hotel</option>
            <option value="REACTIVATE_HOTEL">Reactivate Hotel</option>
            <option value="DELETE_HOTEL">Delete Hotel</option>
            <option value="PRICE_UPDATE">Price Update</option>
            <option value="ISSUE_REFUND">Issue Refund</option>
          </select>
        </div>
      </div>

      {/* Logs Table or Empty State */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
            <History className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-black">No audit events recorded</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Administrative actions, privilege grants, and lifecycle events will be permanently logged here as they occur.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="p-4">Action</th>
                  <th className="p-4">Target Entity</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Audit Details</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800">
                {paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-neutral-50/80 transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-neutral-900">{log.target}</div>
                      <div className="text-[10px] text-neutral-400 capitalize">{log.targetType}</div>
                    </td>
                    <td className="p-4 text-neutral-600 font-mono text-[11px]">{log.actorEmail}</td>
                    <td className="p-4 text-neutral-500 text-[11px]">
                      {log.newValue ? (
                        <span>
                          Value: <strong className="text-neutral-800">{log.newValue}</strong>
                        </span>
                      ) : (
                        <span>{log.id}</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-neutral-400">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} events
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-semibold text-neutral-900">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
