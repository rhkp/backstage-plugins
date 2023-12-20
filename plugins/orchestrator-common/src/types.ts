import { Specification } from '@severlessworkflow/sdk-typescript';
import { JSONSchema7 } from 'json-schema';
import { OpenAPIV3 } from 'openapi-types';

import { ProcessInstanceStateValues } from './models';

type Id<T> = { [P in keyof T]: T[P] };

type OmitDistributive<T, K extends PropertyKey> = T extends any
  ? T extends object
    ? Id<OmitRecursively<T, K>>
    : T
  : never;

export type OmitRecursively<T, K extends PropertyKey> = Omit<
  { [P in keyof T]: OmitDistributive<T[P], K> },
  K
>;

export type WorkflowDefinition = OmitRecursively<
  Specification.Workflow,
  'normalize'
>;

export interface WorkflowItem {
  uri: string;
  definition: WorkflowDefinition;
}

export type WorkflowListResult = {
  items: WorkflowItem[];
  totalCount: number;
  offset: number;
  limit: number;
};

export type WorkflowFormat = 'yaml' | 'json';

export interface WorkflowSample {
  id: string;
  url: string;
}

export interface WorkflowSpecFile {
  path: string;
  content: OpenAPIV3.Document;
}

export interface WorkflowDataInputSchemaResponse {
  workflowItem: WorkflowItem;
  schema: JSONSchema7 | undefined;
}

export interface WorkflowExecutionResponse {
  id: string;
}

export enum WorkflowCategory {
  ASSESSMENT = 'assessment',
  INFRASTRUCTURE = 'infrastructure',
}

export interface WorkflowInfo {
  id: string;
  type: string;
  name: string;
  version: string;
  description?: string;
  inputSchema?: JSONSchema7;
}
