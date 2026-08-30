import React from 'react';
import { Zap } from '../../../components/icons';
import ActivityListScreen from '../../../components/activities/ActivityListScreen';
import ActivityCard from '../../../components/activities/ActivityCard';
import { useIndustryProjectList, useCreateIndustryProject, useUpdateIndustryProject, useDeleteIndustryProject } from '../../../hooks/useActivities';
import { colors } from '../../../theme/colors';
import { FieldDescriptor } from '../../../components/activities/ActivityFormModal';
import { getActivityGroupKey, getActivityStudents, getDescriptionValue } from '../../../components/activities/activityUtils';

const STATUS_OPTIONS = [
  { label: 'Ongoing', value: 'ONGOING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Paused', value: 'PAUSED' },
];
const DOMAIN_OPTIONS = [
  { label: 'Web Development', value: 'WEB' },
  { label: 'Mobile Development', value: 'MOBILE' },
  { label: 'AI / ML', value: 'AI_ML' },
  { label: 'Data Science', value: 'DATA' },
  { label: 'Embedded / IoT', value: 'EMBEDDED' },
  { label: 'Cloud / DevOps', value: 'CLOUD' },
  { label: 'Cybersecurity', value: 'SECURITY' },
  { label: 'Other', value: 'OTHER' },
];

const FIELDS: FieldDescriptor[] = [
  { name: 'student_id', label: 'Student USN', required: true },
  { name: 'projectName', label: 'Project Title', required: true },
  { name: 'status', label: 'Status', required: true, type: 'select', options: STATUS_OPTIONS },
  { name: 'academicYear', label: 'Academic Year' },
  { name: 'domain', label: 'Domain', type: 'select', options: DOMAIN_OPTIONS },
];

const ACCENT = colors.violet[500];

export default function RealTimeIndustryProjects() {
  return (
    <ActivityListScreen<any>
      title="Real-Time Industry Projects"
      accentColor={ACCENT}
      icon={Zap}
      useListHook={useIndustryProjectList}
      useCreateHook={useCreateIndustryProject}
      useUpdateHook={useUpdateIndustryProject}
      useDeleteHook={useDeleteIndustryProject}
      fields={FIELDS}
      getGroupKey={getActivityGroupKey}
      getStudents={getActivityStudents}
      renderCard={({ item, items, students, onEdit, onDelete }) => (
        <ActivityCard
          title={item.title}
          subtitle={item.companyName || item.company_name || undefined}
          accentColor={ACCENT}
          students={students}
          chips={[
            { label: 'Domain', value: item.domain || getDescriptionValue(item, 'domain'), highlight: true },
            { label: 'Status', value: item.status || getDescriptionValue(item, 'projectStatus') },
            { label: 'Academic Year', value: item.academic_year },
          ]}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item)}
          // Each student here is backed by their own real activities row
          // (student.activityId). Editing/deleting a student edits/deletes
          // that specific row — if it's the only student on the project,
          // that also removes the whole project card, same as the top-level
          // delete button.
          onEditStudent={(student) => {
            const row = items.find((r) => String(r.id) === String(student.activityId));
            if (row) onEdit(row);
          }}
          onDeleteStudent={(student) => {
            const row = items.find((r) => String(r.id) === String(student.activityId));
            if (row) onDelete(row);
          }}
        />
      )}
    />
  );
}
