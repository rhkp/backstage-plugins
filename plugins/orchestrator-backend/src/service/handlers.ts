import { WorkflowOverviewListResult } from '@janus-idp/backstage-plugin-orchestrator-common';

import { SonataFlowService } from './SonataFlowService';

export async function getWorkflowOverview(
  sonataFlowService: SonataFlowService,
): Promise<WorkflowOverviewListResult> {
  const overviews = await sonataFlowService.fetchWorkflowOverviews();

  if (!overviews) {
    throw new Error("Couldn't fetch workflow overviews");
  }

  const result: WorkflowOverviewListResult = {
    overviews: overviews,
    paginationInfo: {
      limit: 0,
      offset: 0,
      totalCount: overviews?.length ?? 0,
    },
  };
  return result;
}
