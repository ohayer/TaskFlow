import { View, Text } from '../lib/rn';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

interface Props {
  icon?: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
}

export function EmptyState({ icon = 'cube-outline', title, description }: Props) {
  return (
    <View className="items-center justify-center py-12 px-6">
      <View className="w-14 h-14 rounded-full bg-slate-100 items-center justify-center mb-3">
        <Ionicons name={icon} size={28} color="#64748b" />
      </View>
      <Text className="text-base font-semibold text-slate-700">{title}</Text>
      {description && (
        <Text className="text-sm text-slate-500 mt-1 text-center">{description}</Text>
      )}
    </View>
  );
}
