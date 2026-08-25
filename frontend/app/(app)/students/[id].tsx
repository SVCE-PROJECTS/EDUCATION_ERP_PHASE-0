/**
 * Student Profile — /students/:id
 * Tabs: Overview | Attendance | IA Marks | Assignments | Achievements
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import api from '../../../src/services/api';
import { safeInitials } from '../../../src/utils/numbers';
import Colors from '../../../src/theme/colors';

// ── Types ─────────────────────────────────────────────────────────

type AchCategory = 'Certification' | 'Hackathon' | 'Event' | 'Competition' | 'Publication' | 'Award' | 'Other';

interface Student {
  usn: string;
  name: string;
  email?: string;
  phone?: string;
  semester: number | string;
  section: string;
  status: string;
  counsellor?: string;
}

interface AttendanceSummaryItem {
  subject: string;
  present: number;
  total: number;
  percent: number;
}

interface RecentAttendanceItem {
  subject: string;
  attendance_date: string;
  status: 'Present' | 'Absent';
}

interface IAMark {
  subject: string;
  ia1: number | string;
  ia2: number | string;
  ia3: number | string;
  average: number | string;
}

interface Assignment {
  title: string;
  subject: string;
  status: string;
  due_date?: string;
  marks: number | string;
}

interface Achievement {
  id: number;
  category: AchCategory;
  title: string;
  issuer?: string;
  date_achieved?: string;
  description?: string;
}

interface ProfileData {
  student: Student;
  attendanceSummary: AttendanceSummaryItem[];
  overallAttendance: number;
  recentAttendance: RecentAttendanceItem[];
  iaMarks: IAMark[];
  assignments: Assignment[];
  achievements: Achievement[];
}

interface AchForm {
  category: AchCategory;
  title: string;
  issuer: string;
  date_achieved: string;
  description: string;
}

// ── Constants ─────────────────────────────────────────────────────

const TABS = ['Overview', 'Attendance', 'IA Marks', 'Assignments', 'Achievements'] as const;
type Tab = typeof TABS[number];

const ACH_CATS: AchCategory[] = ['Certification', 'Hackathon', 'Event', 'Competition', 'Publication', 'Award', 'Other'];

const ACH_META: Record<AchCategory, { icon: string; color: string }> = {
  Certification: { icon: 'ribbon-outline',       color: Colors.primary  },
  Hackathon:     { icon: 'code-slash-outline',    color: Colors.purple   },
  Event:         { icon: 'calendar-outline',      color: Colors.warning  },
  Competition:   { icon: 'trophy-outline',        color: Colors.orange   },
  Publication:   { icon: 'document-text-outline', color: Colors.success  },
  Award:         { icon: 'star-outline',          color: Colors.danger   },
  Other:         { icon: 'grid-outline',          color: Colors.secondary},
};

const EMPTY: AchForm = { category: 'Certification', title: '', issuer: '', date_achieved: '', description: '' };

// ── Main Screen ───────────────────────────────────────────────────

export default function StudentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile,    setProfile]    = useState<ProfileData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [tab,        setTab]        = useState<Tab>('Overview');
  const [showAch,    setShowAch]    = useState(false);
  const [editAch,    setEditAch]    = useState<Achievement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<ProfileData>(`/students/${id}/profile`);
      setProfile(res.data); setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const delAch = (achId: number) =>
    Alert.alert('Delete', 'Remove this achievement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/achievements/${achId}`); load(); }
          catch { Alert.alert('Error', 'Could not delete.'); }
        },
      },
    ]);

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text style={s.loadTxt}>Loading profile...</Text>
    </View>
  );

  if (error || !profile) return (
    <View style={s.center}>
      <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
      <Text style={s.errTxt}>{error ?? 'Student not found.'}</Text>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backBtnTxt}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const {
    student, attendanceSummary, overallAttendance,
    recentAttendance, iaMarks, assignments, achievements = [],
  } = profile;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.hdr, { paddingTop: insets.top > 0 ? insets.top : 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.hdrBack}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle} numberOfLines={1}>{student.name}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>
              {safeInitials(student.name, 2)}
            </Text>
          </View>
          <Text style={s.heroName}>{student.name}</Text>
          <Text style={s.heroUsn}>{student.usn}</Text>
          <View style={s.heroBadges}>
            <HBadge icon="school-outline"        label={`Sem ${student.semester}`} />
            <HBadge icon="people-outline"        label={`Sec ${student.section}`} />
            {student.counsellor && <HBadge icon="person-circle-outline" label={student.counsellor} color="#FCD34D" />}
            <HBadge icon="ellipse" label={student.status} color={student.status === 'Active' ? Colors.success : Colors.danger} />
          </View>
          <View style={s.heroPills}>
            <HPill label="Attendance" value={`${overallAttendance}%`} color={overallAttendance >= 75 ? Colors.success : Colors.danger} />
            <HPill
              label="IA Avg"
              value={iaMarks.length
                ? `${(iaMarks.reduce((t, r) => t + Number(r.average), 0) / iaMarks.length).toFixed(1)}`
                : '—'}
              color={Colors.purple}
            />
            <HPill label="Achievements" value={String(achievements.length)} color={Colors.orange} />
          </View>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={s.tabsInner}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabOn]} onPress={() => setTab(t)}>
              <Text style={[s.tabTxt, tab === t && s.tabTxtOn]}>{t}</Text>
              {t === 'Achievements' && achievements.length > 0 && (
                <View style={s.tabBadge}><Text style={s.tabBadgeTxt}>{achievements.length}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        <View style={s.body}>
          {tab === 'Overview'     && <OverviewTab student={student} />}
          {tab === 'Attendance'   && <AttendanceTab summary={attendanceSummary} recent={recentAttendance} overall={overallAttendance} />}
          {tab === 'IA Marks'     && <IATab marks={iaMarks} />}
          {tab === 'Assignments'  && <AssignTab assignments={assignments} />}
          {tab === 'Achievements' && (
            <AchTab
              items={achievements}
              onAdd={() => { setEditAch(null); setShowAch(true); }}
              onEdit={a => { setEditAch(a); setShowAch(true); }}
              onDelete={delAch}
            />
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <AchModal
        visible={showAch}
        onClose={() => { setShowAch(false); setEditAch(null); }}
        onSaved={() => { setShowAch(false); setEditAch(null); load(); }}
        studentId={id!}
        usn={student.usn}
        edit={editAch}
      />
    </View>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────

function OverviewTab({ student }: { student: Student }) {
  const rows: { icon: string; label: string; val: string; hi?: boolean }[] = [
    { icon: 'id-card-outline',       label: 'USN',               val: student.usn },
    { icon: 'person-outline',        label: 'Full Name',         val: student.name },
    { icon: 'mail-outline',          label: 'Email',             val: student.email ?? '—' },
    { icon: 'call-outline',          label: 'Phone',             val: student.phone ?? '—' },
    { icon: 'school-outline',        label: 'Semester',          val: `Semester ${student.semester}` },
    { icon: 'people-outline',        label: 'Section',           val: student.section },
    { icon: 'ribbon-outline',        label: 'Status',            val: student.status },
    { icon: 'business-outline',      label: 'Department',        val: 'Computer Science & Engineering' },
    { icon: 'person-circle-outline', label: 'Counsellor/Mentor', val: student.counsellor ?? 'Not assigned', hi: true },
  ];
  return (
    <View style={s.infoCard}>
      {rows.map((r, i) => (
        <View key={i} style={[s.infoRow, i % 2 === 0 && s.infoAlt]}>
          <View style={s.infoL}>
            <View style={[s.infoIco, r.hi && { backgroundColor: Colors.purpleLight }]}>
              <Ionicons name={r.icon as any} size={13} color={r.hi ? Colors.purple : Colors.primary} />
            </View>
            <Text style={s.infoLTxt}>{r.label}</Text>
          </View>
          <Text style={[s.infoR, r.hi && { color: Colors.purple, fontWeight: '700' }]} numberOfLines={2}>{r.val}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Attendance Tab ────────────────────────────────────────────────

interface AttendanceTabProps {
  summary: AttendanceSummaryItem[];
  recent: RecentAttendanceItem[];
  overall: number;
}

function AttendanceTab({ summary, recent, overall }: AttendanceTabProps) {
  const bc = (p: number) => p >= 75 ? Colors.success : p >= 60 ? Colors.warning : Colors.danger;
  return (
    <View>
      <View style={[s.ovCard, { borderLeftColor: bc(overall) }]}>
        <View>
          <Text style={s.ovLbl}>Overall Attendance</Text>
          <Text style={[s.ovPct, { color: bc(overall) }]}>{overall}%</Text>
          <Text style={s.ovSub}>{overall < 75 ? '⚠ Below 75% — shortage!' : '✓ Good standing'}</Text>
        </View>
        <Ionicons name={overall >= 75 ? 'checkmark-circle' : 'warning'} size={40} color={bc(overall)} />
      </View>
      <Text style={s.secHd}>Subject-wise</Text>
      {!summary.length
        ? <Text style={s.noData}>No attendance records yet.</Text>
        : summary.map((item, i) => (
          <View key={i} style={s.attRow}>
            <Text style={s.attSub}>{item.subject}</Text>
            <Text style={s.attMeta}>{item.present}/{item.total} present</Text>
            <View style={s.attBar}>
              <View style={s.attBg}>
                <View style={[s.attFill, { width: `${item.percent}%` as any, backgroundColor: bc(item.percent) }]} />
              </View>
              <Text style={[s.attPct, { color: bc(item.percent) }]}>{item.percent}%</Text>
            </View>
          </View>
        ))
      }
      {recent.length > 0 && (
        <>
          <Text style={[s.secHd, { marginTop: 14 }]}>Recent Log</Text>
          {recent.map((r, i) => (
            <View key={i} style={s.logRow}>
              <View style={[s.logDot, { backgroundColor: r.status === 'Present' ? Colors.success : Colors.danger }]} />
              <Text style={s.logSub}>{r.subject}</Text>
              <Text style={s.logDate}>{String(r.attendance_date).split('T')[0]}</Text>
              <Text style={[s.logStat, { color: r.status === 'Present' ? Colors.success : Colors.danger }]}>{r.status}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

// ── IA Marks Tab ──────────────────────────────────────────────────

function IATab({ marks }: { marks: IAMark[] }) {
  if (!marks.length) return <Text style={s.noData}>No IA marks recorded.</Text>;
  const grade = (avg: number): { l: string; c: string } =>
    avg >= 18 ? { l: 'O',  c: Colors.success } :
    avg >= 15 ? { l: 'A+', c: Colors.primary } :
    avg >= 12 ? { l: 'A',  c: Colors.warning } :
                { l: 'B',  c: Colors.danger  };

  return (
    <View>
      {marks.map((m, i) => {
        const g = grade(Number(m.average));
        return (
          <View key={i} style={s.iaCard}>
            <View style={s.iaHd}>
              <Text style={s.iaSub}>{m.subject}</Text>
              <View style={[s.iaGrade, { backgroundColor: g.c + '22' }]}>
                <Text style={[s.iaGradeTxt, { color: g.c }]}>{g.l}</Text>
              </View>
            </View>
            <View style={s.scores}>
              {(['IA1', 'IA2', 'IA3'] as const).map((l, idx) => {
                const v = [m.ia1, m.ia2, m.ia3][idx];
                return (
                  <View key={l} style={s.scoreBox}>
                    <Text style={s.scoreVal}>{v}</Text>
                    <Text style={s.scoreMax}>/20</Text>
                    <Text style={s.scoreLbl}>{l}</Text>
                  </View>
                );
              })}
              <View style={[s.scoreBox, s.scoreHL]}>
                <Text style={[s.scoreVal, { color: Colors.primary }]}>{m.average}</Text>
                <Text style={s.scoreMax}>/20</Text>
                <Text style={s.scoreLbl}>Avg</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Assignments Tab ───────────────────────────────────────────────

function AssignTab({ assignments }: { assignments: Assignment[] }) {
  if (!assignments.length) return <Text style={s.noData}>No assignments for this semester.</Text>;
  return (
    <View>
      {assignments.map((a, i) => {
        const due  = a.due_date ? String(a.due_date).split('T')[0] : '—';
        const open = a.status === 'Open';
        return (
          <View key={i} style={s.asCard}>
            <View style={[s.asDot, { backgroundColor: open ? Colors.success : Colors.secondary }]} />
            <View style={s.asBody}>
              <Text style={s.asTitle}>{a.title}</Text>
              <Text style={s.asSub}>{a.subject}</Text>
              <View style={s.asMeta}>
                <View style={[s.asPill, { backgroundColor: open ? Colors.successLight : Colors.border }]}>
                  <Text style={[s.asPillTxt, { color: open ? Colors.success : Colors.textSecondary }]}>{a.status}</Text>
                </View>
                <Text style={s.asDue}>Due: {due}</Text>
                <Text style={s.asMarks}>{a.marks} marks</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Achievements Tab ──────────────────────────────────────────────

interface AchTabProps {
  items: Achievement[];
  onAdd: () => void;
  onEdit: (a: Achievement) => void;
  onDelete: (id: number) => void;
}

function AchTab({ items, onAdd, onEdit, onDelete }: AchTabProps) {
  const grouped = ACH_CATS.reduce<Record<string, Achievement[]>>((acc, cat) => {
    const list = items.filter(a => a.category === cat);
    if (list.length) acc[cat] = list;
    return acc;
  }, {});

  return (
    <View>
      <View style={s.achHdr}>
        <View>
          <Text style={s.achHdrTtl}>{items.length} Achievement{items.length !== 1 ? 's' : ''}</Text>
          <Text style={s.achHdrSub}>Certifications · Hackathons · Events · Awards</Text>
        </View>
        <TouchableOpacity style={s.achAddBtn} onPress={onAdd}>
          <Ionicons name="add" size={17} color={Colors.white} />
          <Text style={s.achAddTxt}>Add</Text>
        </TouchableOpacity>
      </View>

      {!items.length ? (
        <View style={s.achEmpty}>
          <Ionicons name="trophy-outline" size={56} color={Colors.border} />
          <Text style={s.achEmptyTtl}>No achievements yet</Text>
          <Text style={s.achEmptySub}>Add certifications, hackathons, awards and events</Text>
          <TouchableOpacity style={s.achEmptyBtn} onPress={onAdd}>
            <Ionicons name="add-circle-outline" size={15} color={Colors.white} />
            <Text style={s.achEmptyBtnTxt}>Add First Achievement</Text>
          </TouchableOpacity>
        </View>
      ) : (
        Object.entries(grouped).map(([cat, list]) => {
          const m = ACH_META[cat as AchCategory] ?? ACH_META.Other;
          return (
            <View key={cat} style={s.achGrp}>
              <View style={s.achGrpHd}>
                <View style={[s.achGrpIco, { backgroundColor: m.color + '20' }]}>
                  <Ionicons name={m.icon as any} size={14} color={m.color} />
                </View>
                <Text style={[s.achGrpTtl, { color: m.color }]}>{cat}</Text>
                <View style={[s.achGrpBdg, { backgroundColor: m.color + '20' }]}>
                  <Text style={[s.achGrpBdgTxt, { color: m.color }]}>{list.length}</Text>
                </View>
              </View>
              {list.map((a, i) => (
                <View key={i} style={s.achCard}>
                  <View style={[s.achStripe, { backgroundColor: m.color }]} />
                  <View style={s.achBody}>
                    <Text style={s.achTitle}>{a.title}</Text>
                    {a.issuer && (
                      <View style={s.achRow}>
                        <Ionicons name="business-outline" size={11} color={Colors.textMuted} />
                        <Text style={s.achMeta}>{a.issuer}</Text>
                      </View>
                    )}
                    {a.date_achieved && (
                      <View style={s.achRow}>
                        <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />
                        <Text style={s.achMeta}>{String(a.date_achieved).split('T')[0]}</Text>
                      </View>
                    )}
                    {a.description && <Text style={s.achDesc} numberOfLines={2}>{a.description}</Text>}
                  </View>
                  <View style={s.achActs}>
                    <TouchableOpacity style={s.achAct} onPress={() => onEdit(a)}>
                      <Ionicons name="create-outline" size={15} color={Colors.warning} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.achAct} onPress={() => onDelete(a.id)}>
                      <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          );
        })
      )}
    </View>
  );
}

// ── Achievement Modal ─────────────────────────────────────────────

interface AchModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  studentId: string;
  usn: string;
  edit: Achievement | null;
}

function AchModal({ visible, onClose, onSaved, studentId, usn, edit }: AchModalProps) {
  const [form,   setForm]   = useState<AchForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof AchForm) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    setForm(
      edit
        ? {
            category:      (edit.category ?? 'Certification') as AchCategory,
            title:         edit.title ?? '',
            issuer:        edit.issuer ?? '',
            date_achieved: edit.date_achieved ? String(edit.date_achieved).split('T')[0] : '',
            description:   edit.description ?? '',
          }
        : EMPTY
    );
  }, [edit, visible]);

  const save = async () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Enter a title.'); return; }
    setSaving(true);
    try {
      if (edit) await api.put(`/achievements/${edit.id}`, form);
      else await api.post('/achievements', { ...form, student_id: studentId, usn });
      onSaved();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const fields: { k: keyof AchForm; l: string; ph: string; multi?: boolean }[] = [
    { k: 'title',         l: 'Title *',               ph: 'e.g. AWS Cloud Practitioner' },
    { k: 'issuer',        l: 'Issuer / Organisation',  ph: 'e.g. Amazon Web Services' },
    { k: 'date_achieved', l: 'Date (YYYY-MM-DD)',      ph: '2026-06-15' },
    { k: 'description',   l: 'Description (optional)', ph: 'Brief description', multi: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalSheet}>
          <View style={s.modalHd}>
            <Text style={s.modalTtl}>{edit ? 'Edit Achievement' : 'Add Achievement'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            <Text style={s.fldLbl}>Category *</Text>
            <View style={s.pickerBox}>
              <Picker selectedValue={form.category} onValueChange={v => set('category')(v)} style={{ height: 50 }}>
                {ACH_CATS.map(c => <Picker.Item key={c} label={c} value={c} />)}
              </Picker>
            </View>
            {fields.map(f => (
              <View key={f.k}>
                <Text style={s.fldLbl}>{f.l}</Text>
                <TextInput
                  style={[s.fldInput, f.multi && { height: 70, textAlignVertical: 'top' }]}
                  placeholder={f.ph}
                  placeholderTextColor={Colors.textMuted}
                  value={form[f.k]}
                  onChangeText={set(f.k)}
                  multiline={!!f.multi}
                />
              </View>
            ))}
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalSave} onPress={save} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={s.modalSaveTxt}>{edit ? 'Update' : 'Save'}</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={s.modalCancel} onPress={onClose}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Small helpers ─────────────────────────────────────────────────

function HBadge({ icon, label, color }: { icon: string; label: string; color?: string }) {
  return (
    <View style={s.hBadge}>
      <Ionicons name={icon as any} size={11} color={color ?? Colors.white} />
      <Text style={[s.hBadgeTxt, color ? { color } : undefined]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function HPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.hPill, { borderTopColor: color }]}>
      <Text style={[s.hPillVal, { color }]}>{value}</Text>
      <Text style={s.hPillLbl}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  loadTxt:        { fontSize: 14, color: Colors.textSecondary },
  errTxt:         { fontSize: 14, color: Colors.danger, textAlign: 'center' },
  backBtn:        { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  backBtnTxt:     { color: Colors.white, fontWeight: '700' },
  hdr:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  hdrBack:        { width: 32 },
  hdrTitle:       { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  hero:           { backgroundColor: Colors.primary, alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  avatar:         { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: Colors.white, marginBottom: 10 },
  avatarTxt:      { fontSize: 28, fontWeight: '900', color: Colors.white },
  heroName:       { fontSize: 20, fontWeight: '800', color: Colors.white },
  heroUsn:        { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2, marginBottom: 10 },
  heroBadges:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 },
  hBadge:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  hBadgeTxt:      { fontSize: 10, color: Colors.white, fontWeight: '600', maxWidth: 110 },
  heroPills:      { flexDirection: 'row', gap: 8 },
  hPill:          { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 10, alignItems: 'center', borderTopWidth: 3 },
  hPillVal:       { fontSize: 16, fontWeight: '800' },
  hPillLbl:       { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  tabs:           { marginTop: 10 },
  tabsInner:      { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  tab:            { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  tabOn:          { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabTxt:         { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  tabTxtOn:       { color: Colors.white },
  tabBadge:       { backgroundColor: Colors.orange, borderRadius: 8, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabBadgeTxt:    { fontSize: 10, color: Colors.white, fontWeight: '800' },
  body:           { paddingHorizontal: 16, paddingTop: 14 },
  secHd:          { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  noData:         { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  infoCard:       { backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  infoRow:        { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  infoAlt:        { backgroundColor: Colors.background },
  infoL:          { flexDirection: 'row', alignItems: 'center', width: 148 },
  infoIco:        { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  infoLTxt:       { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  infoR:          { flex: 1, fontSize: 12, color: Colors.textPrimary },
  ovCard:         { backgroundColor: Colors.white, borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  ovLbl:          { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  ovPct:          { fontSize: 36, fontWeight: '900', marginTop: 2 },
  ovSub:          { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  attRow:         { backgroundColor: Colors.white, borderRadius: 10, padding: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  attSub:         { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  attMeta:        { fontSize: 11, color: Colors.textMuted, marginTop: 1, marginBottom: 6 },
  attBar:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attBg:          { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  attFill:        { height: '100%', borderRadius: 4 },
  attPct:         { fontSize: 13, fontWeight: '700', minWidth: 38, textAlign: 'right' },
  logRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8 },
  logDot:         { width: 8, height: 8, borderRadius: 4 },
  logSub:         { flex: 1, fontSize: 12, color: Colors.textPrimary },
  logDate:        { fontSize: 11, color: Colors.textMuted },
  logStat:        { fontSize: 11, fontWeight: '700', minWidth: 52, textAlign: 'right' },
  iaCard:         { backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  iaHd:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  iaSub:          { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  iaGrade:        { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  iaGradeTxt:     { fontSize: 13, fontWeight: '800' },
  scores:         { flexDirection: 'row', gap: 8 },
  scoreBox:       { flex: 1, backgroundColor: Colors.background, borderRadius: 10, padding: 10, alignItems: 'center' },
  scoreHL:        { backgroundColor: Colors.primaryLight },
  scoreVal:       { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  scoreMax:       { fontSize: 10, color: Colors.textMuted },
  scoreLbl:       { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  asCard:         { backgroundColor: Colors.white, borderRadius: 12, padding: 12, flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  asDot:          { width: 10, height: 10, borderRadius: 5, marginRight: 10, marginTop: 4 },
  asBody:         { flex: 1 },
  asTitle:        { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  asSub:          { fontSize: 11, color: Colors.textSecondary, marginBottom: 5 },
  asMeta:         { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  asPill:         { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  asPillTxt:      { fontSize: 10, fontWeight: '700' },
  asDue:          { fontSize: 10, color: Colors.textMuted },
  asMarks:        { fontSize: 10, color: Colors.textMuted },
  achHdr:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  achHdrTtl:      { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  achHdrSub:      { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  achAddBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.orange, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  achAddTxt:      { color: Colors.white, fontWeight: '700', fontSize: 13 },
  achEmpty:       { alignItems: 'center', paddingVertical: 40, gap: 10 },
  achEmptyTtl:    { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  achEmptySub:    { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  achEmptyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.orange, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, marginTop: 6 },
  achEmptyBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  achGrp:         { marginBottom: 14 },
  achGrpHd:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  achGrpIco:      { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  achGrpTtl:      { fontSize: 13, fontWeight: '700', flex: 1 },
  achGrpBdg:      { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  achGrpBdgTxt:   { fontSize: 11, fontWeight: '800' },
  achCard:        { backgroundColor: Colors.white, borderRadius: 12, marginBottom: 8, flexDirection: 'row', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  achStripe:      { width: 4 },
  achBody:        { flex: 1, padding: 12 },
  achTitle:       { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  achRow:         { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  achMeta:        { fontSize: 11, color: Colors.textMuted },
  achDesc:        { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 17 },
  achActs:        { flexDirection: 'column', justifyContent: 'center', gap: 8, padding: 10 },
  achAct:         { padding: 6 },
  modalBg:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:     { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  modalHd:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTtl:       { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  fldLbl:         { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 5, marginTop: 10 },
  pickerBox:      { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, overflow: 'hidden', backgroundColor: Colors.background },
  fldInput:       { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.textPrimary },
  modalBtns:      { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 6 },
  modalSave:      { flex: 1, backgroundColor: Colors.success, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  modalSaveTxt:   { color: Colors.white, fontWeight: '700', fontSize: 15 },
  modalCancel:    { flex: 1, backgroundColor: Colors.background, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  modalCancelTxt: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
});