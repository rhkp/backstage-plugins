import {
  getWorkflowCategory,
  WorkflowListResultDTO,
  WorkflowOverviewDTO,
  WorkflowOverviewListResultDTO,
} from '@janus-idp/backstage-plugin-orchestrator-common';

import { SonataFlowService } from './SonataFlowService';

export async function getWorkflowOverview(
  sonataFlowService: SonataFlowService,
): Promise<WorkflowOverviewListResultDTO> {
  const overviews = await sonataFlowService.fetchWorkflowOverviews();

  if (!overviews) {
    throw new Error("Couldn't fetch workflow overviews");
  }

  const result: WorkflowOverviewListResultDTO = {
    overviews: overviews,
    paginationInfo: {
      limit: 0,
      offset: 0,
      totalCount: overviews?.length ?? 0,
    },
  };
  return result;
}

export async function getWorkflowOverviewById(
  sonataFlowService: SonataFlowService,
  workflowId: string,
): Promise<WorkflowOverviewDTO> {
  const overviewObj = await sonataFlowService.fetchWorkflowOverview(workflowId);

  if (!overviewObj) {
    throw new Error(`Couldn't fetch workflow overview for ${workflowId}`);
  }
  return overviewObj;
}

export async function getWorkflows(sonataFlowService: SonataFlowService) {
  const definitions = await sonataFlowService.fetchWorkflows();

  if (!definitions) {
    throw new Error("Couldn't fetch workflows");
  }
  const result: WorkflowListResultDTO = {
    items: definitions.map(def => {
      return {
        annotations: def.definition.annotations,
        category: getWorkflowCategory(def.definition),
        description: def.definition.description,
        name: def.definition.name,
        uri: def.uri,
        id: def.definition.id,
      };
    }),
    paginationInfo: {
      limit: 0,
      offset: 0,
      totalCount: definitions?.length ?? 0,
    },
  };
  return result;
}
