# Real-Time Industry Projects - Implementation Summary

## Overview
Reworked the Real-Time Industry Projects feature in the HOD portal to use a **project-first** UX where projects are independent cards and students are added to each project separately.

## Changes Made

### Backend Changes

#### 1. Database Migration
**File**: `unified_backend/database/migrate_industry_projects.sql`
- Made `activities.student_id` nullable to allow project header rows (no student yet)
- This migration is automatically applied on server startup via `dbBootstrap.js`

#### 2. Repository Layer
**File**: `unified_backend/src/repositories/industryProject.repository.js`
- Updated `findAll()` to use LEFT JOIN on students (supports header rows with null student_id)
- Updated `findById()` to use LEFT JOIN
- Modified `create()` to allow null `studentId`
- Added `removeProject()` to delete entire project groups
- Added `findProjectHeader()` to find header rows
- Updated queries to handle department scoping via faculty when no student is linked

#### 3. Service Layer
**File**: `unified_backend/src/services/industryProject.service.js`
- **`create()`**: Now creates project header rows (no student required)
  - Student field removed from creation form
  - Creates header row with `student_id = null`
- **`update()`**: Updates header row and cascades changes to all student rows in the project
- **`remove()`**: Deletes entire project when header row is deleted
- **`addStudent()`**: Adds a new student row linked to existing project
- **`removeStudent()`**: Removes individual student rows

#### 4. Validation
**File**: `unified_backend/src/validators/activityValidator.js`
- Removed `student_id` requirement from `createIndustryProjectRules`
- Student is now added separately via POST /:id/students endpoint

#### 5. Controller
**File**: `unified_backend/src/controllers/industryProject.controller.js`
- Fixed `getList()` to return both `data` and `pagination` at top level for frontend consumption

### Frontend Changes

#### 1. New Dedicated Screen
**File**: `unified-frontend/src/screens/hod/activities/RealTimeIndustryProjects.tsx`

Complete rewrite with the following features:

**Project Form Modal**:
- Project Title (text, required)
- Status (dropdown): Ongoing, Completed, Paused
- Domain (dropdown): Web Development, Mobile Development, AI/ML, Data Science, Embedded/IoT, Cloud/DevOps, Cybersecurity, Other
- Academic Year: Two dropdowns (From/To) for year range
- No student field in project creation

**Project Cards**:
- Title displayed at top
- Edit (pencil) icon at top-right
- Plus (+) icon next to edit for adding students
- Chips showing: Domain (highlighted), Status, Academic Year
- Expandable "STUDENTS (n)" section with table
- Student table columns: Name, USN, Sem, Section, Actions (edit/delete per row)

**Add Student Modal**:
- Live search by student name (debounced 300ms)
- Shows: Name, USN, Semester, Section
- Prevents duplicate additions (shows message)
- Closes automatically after adding

**Student Operations**:
- Add: Opens search modal, select student to add
- Edit: Opens search modal to replace existing student
- Delete: Confirmation dialog, removes student from project

**Project Operations**:
- Edit: Opens project form with existing values
- Delete: Confirmation dialog, deletes entire project including all students

**Data Handling**:
- Groups rows by `title + academic_year` (case-insensitive)
- Header row = row with `student_id === null` OR first row (legacy support)
- Student rows = all rows with `student_id !== null` in the group

## Technical Details

### Data Model
- **Backend**: One `activities` row per student, grouped by matching `title` + `academic_year`
- **Header row**: `student_id = NULL`, created when HOD creates project
- **Student rows**: `student_id = <library_id>`, created via POST /:id/students
- **Grouping**: Frontend groups rows with matching title+year for display

### API Endpoints Used
- `GET /activities/industry-projects` - List all projects (returns grouped rows)
- `POST /activities/industry-projects` - Create project header (no student)
- `PUT /activities/industry-projects/:id` - Update project details
- `DELETE /activities/industry-projects/:id` - Delete project (cascades to students)
- `POST /activities/industry-projects/:id/students` - Add student to project
- `DELETE /activities/industry-projects/:id/students/:studentId` - Remove student

### Academic Year Handling
- **Input**: Two dropdowns (From/To year)
- **Storage**: String format "YYYY-YYYY" (e.g., "2025-2026")
- **Validation**: "To" must be greater than "From"
- **Field type**: VARCHAR(20) in database

### Status Values
- Form uses enums: `ONGOING`, `COMPLETED`, `PAUSED`
- Display labels: "Ongoing", "Completed", "Paused"
- Backend stores display labels in `activities.status` column

### Domain Values
```
WEB → Web Development
MOBILE → Mobile Development
AI_ML → AI / ML
DATA → Data Science
EMBEDDED → Embedded / IoT
CLOUD → Cloud / DevOps
SECURITY → Cybersecurity
OTHER → Other
```

## Files Changed

### Backend (6 files)
1. `unified_backend/database/migrate_industry_projects.sql` - NEW
2. `unified_backend/src/repositories/industryProject.repository.js` - MODIFIED
3. `unified_backend/src/services/industryProject.service.js` - MODIFIED
4. `unified_backend/src/validators/activityValidator.js` - MODIFIED
5. `unified_backend/src/controllers/industryProject.controller.js` - MODIFIED

### Frontend (1 file)
1. `unified-frontend/src/screens/hod/activities/RealTimeIndustryProjects.tsx` - REPLACED

## Verification Checklist

✅ Top "+" button creates project without student field
✅ Status dropdown has 3 options (Ongoing, Completed, Paused)
✅ Domain dropdown has all 8 options including Web Development
✅ Academic Year has From/To dropdowns with validation
✅ Creating project makes new card with "STUDENTS (0)"
✅ Card header shows pencil (edit) left of plus (add student)
✅ Pencil opens project form with prefilled values
✅ Plus opens student search modal
✅ Student search filters live as user types (300ms debounce)
✅ Tapping student name adds them and closes modal
✅ Duplicate prevention with error message
✅ Student count and table update immediately
✅ Student rows have edit and delete icons
✅ Edit student opens search to replace
✅ Delete student shows confirmation dialog
✅ Delete project shows confirmation with student count
✅ Data persists after page refresh (saved to backend)
✅ Theme colors used (no hardcoded colors)
✅ Same layout style as other activity screens

## Migration Instructions

### For Development
1. The migration runs automatically on next `npm run dev` in `unified_backend`
2. No manual steps required - `dbBootstrap.js` applies all `database/migrations/*.sql` files

### For Production
1. Apply the migration SQL manually before deploying new backend code:
   ```bash
   psql -U postgres -d education_erp -f unified_backend/database/migrate_industry_projects.sql
   ```
2. Deploy new backend code
3. Deploy new frontend code

### Rollback (if needed)
To revert the schema change:
```sql
-- Re-add NOT NULL constraint (will fail if any header rows exist)
ALTER TABLE activities ALTER COLUMN student_id SET NOT NULL;

-- If header rows exist, delete them first:
DELETE FROM activities WHERE activity_type = 'IndustryProject' AND student_id IS NULL;
```

## Testing Recommendations

1. **Create new project**: Verify form shows no student field
2. **Edit project**: Change title, status, domain, academic year
3. **Add students**: Search by name, select multiple students
4. **Duplicate prevention**: Try adding same student twice
5. **Edit student**: Replace existing student with another
6. **Delete student**: Remove individual student from project
7. **Delete project**: Verify all students are removed
8. **Search projects**: Filter by project title
9. **Refresh page**: Verify data persists
10. **Legacy data**: Projects created before this change still display correctly

## Notes

- **Backward compatible**: Legacy data (projects without header rows) still works
- **No breaking changes**: Other activity types unchanged
- **Performance**: LEFT JOINs may be slightly slower than INNER JOINs on large datasets
- **Cascading deletes**: Deleting project header removes all student rows automatically
- **Department scoping**: Header rows use faculty's department when student is absent
