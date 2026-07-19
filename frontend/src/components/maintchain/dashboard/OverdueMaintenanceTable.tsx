'use client';

interface OverdueItem {
  id: string;
  equipment: string;
  dueDate: string;
  daysOverdue: number;
  status: 'critical' | 'warning';
}

interface OverdueMaintenanceTableProps {
  items: OverdueItem[];
}

export function OverdueMaintenanceTable({ items }: OverdueMaintenanceTableProps) {
  return (
    <div className="glass p-6">
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
        Overdue Maintenance
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">No overdue maintenance records.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-xl border p-3 ${
                item.status === 'critical'
                  ? 'border-red-200 bg-red-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{item.equipment}</div>
                <div className="text-xs text-[var(--text-secondary)]">ID: {item.id}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${
                  item.status === 'critical' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {item.daysOverdue} days overdue
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Due: {item.dueDate}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
