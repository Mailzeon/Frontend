import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  color?: 'purple' | 'blue' | 'green' | 'yellow' | 'red';
  className?: string;
}

const colorMap = {
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  blue:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
  green:  'text-green-400 bg-green-500/10 border-green-500/20',
  yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  red:    'text-red-400 bg-red-500/10 border-red-500/20',
};

export function StatCard({ title, value, sub, icon: Icon, color = 'purple', className }: StatCardProps) {
  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center', colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
