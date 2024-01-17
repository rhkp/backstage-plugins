import moment from 'moment';

import {
  getWorkflowCategoryDTO,
  ProcessInstance,
  ProcessInstanceState,
  ProcessInstanceStatusDTO,
  ProcessIntancesDTO,
  WorkflowCategory,
  WorkflowCategoryDTO,
  WorkflowDefinition,
  WorkflowDTO,
  WorkflowInfo,
  WorkflowItem,
  WorkflowListResult,
  WorkflowListResultDTO,
  WorkflowOverviewDTO,
  WorkflowOverviewListResult,
  WorkflowOverviewListResultDTO,
  WorkflowRunStatusDTO,
} from '@janus-idp/backstage-plugin-orchestrator-common';

import { DataIndexService } from './DataIndexService';
import { SonataFlowService } from './SonataFlowService';

export async function getWorkflowOverviewV1(
  sonataFlowService: SonataFlowService,
): Promise<WorkflowOverviewListResult> {
  const overviews = await sonataFlowService.fetchWorkflowOverviews();

  if (!overviews) {
    throw new Error("Couldn't fetch workflow overviews");
  }

  const result: WorkflowOverviewListResult = {
    items: overviews,
    limit: 0,
    offset: 0,
    totalCount: overviews?.length ?? 0,
  };
  return result;
}

export async function getWorkflowOverviewV2(
  sonataFlowService: SonataFlowService,
): Promise<WorkflowOverviewListResultDTO> {
  const overviewsV1 = await getWorkflowOverviewV1(sonataFlowService);

  const result: WorkflowOverviewListResultDTO = {
    overviews: overviewsV1.items,
    paginationInfo: {
      limit: 0,
      offset: 0,
      totalCount: overviewsV1.items?.length ?? 0,
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

export async function getWorkflowsV1(
  sonataFlowService: SonataFlowService,
  dataIndexService: DataIndexService,
): Promise<WorkflowListResult> {
  const definitions: WorkflowInfo[] =
    await dataIndexService.getWorkflowDefinitions();
  const items: WorkflowItem[] = await Promise.all(
    definitions.map(async info => {
      const uri = await sonataFlowService.fetchWorkflowUri(info.id);
      if (!uri) {
        throw new Error(`Uri is required for workflow ${info.id}`);
      }
      const item: WorkflowItem = {
        definition: info as WorkflowDefinition,
        serviceUrl: info.serviceUrl,
        uri,
      };
      return item;
    }),
  );

  if (!items) {
    throw new Error("Couldn't fetch workflows");
  }

  const result: WorkflowListResult = {
    items: items,
    limit: 0,
    offset: 0,
    totalCount: items?.length ?? 0,
  };

  return result;
}
export async function getWorkflowsV2(
  sonataFlowService: SonataFlowService,
  dataIndexService: DataIndexService,
): Promise<WorkflowListResultDTO> {
  const definitions: WorkflowListResult = await getWorkflowsV1(
    sonataFlowService,
    dataIndexService,
  );
  const result: WorkflowListResultDTO = {
    items: definitions.items.map(def => {
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
      limit: definitions.limit,
      offset: definitions.offset,
      totalCount: definitions.totalCount,
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

export async function getInstancesV1(
  dataIndexService: DataIndexService,
): Promise<ProcessInstance[]> {
  const instances = await dataIndexService.fetchProcessInstances();

  if (!instances) {
    throw new Error("Couldn't fetch process instances");
  }
  return instances;
}

export async function getInstancesV2(
  dataIndexService: DataIndexService,
): Promise<ProcessIntancesDTO> {
  const instances = await getInstancesV1(dataIndexService);
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
      nextWorkflowSuggestions: variables?.workflowdata?.workflowOptions,
      started: start.toDate().toLocaleString(),
      status: getProcessInstancesDTOFromString(def.state),
      workflow: def.processName || def.processId,
    };
  });

  return result;
}

export async function getWorkflowStatuses(): Promise<WorkflowRunStatusDTO[]> {
  const statusArray: WorkflowRunStatusDTO[] = Object.entries(
    ProcessInstanceStatusDTO,
  )
    .filter(([key]) => isNaN(Number(key))) // Filter out numeric keys
    .map(([key, value]) => ({ key, value }));
  return statusArray;
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
