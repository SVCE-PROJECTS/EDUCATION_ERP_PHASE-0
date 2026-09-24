import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';

import {
  useRoute,
  useNavigation,
} from '@react-navigation/native';

import { useQuery } from '@tanstack/react-query';

import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Award,
  Briefcase,
  BookOpen,
  Pencil,
  FileText,
  ExternalLink,
  type LucideIconType,
} from '../../components/icons';

import { LinearGradient } from 'expo-linear-gradient';

import { facultyService } from '../../services/faculty.service';
import { documentService, FacultyDocument } from '../../services/document.service';
import { resolveFileUrl } from '../../services/api';

import Avatar from '../../components/ui/Avatar';

import {
  RoleBadge,
  StatusBadge,
} from '../../components/ui/Badge';

import Button from '../../components/ui/Button';

import {
  formatDate,
  formatExperience,
} from '../../utils/formatters';

import {
  colors,
  ThemeColors,
  shadows,
} from '../../theme/colors';

import { useTheme } from '../../context/ThemeContext';

import { ROUTES } from '../../navigation/routes';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Faculty } from '../../types';


// ─────────────────────────────────────────────────────────────────────────────
// Info Row
// ─────────────────────────────────────────────────────────────────────────────

interface InfoRowProps {
  icon: LucideIconType;
  label: string;
  value?: string | number | null;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: InfoRowProps) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  return (
    <View style={s.infoRow}>
      <Icon
        size={15}
        color={theme.textMuted}
        style={s.infoIcon}
      />

      <View style={s.infoContent}>
        <Text style={s.infoLabel}>
          {label}
        </Text>

        <Text style={s.infoValue}>
          {value ?? '—'}
        </Text>
      </View>
    </View>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Faculty Profile Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function FacultyProfileScreen() {
  const { colors: theme } = useTheme();

  const s = getStyles(theme);

  const route = useRoute<any>();

  const navigation = useNavigation<any>();

  const insets = useSafeAreaInsets();

  const { id } = route.params ?? {};


  // ───────────────────────────────────────────────────────────────────────────
  // Fetch Faculty
  // ───────────────────────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['faculty', id],

    queryFn: () =>
      facultyService.getById(id),

    enabled: !!id,

    retry: 1,
  });


  const f: Faculty | undefined =
    (data as any)?.data;


  // ───────────────────────────────────────────────────────────────────────────
  // Documents uploaded by this faculty member (read-only for HOD)
  // ───────────────────────────────────────────────────────────────────────────

  const {
    data: docsData,
    isLoading: docsLoading,
  } = useQuery({
    queryKey: ['faculty-documents', id],

    queryFn: () =>
      documentService.getForFaculty(id),

    enabled: !!id,
  });

  const documents: FacultyDocument[] =
    (docsData as any)?.data ?? [];


  // ───────────────────────────────────────────────────────────────────────────
  // Loading
  // ───────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View
        style={[
          s.center,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.primary}
        />
      </View>
    );
  }


  // ───────────────────────────────────────────────────────────────────────────
  // Error
  // ───────────────────────────────────────────────────────────────────────────

  if (isError || !f) {
    return (
      <View
        style={[
          s.center,
          {
            paddingTop: insets.top,
            padding: 24,
          },
        ]}
      >
        <Text style={s.errorText}>
          Could not load faculty profile.
          Please try again.
        </Text>

        <Button
          variant="ghost"
          onPress={() =>
            navigation.navigate(
              ROUTES.HOD_FACULTY
            )
          }
          style={s.backBtn}
        >
          <Text style={s.backBtnText}>
            Back to Faculty List
          </Text>
        </Button>
      </View>
    );
  }


  // ───────────────────────────────────────────────────────────────────────────
  // Personal Information
  // ───────────────────────────────────────────────────────────────────────────

  const personalInfo: InfoRowProps[] = [
    {
      icon: Mail,
      label: 'Email',
      value: f.email,
    },

    {
      icon: Phone,
      label: 'Phone',
      value: f.phone || '—',
    },

    {
      icon: Briefcase,
      label: 'Designation',
      value: f.designation,
    },

    {
      icon: BookOpen,
      label: 'Qualification',
      value: f.qualification,
    },
  ];


  // ───────────────────────────────────────────────────────────────────────────
  // Academic Information
  // ───────────────────────────────────────────────────────────────────────────

  const academicInfo: InfoRowProps[] = [
    {
      icon: Award,
      label: 'Specialization',
      value: f.specialization || '—',
    },

    {
      icon: Calendar,
      label: 'Experience',
      value: formatExperience(
        f.experience
      ),
    },

    {
      icon: Calendar,
      label: 'Joining Date',
      value: formatDate(
        f.joiningDate
      ),
    },

    {
      icon: Briefcase,
      label: 'Employee ID',
      value: f.employeeId,
    },
  ];


  // ───────────────────────────────────────────────────────────────────────────
  // Coordinator Roles
  // ───────────────────────────────────────────────────────────────────────────

  const coordRoles =
    f.roles?.filter(
      (fr) =>
        !['HOD', 'FACULTY'].includes(
          (fr.role || (fr as any)).slug
        )
    ) || [];


  // ───────────────────────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[
        s.root,
        {
          paddingTop: insets.top,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >

      {/* ─────────────────────────────────────────────────────────────────────
          Back Button
      ───────────────────────────────────────────────────────────────────── */}

      <TouchableOpacity
        style={s.backRow}
        onPress={() =>
          navigation.goBack()
        }
        hitSlop={{
          top: 8,
          bottom: 8,
          left: 8,
          right: 8,
        }}
      >
        <ArrowLeft
          size={16}
          color={theme.textSecondary}
        />

        <Text style={s.backText}>
          Back to Faculty Management
        </Text>
      </TouchableOpacity>


      {/* ─────────────────────────────────────────────────────────────────────
          Profile Header
      ───────────────────────────────────────────────────────────────────── */}

      <View style={s.profileCard}>

        <LinearGradient
          colors={theme.gradientPrimary}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 0,
          }}
          style={s.coverGradient}
        />


        <View style={s.profileBody}>

          <View style={s.profileTop}>

            <Avatar
              src={resolveFileUrl(f.photoUrl)}
              name={f.name}
              size="2xl"
              style={s.profileAvatar}
            />


            <View style={s.profileActions}>

              <StatusBadge
                status={f.status}
              />


              <Button
                variant="outline"
                size="sm"
                onPress={() =>
                  navigation.navigate(
                    ROUTES.FACULTY_EDIT,
                    {
                      id: (
                        f as any
                      ).employeeId,
                    }
                  )
                }
              >
                <View
                  style={
                    s.editBtnInner
                  }
                >
                  <Pencil
                    size={13}
                    color={theme.textSecondary}
                  />

                  <Text
                    style={
                      s.editBtnText
                    }
                  >
                    Edit
                  </Text>
                </View>
              </Button>

            </View>

          </View>


          <Text style={s.profileName}>
            {f.name}
          </Text>


          <Text style={s.profileSub}>
            {f.designation}
            {' · '}
            {f.department?.name}
          </Text>


          <View
            style={s.roleBadgeRow}
          >
            {f.roles?.map((fr) => {

              const role =
                fr.role ||
                (fr as any);

              return (
                <RoleBadge
                  key={
                    role.id ||
                    role.slug
                  }
                  slug={role.slug}
                  name={role.name}
                />
              );
            })}
          </View>

        </View>

      </View>


      {/* ─────────────────────────────────────────────────────────────────────
          Information Grid
      ───────────────────────────────────────────────────────────────────── */}

      <View style={s.infoGrid}>

        {/* Personal Information */}

        <View style={s.infoCard}>

          <Text
            style={
              s.infoSectionTitle
            }
          >
            PERSONAL INFORMATION
          </Text>


          {personalInfo.map(
            (item) => (
              <InfoRow
                key={item.label}
                {...item}
              />
            )
          )}

        </View>


        {/* Academic Details */}

        <View style={s.infoCard}>

          <Text
            style={
              s.infoSectionTitle
            }
          >
            ACADEMIC DETAILS
          </Text>


          {academicInfo.map(
            (item) => (
              <InfoRow
                key={item.label}
                {...item}
              />
            )
          )}

        </View>

      </View>


      {/* ─────────────────────────────────────────────────────────────────────
          Coordinator Roles
      ───────────────────────────────────────────────────────────────────── */}

      {coordRoles.length > 0 && (

        <View
          style={[
            s.infoCard,
            s.coordCard,
          ]}
        >

          <Text
            style={
              s.infoSectionTitle
            }
          >
            COORDINATOR ROLES
          </Text>


          <View
            style={
              s.coordBadges
            }
          >

            {coordRoles.map(
              (fr) => {

                const role =
                  fr.role ||
                  (fr as any);

                return (
                  <View
                    key={
                      role.id ||
                      role.slug
                    }
                    style={
                      s.coordBadge
                    }
                  >

                    <RoleBadge
                      slug={role.slug}
                      name={role.name}
                      size="lg"
                    />


                    {fr.assignedAt && (
                      <Text
                        style={
                          s.coordSince
                        }
                      >
                        since{' '}
                        {formatDate(
                          fr.assignedAt
                        )}
                      </Text>
                    )}

                  </View>
                );
              }
            )}

          </View>

        </View>

      )}


      {/* ─────────────────────────────────────────────────────────────────────
          Faculty Documents (uploaded by the faculty member — read only here)
      ───────────────────────────────────────────────────────────────────── */}

      <View
        style={[
          s.infoCard,
          s.coordCard,
          { marginTop: 12 },
        ]}
      >

        <Text
          style={
            s.infoSectionTitle
          }
        >
          FACULTY DOCUMENTS
        </Text>

        {docsLoading ? (

          <ActivityIndicator
            color={theme.primary}
            style={{ marginTop: 4 }}
          />

        ) : documents.length === 0 ? (

          <Text style={s.docsEmptyText}>
            This faculty member hasn't uploaded any documents yet.
          </Text>

        ) : (

          <View style={s.docsList}>

            {documents.map((doc) => (

              <TouchableOpacity
                key={doc.id}
                style={s.docRow}
                activeOpacity={0.75}
                onPress={() => {
                  const url = resolveFileUrl(doc.filePath);
                  if (url) Linking.openURL(url).catch(() => {});
                }}
              >

                <FileText
                  size={16}
                  color={theme.primary}
                />

                <View
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <Text
                    style={s.docName}
                    numberOfLines={1}
                  >
                    {doc.documentName}
                  </Text>

                  <Text style={s.docMeta}>
                    {formatDate(doc.uploadedAt)}
                  </Text>
                </View>

                <ExternalLink
                  size={14}
                  color={theme.textMuted}
                />

              </TouchableOpacity>

            ))}

          </View>

        )}

      </View>


      <View
        style={{
          height: 32,
        }}
      />

    </ScrollView>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const getStyles = (theme: ThemeColors) => StyleSheet.create({

  root: {
    flex: 1,
    backgroundColor:
      theme.background,
    paddingHorizontal: 16,
  },


  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      theme.background,
  },


  errorText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },


  backBtn: {
    marginTop: 16,
  },


  backBtnText: {
    fontSize: 14,
    color: theme.primary,
  },


  // ─────────────────────────────────────────────────────────────────────────
  // Back Row
  // ─────────────────────────────────────────────────────────────────────────

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
  },


  backText: {
    fontSize: 13,
    color: theme.textSecondary,
  },


  // ─────────────────────────────────────────────────────────────────────────
  // Profile Card
  // ─────────────────────────────────────────────────────────────────────────

  profileCard: {
    backgroundColor:
      theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
    ...shadows.card,
  },


  coverGradient: {
    height: 100,
  },


  profileBody: {
    padding: 20,
  },


  profileTop: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'flex-end',
    marginTop: -52,
    marginBottom: 12,
  },


  profileAvatar: {
    borderWidth: 4,
    borderColor:
      colors.white,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.15,

    shadowRadius: 8,

    elevation: 5,
  },


  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },


  editBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },


  editBtnText: {
    fontSize: 12,
    color: theme.textSecondary,
  },


  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.textPrimary,
  },


  profileSub: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },


  roleBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },


  // ─────────────────────────────────────────────────────────────────────────
  // Information Cards
  // ─────────────────────────────────────────────────────────────────────────

  infoGrid: {
    gap: 12,
    marginTop: 12,
  },


  infoCard: {
    backgroundColor:
      theme.surface,

    borderRadius: 20,

    borderWidth: 1,

    borderColor:
      theme.border,

    padding: 20,

    gap: 12,

    ...shadows.card,
  },


  infoSectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },


  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },


  infoIcon: {
    marginTop: 2,
  },


  infoContent: {},


  infoLabel: {
    fontSize: 11,
    color: theme.textMuted,
  },


  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.textPrimary,
    marginTop: 1,
  },


  // ─────────────────────────────────────────────────────────────────────────
  // Coordinator Roles
  // ─────────────────────────────────────────────────────────────────────────

  coordCard: {
    marginTop: 0,
  },


  coordBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },


  coordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,

    paddingHorizontal: 12,

    paddingVertical: 8,

    backgroundColor:
      theme.primarySoft,

    borderRadius: 14,
  },


  coordSince: {
    fontSize: 11,
    color: theme.textMuted,
  },


  // ─────────────────────────────────────────────────────────────────────────
  // Faculty Documents
  // ─────────────────────────────────────────────────────────────────────────

  docsEmptyText: {
    fontSize: 13,
    color: theme.textMuted,
  },

  docsList: {
    gap: 8,
  },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.primarySoft,
  },

  docName: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textPrimary,
  },

  docMeta: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 1,
  },

});