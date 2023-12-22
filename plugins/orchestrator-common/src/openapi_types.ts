import { components } from '../api/models/schema';

export type WorkflowOverviewListResult =
  components['schemas']['WorkflowOverviewListResult'];
export type WorkflowOverview = components['schemas']['WorkflowOverview'];
export type Workflow = components['schemas']['Workflow'];
export type WorkflowListResult = components['schemas']['WorkflowListResult'];

export enum WorkflowCategory {
  ASSESSMENT = 'assessment',
  INFRASTRUCTURE = 'infrastructure',
}
