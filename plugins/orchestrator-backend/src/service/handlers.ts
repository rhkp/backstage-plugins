import moment from 'moment';

import {
  getWorkflowCategoryDTO,
  ProcessInstance,
  ProcessInstanceState,
  ProcessInstanceStatusDTO,
  ProcessIntancesDTO,
  WorkflowCategory,
  WorkflowCategoryDTO,
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
        category: getWorkflowCategoryDTO(def.definition),
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
    category: getWorkflowCategoryDTO(definition),
    description: definition.description,
    name: definition.name,
    uri: uri,
    id: definition.id,
  };
}

export async function getInstances(
  sonataFlowService: SonataFlowService,
): Promise<ProcessIntancesDTO> {
  const instances: ProcessInstance[] | undefined =
    await sonataFlowService.fetchProcessInstances();

  if (!instances) {
    throw new Error("Couldn't fetch process instances");
  }

  const result = instances.map((def: ProcessInstance) => {
    const start = moment(def.start?.toString());
    const end = moment(def.end?.toString());
    const duration = moment.duration(start.diff(end));
    let variables: Record<string, unknown> | undefined;
    if (typeof def?.variables === 'string') {
      variables = JSON.parse(def?.variables);
    } else {
      variables = def?.variables;
    }
    return {
      category: getWorkflowCategoryDTOFromWorkflowCategory(def.category),
      description: def.description,
      duration: duration.humanize(),
      id: def.id,
      name: def.processName,
      // @ts-ignore
      nextWorkflowSuggestions: def.variables?.workflowdata?.workflowOptions,
      started: start.toDate().toLocaleString(),
      status: getProcessInstancesDTOFromString(def.state),
      workflow: def.processName || def.processId,
    };
  });

  return result;
}

function getWorkflowCategoryDTOFromWorkflowCategory(
  category?: WorkflowCategory,
) {
  switch (category) {
    case WorkflowCategory.ASSESSMENT:
      return WorkflowCategoryDTO.ASSESSMENT;
    case WorkflowCategory.INFRASTRUCTURE:
      return WorkflowCategoryDTO.INFRASTRUCTURE;
    default:
      return WorkflowCategoryDTO.INFRASTRUCTURE;
  }
}

// function getProcessInstanceStatusDTOFromProcessInstaceState(state: ProcessInstanceState): ProcessInstanceStatusDTO{
//   switch (state) {
//     case ProcessInstanceState.Active:
//       return ProcessInstanceStatusDTO.RUNNING;
//     case ProcessInstanceState.Error:
//       return ProcessInstanceStatusDTO.ERROR;
//     case ProcessInstanceState.Completed:
//       return ProcessInstanceStatusDTO.COMPLETED;
//     case ProcessInstanceState.Aborted:
//       return ProcessInstanceStatusDTO.ABORTED;
//     case ProcessInstanceState.Suspended:
//       return ProcessInstanceStatusDTO.SUSPENDED;
//     default:
//       // TODO: What is the default value?
//       return ProcessInstanceStatusDTO.SUSPENDED;
//   }
//  }

function getProcessInstancesDTOFromString(
  state: string,
): ProcessInstanceStatusDTO {
  switch (state) {
    case ProcessInstanceState.Active.valueOf():
      return ProcessInstanceStatusDTO.RUNNING;
    case ProcessInstanceState.Error.valueOf():
      return ProcessInstanceStatusDTO.ERROR;
    case ProcessInstanceState.Completed.valueOf():
      return ProcessInstanceStatusDTO.COMPLETED;
    case ProcessInstanceState.Aborted.valueOf():
      return ProcessInstanceStatusDTO.ABORTED;
    case ProcessInstanceState.Suspended.valueOf():
      return ProcessInstanceStatusDTO.SUSPENDED;
    default:
      // TODO: What is the default value?
      return ProcessInstanceStatusDTO.SUSPENDED;
  }
}
