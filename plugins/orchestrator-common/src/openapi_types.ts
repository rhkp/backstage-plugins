import { components } from '../api/models/schema';

export type WorkflowOverviewListResultDTO =
  components['schemas']['WorkflowOverviewListResultDTO'];
export type WorkflowOverviewDTO = components['schemas']['WorkflowOverviewDTO'];
export type WorkflowDTO = components['schemas']['WorkflowDTO'];
export type WorkflowListResultDTO =
  components['schemas']['WorkflowListResultDTO'];
export type ProcessIntanceDTO = components['schemas']['ProcessIntanceDTO'];
export type ProcessIntancesDTO = components['schemas']['ProcessIntancesDTO'];
export type ProcessInstanceStatusDTO2 =
  components['schemas']['ProcessInstanceStatusDTO'];

// FIXME - how to export imported enum
export enum ProcessInstanceStatusDTO {
  // Running
  RUNNING = 'Running',
  // Error
  ERROR = 'Error',
  // Completed
  COMPLETED = 'Completed',
  // Aborted
  ABORTED = 'Aborted',
  // Suspended
  SUSPENDED = 'Suspended',
}
export enum WorkflowCategoryDTO {
  // Assessment Workflow
  ASSESSMENT = 'assessment',
  // Infrastructure Workflow
  INFRASTRUCTURE = 'infrastructure',
}
