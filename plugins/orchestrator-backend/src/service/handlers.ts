import {
  getWorkflowCategory,
  WorkflowDTO,
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

export async function getWorkflowById(
  sonataFlowService: SonataFlowService,
  workflowId: string,
): Promise<WorkflowDTO> {
  const definition =
    await sonataFlowService.fetchWorkflowDefinition(workflowId);

  if (!definition) {
    throw new Error(`Couldn't fetch workflow definition for ${workflowId}`);
  }

  const uri = await sonataFlowService.fetchWorkflowUri(workflowId);
  if (!uri) {
    throw new Error(`Couldn't fetch workflow uri for ${workflowId}`);
  }
  return {
    annotations: definition.annotations,
    category: getWorkflowCategory(definition),
    description: definition.description,
    name: definition.name,
    uri: uri,
    id: definition.id,
  };
}
