import moment from 'moment';

import {
  extractWorkflowFormatFromUri,
  WorkflowFormat,
  WorkflowOverview,
} from '@janus-idp/backstage-plugin-orchestrator-common';

import DataFormatter from './DataFormatter';

const UNAVAILABLE = '---';

export interface FormattedWorkflowOverview {
  readonly id: string;
  readonly name: string;
  readonly lastTriggered: string;
  readonly lastRunStatus: string;
  readonly type: string;
  readonly avgDuration: string;
  readonly description: string;
  readonly format: WorkflowFormat;
}

const formatDuration = (milliseconds: number): string => {
  let sec = Math.round(milliseconds / 1000);
  let min = 0;
  let hr = 0;
  if (sec >= 60) {
    min = Math.floor(sec / 60);
    sec %= 60;
  }
  if (min >= 60) {
    hr = Math.floor(min / 60);
    min %= 60;
  }
  if (hr > 0) {
    return `${hr} h`;
  }
  if (min > 0) {
    return `${min} min`;
  }
  if (sec > 0) {
    return `${sec} sec`;
  }
  return 'less than a sec';
};

const WorkflowOverviewFormatter: DataFormatter<
  WorkflowOverview,
  FormattedWorkflowOverview
> = {
  format: (data: WorkflowOverview): FormattedWorkflowOverview => {
    return {
      id: data.workflowId ?? '',
      name: data.name || UNAVAILABLE,
      lastTriggered: data.lastTriggeredMs
        ? moment(data.lastTriggeredMs).format('DD/MM/YY HH:mm:ss')
        : UNAVAILABLE,
      lastRunStatus: data.lastRunStatus || UNAVAILABLE,
      type: data.category || UNAVAILABLE,
      avgDuration: data.avgDurationMs
        ? formatDuration(data.avgDurationMs)
        : UNAVAILABLE,
      description: data.description || UNAVAILABLE,
      format: data.uri ? extractWorkflowFormatFromUri(data.uri) : 'yaml',
    };
  },
};

export default WorkflowOverviewFormatter;
