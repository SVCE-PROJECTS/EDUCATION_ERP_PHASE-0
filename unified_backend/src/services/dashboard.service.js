


const facultyRepo = require('../repositories/faculty.repository');

/**
 * HOD Dashboard stats
 */
const getHODDashboard = async (departmentCode) => {
  const stats = await facultyRepo.getDepartmentStats(departmentCode);

  // Role distribution - count faculty with coordinator roles
  const allFaculty = await facultyRepo.findAllByDepartment(departmentCode, {
    page: 1, limit: 9999, search: null, status: null, sortBy: 'name', sortOrder: 'asc',
  }).then(r => r.items);

  const roleDistribution = {};
  const COORDINATOR_ROLES = ['TIMETABLE_COORDINATOR', 'EXAM_COORDINATOR', 'CULTURAL_COORDINATOR', 'PLACEMENT_COORDINATOR'];
  
  for (const role of COORDINATOR_ROLES) {
    const count = allFaculty.filter(f => f.coordinatorRoles?.includes(role)).length;
    if (count > 0) {
      roleDistribution[role] = count;
    }
  }

  // Convert to array format
  const rolesWithNames = Object.entries(roleDistribution).map(([slug, count]) => ({
    role: { name: formatRoleName(slug), slug },
    count,
  }));

  // Recent activity - just show creation/updates for now
  const recentActivity = [];

  return {
    department: {
      id: null,
      name: departmentCode,
      code: departmentCode,
    },
    stats: {
      totalFaculty:     stats.totalFaculty,
      activeFaculty:    stats.activeCount,
      onLeave:          stats.onLeave,
      inactive:         stats.inactive,
      coordinatorCount: stats.coordinatorCount,
      totalStudents:    0,
      totalSemesters:   8,
    },
    roleDistribution: rolesWithNames,
    recentActivity,
  };
};

const formatRoleName = (slug) => {
  const map = {
    'TIMETABLE_COORDINATOR': 'Timetable Coordinator',
    'EXAM_COORDINATOR': 'Exam Coordinator',
    'CULTURAL_COORDINATOR': 'Cultural Coordinator',
    'PLACEMENT_COORDINATOR': 'Placement Coordinator',
  };
  return map[slug] || slug;
};

module.exports = { getHODDashboard };
