import { useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator, ScrollView } from '../lib/rn';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { projectsApi } from '../api/endpoints';
import type { ProjectMemberDto } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import ConfirmDialog from './ConfirmDialog';

const roleLabels: Record<number, string> = { 0: 'Member', 1: 'Admin', 2: 'Owner' };
const roleBg: Record<number, string> = {
  0: 'bg-slate-100',
  1: 'bg-blue-100',
  2: 'bg-amber-100',
};
const roleText: Record<number, string> = {
  0: 'text-slate-700',
  1: 'text-blue-800',
  2: 'text-amber-800',
};

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
  projectId: string;
  isOwner: boolean;
}

export default function MembersPanel({ projectId, isOwner }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [confirmRemove, setConfirmRemove] = useState<ProjectMemberDto | null>(null);
  const [auditMember, setAuditMember] = useState<ProjectMemberDto | null>(null);
  const [rolePicker, setRolePicker] = useState<ProjectMemberDto | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => projectsApi.listMembers(projectId),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: number }) =>
      projectsApi.updateMemberRole(projectId, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', projectId] });
      Toast.show({ type: 'success', text1: 'Zmieniono rolę' });
      setRolePicker(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(projectId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      Toast.show({ type: 'success', text1: 'Usunięto członka' });
      setConfirmRemove(null);
    },
  });

  return (
    <View className="bg-white rounded-xl border border-slate-200 p-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Ionicons name="people-outline" size={16} color="#64748b" />
        <Text className="text-sm font-semibold text-slate-500 uppercase">
          Członkowie ({members?.length ?? 0})
        </Text>
      </View>

      {isLoading && <Text className="text-sm text-slate-500">Ładowanie...</Text>}

      <View className="divide-y divide-slate-200">
        {members?.map((m) => {
          const isMe = m.email === user?.email;
          return (
            <View key={m.userId} className="py-3 flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-brand-100 items-center justify-center">
                <Text className="text-brand-700 font-semibold text-sm">
                  {m.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-2 flex-wrap">
                  <Text className="font-medium text-slate-900 text-sm" numberOfLines={1}>
                    {m.displayName}
                  </Text>
                  {isMe && (
                    <View className="bg-brand-50 px-1.5 py-0.5 rounded">
                      <Text className="text-[10px] text-brand-700 font-semibold uppercase">Ty</Text>
                    </View>
                  )}
                  {m.isOwner && (
                    <View className="bg-amber-100 px-1.5 py-0.5 rounded flex-row items-center gap-0.5">
                      <Ionicons name="shield-checkmark" size={10} color="#92400e" />
                      <Text className="text-[10px] text-amber-800 font-semibold uppercase">Owner</Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-slate-500" numberOfLines={1}>{m.email}</Text>
              </View>

              <View className="flex-row items-center gap-1">
                {isOwner && !m.isOwner ? (
                  <Pressable
                    onPress={() => setRolePicker(m)}
                    className={`px-2 py-1 rounded-full ${roleBg[m.role]} flex-row items-center gap-0.5`}
                  >
                    <Text className={`text-xs font-medium ${roleText[m.role]}`}>{roleLabels[m.role]}</Text>
                    <Ionicons name="chevron-down" size={10} color="#475569" />
                  </Pressable>
                ) : (
                  <View className={`px-2 py-1 rounded-full ${roleBg[m.role]}`}>
                    <Text className={`text-xs font-medium ${roleText[m.role]}`}>{roleLabels[m.role]}</Text>
                  </View>
                )}

                <Pressable
                  onPress={() => setAuditMember(m)}
                  hitSlop={6}
                  className="p-1 rounded active:bg-slate-100"
                >
                  <Ionicons name="time-outline" size={18} color="#64748b" />
                </Pressable>

                {isOwner && !m.isOwner && (
                  <Pressable
                    onPress={() => setConfirmRemove(m)}
                    hitSlop={6}
                    className="p-1 rounded active:bg-rose-50"
                  >
                    <Ionicons name="trash-outline" size={18} color="#64748b" />
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <ConfirmDialog
        open={confirmRemove !== null}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && removeMutation.mutate(confirmRemove.userId)}
        title="Usunąć członka?"
        description={`Użytkownik "${confirmRemove?.displayName}" (${confirmRemove?.email}) zostanie usunięty z projektu i straci dostęp.`}
        confirmLabel="Usuń"
        destructive
        loading={removeMutation.isPending}
      />

      <RolePickerModal
        member={rolePicker}
        onClose={() => setRolePicker(null)}
        onSelect={(role) => rolePicker && updateRoleMutation.mutate({ userId: rolePicker.userId, role })}
        loading={updateRoleMutation.isPending}
      />

      <MemberAuditModal projectId={projectId} member={auditMember} onClose={() => setAuditMember(null)} />
    </View>
  );
}

function RolePickerModal({
  member,
  onClose,
  onSelect,
  loading,
}: {
  member: ProjectMemberDto | null;
  onClose: () => void;
  onSelect: (role: number) => void;
  loading: boolean;
}) {
  return (
    <Modal visible={member !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-slate-900/60 items-center justify-center px-6">
        <Pressable className="w-full max-w-xs bg-white rounded-2xl p-4">
          <Text className="text-base font-semibold text-slate-900 mb-3">Zmień rolę</Text>
          {[0, 1].map((r) => (
            <Pressable
              key={r}
              onPress={() => onSelect(r)}
              disabled={loading || member?.role === r}
              className={`flex-row items-center justify-between p-3 rounded-lg ${member?.role === r ? 'bg-brand-50' : 'active:bg-slate-100'}`}
            >
              <Text className={`text-sm font-medium ${member?.role === r ? 'text-brand-700' : 'text-slate-900'}`}>
                {roleLabels[r]}
              </Text>
              {member?.role === r && <Ionicons name="checkmark" size={18} color="#0566c9" />}
            </Pressable>
          ))}
          {loading && <ActivityIndicator color="#0566c9" className="mt-2" />}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MemberAuditModal({
  projectId,
  member,
  onClose,
}: {
  projectId: string;
  member: ProjectMemberDto | null;
  onClose: () => void;
}) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['member-audit', projectId, member?.userId],
    queryFn: () => projectsApi.memberAudit(projectId, member!.userId),
    enabled: !!member,
  });

  return (
    <Modal visible={member !== null} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-white">
        <View className="flex-row justify-between items-start p-5 border-b border-slate-200">
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">Historia: {member?.displayName}</Text>
            <Text className="text-sm text-slate-500">
              {member?.email} · ostatnie 100 akcji w projekcie
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color="#475569" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-5">
          {isLoading && <Text className="text-sm text-slate-500">Ładowanie historii...</Text>}
          {entries && entries.length === 0 && (
            <Text className="text-sm text-slate-500 italic">Brak historii — ten użytkownik nie wykonał żadnych akcji w projekcie.</Text>
          )}
          <View className="ml-2 border-l-2 border-slate-200 pl-4 gap-4">
            {entries?.map((e) => (
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
                {e.previousState && e.newState && e.previousState !== e.newState && (
                  <Text className="text-xs text-slate-600">
                    <Text style={{ textDecorationLine: 'line-through', opacity: 0.6 }}>{e.previousState}</Text>
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
        </ScrollView>
      </View>
    </Modal>
  );
}
