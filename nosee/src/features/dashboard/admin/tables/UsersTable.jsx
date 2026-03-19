import { useLanguage } from '@/contexts/LanguageContext';
import { s, ACCENT, MUTED } from '../adminStyles';
import { ALL_ROLES } from '../adminConstants';

export function UsersTable({ users, onRoleChange, onBanToggle, changingRole }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  return (
    <div style={s.table} className="admin-table">
      <div style={s.tableHead}>
        {[td.colUser, td.colRole, td.colRep, td.colStatus, td.colActions].map((h) => (
          <div key={h} style={s.th}>{h}</div>
        ))}
      </div>
      {users.map((u) => (
        <div key={u.id} style={s.tableRow}>
          <div style={s.td}>
            <div style={s.rowAvatar}>{(u.name || td.noName).charAt(0)}</div>
            <div>
              <div style={s.rowName}>{u.name || td.noName}</div>
              <div style={s.rowEmail}>{u.email}</div>
            </div>
          </div>
          <div style={s.td}>
            <select
              style={s.roleSelect}
              value={u.role}
              onChange={(e) => onRoleChange(u.id, e.target.value)}
              disabled={changingRole === u.id}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {changingRole === u.id && (
              <span style={{ marginLeft: 8, fontSize: 12, color: ACCENT }}>{td.savingRole}</span>
            )}
          </div>
          <div style={{ ...s.td, ...s.tdNum }}>{u.rep}</div>
          <div style={s.td}>
            <span style={{
              ...s.badge,
              background: u.status === 'activo' ? `${ACCENT}18` : '#F8717120',
              color:      u.status === 'activo' ? ACCENT : 'var(--error)',
            }}>
              {u.status === 'activo' ? td.statusActive : td.statusBanned}
            </span>
          </div>
          <div style={s.td}>
            <button
              style={{ ...s.actionBtn, ...(u.status === 'baneado' ? s.actionBtnDanger : {}) }}
              onClick={() => onBanToggle(u.id)}
              disabled={changingRole === u.id}
            >
              {u.status === 'baneado' ? td.unbanBtn : td.banBtn}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default UsersTable;
