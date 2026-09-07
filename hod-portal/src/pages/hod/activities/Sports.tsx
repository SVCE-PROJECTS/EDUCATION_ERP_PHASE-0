import React from 'react';
import { Trophy } from '../../../components/icons';
import ActivityListScreen from '../../../components/activities/ActivityListScreen';
import ActivityCard from '../../../components/activities/ActivityCard';
import { useSportsActivityList, useCreateSportsActivity, useUpdateSportsActivity, useDeleteSportsActivity } from '../../../hooks/useActivities';
import { colors } from '../../../theme/colors';
import { FieldDescriptor } from '../../../components/activities/ActivityFormModal';
import { getActivityGroupKey, getActivityStudents, getDescriptionValue } from '../../../components/activities/activityUtils';

const LEVEL_OPTIONS = [
  { label: 'District', value: 'DISTRICT' },
  { label: 'State', value: 'STATE' },
  { label: 'National', value: 'NATIONAL' },
  { label: 'International', value: 'INTERNATIONAL' },
];

const FIELDS: FieldDescriptor[] = [
  { name: 'student_id', label: 'Student USN', required: true },
  { name: 'sportName', label: 'Sport Name', required: true },
  { name: 'competitionLevel', label: 'Level', required: true, type: 'select', options: LEVEL_OPTIONS },
  { name: 'positionMedal', label: 'Position / Medal' },
  { name: 'academicYear', label: 'Academic Year' },
];

const ACCENT = colors.orange[500];

export default function Sports() {
  return (
    <ActivityListScreen<any>
      title="Sports Activities"
      accentColor={ACCENT}
      icon={Trophy}
      useListHook={useSportsActivityList}
      useCreateHook={useCreateSportsActivity}
      useUpdateHook={useUpdateSportsActivity}
      useDeleteHook={useDeleteSportsActivity}
      fields={FIELDS}
      getGroupKey={getActivityGroupKey}
      getStudents={getActivityStudents}
      renderCard={({ item, items, students, onEdit, onDelete }) => (
        <ActivityCard
          title={item.title}
          accentColor={ACCENT}
          students={students}
          chips={[
            { label: 'Level', value: item.competitionLevel || getDescriptionValue(item, 'competitionLevel'), highlight: true },
            { label: 'Position', value: item.positionMedal || getDescriptionValue(item, 'positionMedal') },
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
