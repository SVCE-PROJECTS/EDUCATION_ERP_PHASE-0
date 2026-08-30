import React from 'react';
import { Music2 } from '../../../components/icons';
import ActivityListScreen from '../../../components/activities/ActivityListScreen';
import ActivityCard from '../../../components/activities/ActivityCard';
import { useCulturalActivityList, useCreateCulturalActivity, useUpdateCulturalActivity, useDeleteCulturalActivity } from '../../../hooks/useActivities';
import { colors } from '../../../theme/colors';
import { FieldDescriptor } from '../../../components/activities/ActivityFormModal';
import { getActivityGroupKey, getActivityStudents, getDescriptionValue } from '../../../components/activities/activityUtils';

const PARTICIPATION_OPTIONS = [
  { label: 'Participant', value: 'PARTICIPANT' },
  { label: 'Winner', value: 'WINNER' },
  { label: 'Runner-Up', value: 'RUNNER_UP' },
];
const FIELDS: FieldDescriptor[] = [
  { name: 'student_id', label: 'Student USN', required: true },
  { name: 'eventName', label: 'Event Name', required: true },
  { name: 'category', label: 'Category', required: true },
  { name: 'participation', label: 'Participation', required: true, type: 'select', options: PARTICIPATION_OPTIONS },
  { name: 'year', label: 'Year', type: 'number' },
  { name: 'academicYear', label: 'Academic Year' },
];
const ACCENT = colors.pink[500];

export default function CulturalActivities() {
  return (
    <ActivityListScreen<any>
      title="Cultural Activities"
      accentColor={ACCENT}
      icon={Music2}
      useListHook={useCulturalActivityList}
      useCreateHook={useCreateCulturalActivity}
      useUpdateHook={useUpdateCulturalActivity}
      useDeleteHook={useDeleteCulturalActivity}
      fields={FIELDS}
      getGroupKey={getActivityGroupKey}
      getStudents={getActivityStudents}
      renderCard={({ item, items, students, onEdit, onDelete }) => (
        <ActivityCard
          title={item.title}
          accentColor={ACCENT}
          students={students}
          chips={[
            { label: 'Category', value: item.category || getDescriptionValue(item, 'category'), highlight: true },
            { label: 'Participation', value: item.participation || getDescriptionValue(item, 'participation') },
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
