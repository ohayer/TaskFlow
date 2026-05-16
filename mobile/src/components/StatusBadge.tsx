import { View, Text } from '../lib/rn';
import type { TaskItemStatus } from '../types/models';
import { TaskStatusLabels } from '../types/models';

const statusBg: Record<TaskItemStatus, string> = {
  0: 'bg-slate-100',
  1: 'bg-amber-100',
  2: 'bg-blue-100',
  3: 'bg-emerald-100',
  4: 'bg-rose-100',
};
const statusText: Record<TaskItemStatus, string> = {
  0: 'text-slate-700',
  1: 'text-amber-800',
  2: 'text-blue-800',
  3: 'text-emerald-800',
  4: 'text-rose-800',
};

export function StatusBadge({ status }: { status: TaskItemStatus }) {
  return (
    <View className={`px-2 py-0.5 rounded-full ${statusBg[status]}`}>
      <Text className={`text-xs font-medium ${statusText[status]}`}>
        {TaskStatusLabels[status]}
      </Text>
    </View>
  );
}
