import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from '../services/toast';
import {
  technicalEventService,
  sportsActivityService,
  culturalActivityService,
  industryProjectService,
  hackathonService,
  otherCurricularService,
  ActivityListParams,
} from '../services/activities.service';

// ─── helpers ──────────────────────────────────────────────────────────────────

const ok = (text1: string) => Toast.show({ type: 'success', text1 });

// FIXED: the backend returns a generic "Validation failed" message plus a
// `details` array of { field, message } for exactly which field(s) failed —
// but this was being discarded, so every validation error looked identical
// and impossible to diagnose from the app. Now the first field-level reason
// is shown as the toast's subtitle when available.
const err = (text1: string, apiError?: any) => {
  const details = apiError?.response?.data?.details;
  const text2 = Array.isArray(details) && details.length
    ? details.map((d: any) => `${d.field}: ${d.message}`).join('  •  ')
    : undefined;
  Toast.show({ type: 'error', text1, text2, autoHide: true, visibilityTime: 6000 });
};

interface MutationOptions<T = unknown> {
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
}

type ListFn = (params?: ActivityListParams) => Promise<any>;
type CreateFn = (data: Record<string, unknown>) => Promise<any>;
type UpdateFn = (id: string, data: Record<string, unknown>) => Promise<any>;
type DeleteFn = (id: string) => Promise<any>;

function makeListHook(queryKey: string, queryFn: ListFn) {
  return (params?: ActivityListParams) =>
    useQuery({
      queryKey: [queryKey, params],
      queryFn: () => queryFn(params),
      placeholderData: (prev: any) => prev,
      staleTime: 30_000,
    });
}

// FIXED: mutations only ever invalidated their own list's queryKey (e.g.
// 'hackathons'), so the individual list screen refreshed correctly — but
// HODDashboard.tsx's activity count / "Department Overview" chart reads
// from a single combined query keyed 'dashboard-combined', which nothing
// here ever told to refresh. That's why a new record would show up fine on
// its own screen but the Dashboard kept showing the old total until its
// 30s staleTime happened to lapse. Every mutation below now also
// invalidates 'dashboard-combined'.
const DASHBOARD_KEY = ['dashboard-combined'];

function makeCreateHook(queryKey: string, mutationFn: CreateFn, label: string) {
  return (options: MutationOptions = {}) => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn,
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: [queryKey] });
        qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
        ok(`${label} added successfully`);
        options.onSuccess?.(data);
      },
      onError: (e: any) => {
        err(e.response?.data?.message ?? `Failed to add ${label.toLowerCase()}`, e);
        options.onError?.(e);
      },
    });
  };
}

function makeUpdateHook(queryKey: string, updateFn: UpdateFn, label: string) {
  return (id: string, options: MutationOptions = {}) => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (data: Record<string, unknown>) => updateFn(id, data),
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: [queryKey] });
        qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
        ok(`${label} updated successfully`);
        options.onSuccess?.(data);
      },
      onError: (e: any) => {
        err(e.response?.data?.message ?? `Failed to update ${label.toLowerCase()}`, e);
        options.onError?.(e);
      },
    });
  };
}

function makeDeleteHook(queryKey: string, deleteFn: DeleteFn, label: string) {
  return (options: MutationOptions = {}) => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => deleteFn(id),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [queryKey] });
        qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
        ok(`${label} deleted`);
        options.onSuccess?.(undefined as any);
      },
      onError: (e: any) => {
        err(e.response?.data?.message ?? `Failed to delete ${label.toLowerCase()}`, e);
      },
    });
  };
}

// ─── Technical Events ─────────────────────────────────────────────────────────

export const useTechnicalEventList = makeListHook('technicalEvents', technicalEventService.getAll);
export const useCreateTechnicalEvent = makeCreateHook('technicalEvents', technicalEventService.create, 'Technical event');
export const useUpdateTechnicalEvent = makeUpdateHook('technicalEvents', technicalEventService.update, 'Technical event');
export const useDeleteTechnicalEvent = makeDeleteHook('technicalEvents', technicalEventService.delete, 'Technical event');

// ─── Sports Activities ────────────────────────────────────────────────────────

export const useSportsActivityList = makeListHook('sportsActivities', sportsActivityService.getAll);
export const useCreateSportsActivity = makeCreateHook('sportsActivities', sportsActivityService.create, 'Sports activity');
export const useUpdateSportsActivity = makeUpdateHook('sportsActivities', sportsActivityService.update, 'Sports activity');
export const useDeleteSportsActivity = makeDeleteHook('sportsActivities', sportsActivityService.delete, 'Sports activity');

// ─── Cultural Activities ──────────────────────────────────────────────────────

export const useCulturalActivityList = makeListHook('culturalActivities', culturalActivityService.getAll);
export const useCreateCulturalActivity = makeCreateHook('culturalActivities', culturalActivityService.create, 'Cultural activity');
export const useUpdateCulturalActivity = makeUpdateHook('culturalActivities', culturalActivityService.update, 'Cultural activity');
export const useDeleteCulturalActivity = makeDeleteHook('culturalActivities', culturalActivityService.delete, 'Cultural activity');

// ─── Industry Projects ────────────────────────────────────────────────────────

export const useIndustryProjectList = makeListHook('industryProjects', industryProjectService.getAll);
export const useCreateIndustryProject = makeCreateHook('industryProjects', industryProjectService.create, 'Project');
export const useUpdateIndustryProject = makeUpdateHook('industryProjects', industryProjectService.update, 'Project');
export const useDeleteIndustryProject = makeDeleteHook('industryProjects', industryProjectService.delete, 'Project');

export function useAddProjectStudent(projectId: string, options: MutationOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => industryProjectService.addStudent(projectId, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['industryProjects'] });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
      ok('Student added to project');
      options.onSuccess?.(data);
    },
    onError: (e: any) => {
      err(e.response?.data?.message ?? 'Failed to add student', e);
    },
  });
}

export function useRemoveProjectStudent(options: MutationOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, studentId }: { projectId: string; studentId: string }) =>
      industryProjectService.removeStudent(projectId, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['industryProjects'] });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
      ok('Student removed');
      options.onSuccess?.(undefined as any);
    },
    onError: (e: any) => {
      err(e.response?.data?.message ?? 'Failed to remove student', e);
    },
  });
}

// ─── Hackathons ───────────────────────────────────────────────────────────────

export const useHackathonList = makeListHook('hackathons', hackathonService.getAll);
export const useCreateHackathon = makeCreateHook('hackathons', hackathonService.create, 'Hackathon record');
export const useUpdateHackathon = makeUpdateHook('hackathons', hackathonService.update, 'Hackathon record');
export const useDeleteHackathon = makeDeleteHook('hackathons', hackathonService.delete, 'Hackathon record');

// ─── Other Curricular Activities ──────────────────────────────────────────────

export const useOtherCurricularList = makeListHook('otherCurricular', otherCurricularService.getAll);
export const useCreateOtherCurricular = makeCreateHook('otherCurricular', otherCurricularService.create, 'Record');
export const useUpdateOtherCurricular = makeUpdateHook('otherCurricular', otherCurricularService.update, 'Record');
export const useDeleteOtherCurricular = makeDeleteHook('otherCurricular', otherCurricularService.delete, 'Record');
