/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  '/workflows': {
    get: operations['getWorkflows'];
  };
  '/workflows/{workflowId}/overview': {
    /** @description Get a workflow overview by ID */
    get: operations['getWorkflowOverviewById'];
  };
  '/workflows/overview': {
    /** @description Get a list of workflow overviews */
    get: operations['getWorkflowsOverview'];
  };
}

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    PaginationInfo: {
      limit?: number;
      offset?: number;
      totalCount?: number;
    };
    Workflow: {
      annotations?: string[];
      category: components['schemas']['WorkflowCategory'];
      /** @description Description of the workflow */
      description?: string;
      /** @description Workflow unique identifier */
      id: string;
      /** @description Workflow name */
      name?: string;
      /** @description URI of the workflow definition */
      uri: string;
    };
    /**
     * @description Category of the workflow
     * @enum {string}
     */
    WorkflowCategory: 'assessment' | 'infrastructure';
    WorkflowListResult: {
      items: components['schemas']['Workflow'][];
      paginationInfo: components['schemas']['PaginationInfo'];
    };
    WorkflowOverview: {
      /** @description Average duration of workflow runs */
      avgDurationMs?: number;
      category?: components['schemas']['WorkflowCategory'];
      /** @description Description of the workflow */
      description?: string;
      /** @description Status of the last workflow execution */
      lastRunStatus?: string;
      /** @description Timestamp of the last workflow execution */
      lastTriggeredMs?: number;
      /** @description Workflow name */
      name?: string;
      /** @description URI of the workflow definition */
      uri?: string;
      /** @description Workflow unique identifier */
      workflowId?: string;
    };
    WorkflowOverviewListResult: {
      overviews?: components['schemas']['WorkflowOverview'][];
      paginationInfo?: components['schemas']['PaginationInfo'];
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type $defs = Record<string, never>;

export type external = Record<string, never>;

export interface operations {
  getWorkflows: {
    responses: {
      /** @description Ok! */
      200: {
        content: {
          'application/json': components['schemas']['WorkflowOverview'];
        };
      };
    };
  };
  /** @description Get a workflow overview by ID */
  getWorkflowOverviewById: {
    parameters: {
      path: {
        /** @description Unique identifier of the workflow */
        workflowId: string;
      };
    };
    responses: {
      /** @description Success */
      200: {
        content: {
          'application/json': components['schemas']['WorkflowOverview'];
        };
      };
      /** @description Error fetching workflow overview */
      500: {
        content: {
          'application/json': {
            /** @description Error message */
            message?: string;
          };
        };
      };
    };
  };
  /** @description Get a list of workflow overviews */
  getWorkflowsOverview: {
    responses: {
      /** @description Success */
      200: {
        content: {
          'application/json': components['schemas']['WorkflowOverviewListResult'];
        };
      };
      /** @description Error fetching workflow overviews */
      500: {
        content: {
          'application/json': {
            /** @description Error message */
            message?: string;
          };
        };
      };
    };
  };
}
