import React from 'react';
import { Cpu } from '../../../components/icons';
import ActivityListScreen from '../../../components/activities/ActivityListScreen';
import ActivityCard from '../../../components/activities/ActivityCard';
import { useHackathonList, useCreateHackathon, useUpdateHackathon, useDeleteHackathon } from '../../../hooks/useActivities';
import { colors } from '../../../theme/colors';
import { FieldDescriptor } from '../../../components/activities/ActivityFormModal';
import { getActivityGroupKey, getActivityStudents, getDescriptionValue } from '../../../components/activities/activityUtils';

const POSITION_OPTIONS = [
  { label: '1st Place', value: '1ST' },
  { label: '2nd Place', value: '2ND' },
  { label: '3rd Place', value: '3RD' },
  { label: 'Finalist', value: 'FINALIST' },
  { label: 'Participant', value: 'PARTICIPANT' },
];

const FIELDS: FieldDescriptor[] = [
  { name: 'student_id', label: 'Student USN', required: true },
  { name: 'hackathonName', label: 'Hackathon Name', required: true },
  { name: 'position', label: 'Position', required: true, type: 'select', options: POSITION_OPTIONS },
  { name: 'year', label: 'Year', type: 'number' },
  { name: 'academicYear', label: 'Academic Year' },
];

const ACCENT = colors.blue[500];

export default function Hackathons() {
  return (
    <ActivityListScreen<any>
      title="Hackathons"
      accentColor={ACCENT}
      icon={Cpu}
      useListHook={useHackathonList}
      useCreateHook={useCreateHackathon}
      useUpdateHook={useUpdateHackathon}
      useDeleteHook={useDeleteHackathon}
      fields={FIELDS}
      getGroupKey={getActivityGroupKey}
      getStudents={getActivityStudents}
      renderCard={({ item, items, students, onEdit, onDelete }) => (
        <ActivityCard
          title={item.title}
          subtitle={item.team_name || item.teamName || undefined}
          accentColor={ACCENT}
          students={students}
          chips={[
            { label: 'Position', value: item.position || getDescriptionValue(item, 'position'), highlight: true },
            { label: 'Year', value: item.year || getDescriptionValue(item, 'year') },
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
