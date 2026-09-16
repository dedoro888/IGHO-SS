import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  RotateCcw,
  Sparkles,
  Lock,
} from 'lucide-react';
import { StaffAccount, PermissionId } from '../types';
import {
  PERMISSION_CATALOGUE,
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSION_IDS,
  getRoleDisplayName,
} from '../utils/permissions';

interface PermissionManagerModalProps {
  staff: StaffAccount;
  onClose: () => void;
  onSave: (staffId: string, updatedPermissions: PermissionId[]) => void;
}

export const PermissionManagerModal: React.FC<PermissionManagerModalProps> = ({
  staff,
  onClose,
  onSave,
}) => {
  const isOwner = staff.role === 'hotel_owner';
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionId[]>(
    isOwner ? ALL_PERMISSION_IDS : staff.permissions || DEFAULT_ROLE_PERMISSIONS[staff.role] || []
  );
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    dashboard: true,
    reservations: true,
    rooms: true,
    billing: true,
    guests: false,
    housekeeping: false,
    reports: false,
    users: false,
    settings: false,
  });

  const toggleModule = (module: string) => {
    setExpandedModules((prev) => ({ ...prev, [module]: !prev[module] }));
  };

  const togglePermission = (permId: PermissionId) => {
    if (isOwner) return; // Owner permissions cannot be revoked
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const toggleAllInGroup = (permIds: PermissionId[]) => {
    if (isOwner) return;
    const allSelected = permIds.every((id) => selectedPermissions.includes(id));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((id) => !permIds.includes(id)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...permIds])));
    }
  };

  const resetToRoleDefaults = () => {
    if (isOwner) return;
    setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[staff.role] || []);
  };

  const selectAll = () => {
    if (isOwner) return;
    setSelectedPermissions(ALL_PERMISSION_IDS);
  };

  const clearAll = () => {
    if (isOwner) return;
    setSelectedPermissions(['dashboard.view']); // Keep minimal view
  };

  const handleSave = () => {
    onSave(staff.id, selectedPermissions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-start justify-between bg-neutral-50/70">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-neutral-900">
                  Manage Permissions
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800">
                  {getRoleDisplayName(staff.role)}
                </span>
                {isOwner && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    <Lock className="w-3 h-3" /> Full Access
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Staff: <span className="font-semibold text-neutral-800">{staff.name}</span> ({staff.email})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice for Owner */}
        {isOwner ? (
          <div className="p-4 bg-amber-50/80 border-b border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              As the <strong>Hotel Owner</strong>, this account automatically maintains unrestricted access to all operations, reports, billing, settings, and staff controls. Manual permission reduction is locked to prevent accidental lockout.
            </p>
          </div>
        ) : (
          /* Action Toolbar for non-owner */
          <div className="px-5 py-3 border-b border-neutral-100 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-neutral-500">
              Active: <strong className="text-black">{selectedPermissions.length}</strong> of{' '}
              {ALL_PERMISSION_IDS.length} permissions
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetToRoleDefaults}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-medium text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to {getRoleDisplayName(staff.role)} Defaults</span>
              </button>
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1.5 rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-medium text-[11px]"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="px-2.5 py-1.5 rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-medium text-[11px]"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Expandable Module Groups */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 divide-y divide-neutral-100">
          {PERMISSION_CATALOGUE.map((group) => {
            const isExpanded = !!expandedModules[group.module];
            const groupPermIds = group.permissions.map((p) => p.id);
            const selectedCount = groupPermIds.filter((id) =>
              selectedPermissions.includes(id)
            ).length;
            const allSelected = selectedCount === groupPermIds.length;
            const someSelected = selectedCount > 0 && !allSelected;

            return (
              <div key={group.module} className="pt-3 first:pt-0">
                <div className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-neutral-50/80 transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleModule(group.module)}
                    className="flex items-center gap-2.5 text-left flex-1"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-neutral-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-neutral-900">{group.label}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            allSelected
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : someSelected
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {selectedCount}/{groupPermIds.length} enabled
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 hidden sm:block">
                        {group.description}
                      </p>
                    </div>
                  </button>

                  {!isOwner && (
                    <button
                      type="button"
                      onClick={() => toggleAllInGroup(groupPermIds)}
                      className="text-[11px] font-semibold text-neutral-600 hover:text-black px-2 py-1 rounded-md hover:bg-neutral-200/60 ml-2"
                    >
                      {allSelected ? 'Uncheck All' : 'Check All'}
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7 pr-2 pt-2 pb-1">
                    {group.permissions.map((perm) => {
                      const isChecked = selectedPermissions.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'bg-black text-white border-black shadow-xs'
                              : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-300'
                          } ${isOwner ? 'cursor-not-allowed opacity-90' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isOwner}
                            onChange={() => togglePermission(perm.id)}
                            className="mt-0.5 rounded text-black focus:ring-0 accent-black"
                          />
                          <div className="text-xs">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span>{perm.action}</span>
                              <span
                                className={`text-[9px] font-mono font-normal opacity-70 ${
                                  isChecked ? 'text-neutral-300' : 'text-neutral-500'
                                }`}
                              >
                                {perm.id}
                              </span>
                            </div>
                            <p
                              className={`text-[11px] mt-0.5 line-clamp-2 ${
                                isChecked ? 'text-neutral-200' : 'text-neutral-500'
                              }`}
                            >
                              {perm.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isOwner}
            className={`px-6 py-2.5 rounded-full font-bold text-xs transition-all shadow-sm ${
              isOwner
                ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
                : 'bg-black text-white hover:bg-neutral-800'
            }`}
          >
            {isOwner ? 'Locked (Owner Access)' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
};
