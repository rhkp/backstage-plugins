import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsync } from 'react-use';

import { FeatureFlagged } from '@backstage/core-app-api';
import {
  Content,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';

import Button from '@material-ui/core/Button/Button';
import Grid from '@material-ui/core/Grid/Grid';

import {
  FEATURE_FLAG_DEVELOPER_MODE,
  WorkflowOverview,
} from '@janus-idp/backstage-plugin-orchestrator-common';

import { orchestratorApiRef } from '../../api';
import { newWorkflowRef } from '../../routes';
import { WorkflowsTable } from './WorkflowsTable';

export const WorkflowsTabContent = () => {
  const orchestratorApi = useApi(orchestratorApiRef);
  const navigate = useNavigate();
  const newWorkflowLink = useRouteRef(newWorkflowRef);
  const { value, error, loading } = useAsync(async (): Promise<
    WorkflowOverview[] | undefined
  > => {
    const data = await orchestratorApi.listWorkflowsOverview();

    return data.overviews;
  }, []);

  const isReady = React.useMemo(() => !loading && !error, [loading, error]);

  return (
    <Content noPadding>
      {loading ? <Progress /> : null}
      {error ? <ResponseErrorPanel error={error} /> : null}
      {isReady ? (
        <>
          <FeatureFlagged with={FEATURE_FLAG_DEVELOPER_MODE}>
            <Grid container direction="row-reverse">
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate(newWorkflowLink())}
                >
                  Create new
                </Button>
              </Grid>
            </Grid>
          </FeatureFlagged>
          <Grid container direction="column">
            <Grid item>
              <WorkflowsTable items={value ?? []} />
            </Grid>
          </Grid>
        </>
      ) : null}
    </Content>
  );
};
