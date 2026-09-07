import React from 'react';
import { Star } from '../../../components/icons';
import ActivityListScreen from '../../../components/activities/ActivityListScreen';
import ActivityCard from '../../../components/activities/ActivityCard';
import { useOtherCurricularList, useCreateOtherCurricular, useUpdateOtherCurricular, useDeleteOtherCurricular } from '../../../hooks/useActivities';
import { colors } from '../../../theme/colors';
import { FieldDescriptor } from '../../../components/activities/ActivityFormModal';
import { getActivityGroupKey, getActivityStudents, getDescriptionValue } from '../../../components/activities/activityUtils';

const TYPE_OPTIONS = [
  { label: 'Workshop', value: 'WORKSHOP' },
  { label: 'Seminar', value: 'SEMINAR' },
  { label: 'Competition', value: 'COMPETITION' },
  { label: 'Certification', value: 'CERTIFICATION' },
  { label: 'Internship', value: 'INTERNSHIP' },
  { label: 'Paper Publication', value: 'PAPER' },
  { label: 'Other', value: 'OTHER' },
];

const FIELDS: FieldDescriptor[] = [
  { name: 'student_id', label: 'Student USN', required: true },
  { name: 'eventName', label: 'Activity Name', required: true },
  { name: 'organizingCollege', label: 'Organizer' },
  { name: 'achievement', label: 'Achievement / Certificate' },
  { name: 'year', label: 'Year', type: 'number' },
  { name: 'academicYear', label: 'Academic Year' },
  { name: 'activityType', label: 'Activity Type', type: 'select', options: TYPE_OPTIONS },
];

const ACCENT = colors.teal[500];

export default function OtherCurricularActivities() {
  return (
    <ActivityListScreen<any>
      title="Other Curricular Activities"
      accentColor={ACCENT}
      icon={Star}
      useListHook={useOtherCurricularList}
      useCreateHook={useCreateOtherCurricular}
      useUpdateHook={useUpdateOtherCurricular}
      useDeleteHook={useDeleteOtherCurricular}
      fields={FIELDS}
      getGroupKey={getActivityGroupKey}
      getStudents={getActivityStudents}
      renderCard={({ item, items, students, onEdit, onDelete }) => (
        <ActivityCard
          title={item.title}
          accentColor={ACCENT}
          students={students}
          chips={[
            { label: 'Achievement', value: item.achievement || getDescriptionValue(item, 'achievement'), highlight: true },
            { label: 'Organizer', value: item.organizingCollege || getDescriptionValue(item, 'organizingCollege') },
            { label: 'Academic Year', value: item.academic_year },
          ]}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item)}
          // Rows can share a card when they have the same title + academic
          // year (e.g. several students at the same event) — each student
          // here is backed by their own real activities row, so edit/delete
          // acts on that specific row only.
          onEditStudent={(student) => {
            const row = items.find((r: any) => String(r.id) === String(student.activityId));
            if (row) onEdit(row);
          }}
          onDeleteStudent={(student) => {
            const row = items.find((r: any) => String(r.id) === String(student.activityId));
            if (row) onDelete(row);
          }}
        />
      )}
    />
  );
}
