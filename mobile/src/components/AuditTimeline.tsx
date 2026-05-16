import { View, Text } from '../lib/rn';
import type { AuditEntryDto } from '../api/endpoints';

const auditActionLabels: Record<string, string> = {
  Created: 'Utworzono zadanie',
  Updated: 'Zaktualizowano zadanie',
  Deleted: 'Usunięto zadanie',
  AttachmentUploaded: 'Wgrano załącznik',
  AttachmentDeleted: 'Usunięto załącznik',
  Notification: 'Powiadomienie',
  MemberAdded: 'Dodano członka',
  MemberRemoved: 'Usunięto członka',
  MemberRoleChanged: 'Zmiana roli',
};

interface Props {
  entries: AuditEntryDto[] | undefined;
  loading?: boolean;
}

export default function AuditTimeline({ entries, loading }: Props) {
  if (loading) return <Text className="text-sm text-slate-500">Ładowanie historii...</Text>;
  if (!entries || entries.length === 0) {
    return (
      <Text className="text-sm text-slate-500 italic">
        Brak historii — zadanie nie miało jeszcze żadnych akcji.
      </Text>
    );
  }

  return (
    <View className="ml-2 border-l-2 border-slate-200 pl-4 gap-4">
      {entries.map((e) => (
        <View key={e.id}>
          <View className="flex-row items-center gap-2 mb-1 flex-wrap">
            <View className="bg-slate-100 px-2 py-0.5 rounded-full">
              <Text className="text-xs font-medium text-slate-700">
                {auditActionLabels[e.action] ?? e.action}
              </Text>
            </View>
            <Text className="text-xs text-slate-500">
              {new Date(e.timestamp).toLocaleString('pl-PL')}
            </Text>
          </View>
          {(e.performedByName || e.performedByEmail) && (
            <Text className="text-xs text-slate-500 mb-0.5">
              {e.performedByName ?? e.performedByEmail}
            </Text>
          )}
          {e.previousState && e.newState && e.previousState !== e.newState && (
            <Text className="text-xs text-slate-600">
              <Text style={{ textDecorationLine: 'line-through', opacity: 0.6 }}>
                {e.previousState}
              </Text>
              {' → '}
              {e.newState}
            </Text>
          )}
          {!e.previousState && e.newState && (
            <Text className="text-xs text-slate-600">{e.newState}</Text>
          )}
          {e.previousState && !e.newState && (
            <Text className="text-xs text-slate-600">{e.previousState}</Text>
          )}
        </View>
      ))}
    </View>
  );
}
