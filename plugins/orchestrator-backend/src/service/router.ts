import { errorHandler } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import { DiscoveryApi } from '@backstage/core-plugin-api';
import { ScmIntegrations } from '@backstage/integration';
import { JsonObject, JsonValue } from '@backstage/types';

import express from 'express';
import Router from 'express-promise-router';
import { JSONSchema7 } from 'json-schema';
import { OpenAPIBackend, Request } from 'openapi-backend';
import { Logger } from 'winston';

import {
  fromWorkflowSource,
  ORCHESTRATOR_SERVICE_READY_TOPIC,
  WorkflowDataInputSchemaResponse,
  WorkflowDefinition,
  WorkflowInfo,
  WorkflowItem,
  WorkflowListResult,
  WorkflowOverviewListResult,
} from '@janus-idp/backstage-plugin-orchestrator-common';

import path from 'path';

import { RouterArgs } from '../routerWrapper';
import { ApiResponseBuilder } from '../types/apiResponse';
import { CloudEventService } from './CloudEventService';
import { DataIndexService } from './DataIndexService';
import { DataInputSchemaService } from './DataInputSchemaService';
import {
  executeWorkflowByIdV1,
  executeWorkflowByIdV2,
  getInstancesByIdV1,
  getInstancesByIdV2,
  getInstancesV1,
  getInstancesV2,
  getWorkflowByIdV1,
  getWorkflowByIdV2,
  getWorkflowOverviewById,
  getWorkflowOverviewByIdV1,
  getWorkflowOverviewV1,
  getWorkflowOverviewV2,
  getWorkflowStatuses,
  getWorkflowsV1,
  getWorkflowsV2,
} from './handlers';
import { JiraEvent, JiraService } from './JiraService';
import { OpenApiService } from './OpenApiService';
import { ScaffolderService } from './ScaffolderService';
import { SonataFlowService } from './SonataFlowService';
import { WorkflowService } from './WorkflowService';

export async function createBackendRouter(
  args: RouterArgs & {
    sonataFlowService: SonataFlowService;
    dataIndexService: DataIndexService;
  },
): Promise<express.Router> {
  const { eventBroker, config, logger, discovery, catalogApi, urlReader } =
    args;

  // FIXME: what is it the proper way to get the path?
  const openapiFolderPath = path.join(
    process.cwd(),
    '..',
    '..',
    'plugins',
    'orchestrator-common',
    'api',
  );
  const api = new OpenAPIBackend({
    definition: path.join(openapiFolderPath, 'openapi.yaml'),
    strict: false,
    ajvOpts: {
      strict: false,
      strictSchema: false,
      verbose: true,
      addUsedSchema: false,
    },
    handlers: {
      validationFail: async (
        c,
        req: express.Request,
        res: express.Response,
      ) => {
        console.log('validationFail', c.operation);
        res.status(400).json({ err: c.validation.errors });
      },
      notFound: async (c, req: express.Request, res: express.Response) =>
        res.status(404).json({ err: 'not found' }),
      notImplemented: async (c, req: express.Request, res: express.Response) =>
        res.status(500).json({ err: 'not implemented' }),
    },
  });
  await api.init();

  const router = Router();
  router.use(express.json());
  router.use('/workflows', express.text());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  const githubIntegration = ScmIntegrations.fromConfig(config)
    .github.list()
    .pop();

  const githubToken = githubIntegration?.config.token;

  if (!githubToken) {
    logger.warn(
      'No GitHub token found. Some features may not work as expected.',
    );
  }

  const cloudEventService = new CloudEventService(logger);
  const jiraService = new JiraService(logger, cloudEventService);
  const openApiService = new OpenApiService(logger, discovery);
  const dataInputSchemaService = new DataInputSchemaService(
    logger,
    githubToken,
  );

  const workflowService = new WorkflowService(
    openApiService,
    dataInputSchemaService,
    args.sonataFlowService,
    config,
    logger,
  );

  const scaffolderService: ScaffolderService = new ScaffolderService(
    logger,
    config,
    catalogApi,
    urlReader,
  );

  await workflowService.reloadWorkflows();

  setupInternalRoutes(
    router,
    api,
    args.sonataFlowService,
    workflowService,
    openApiService,
    jiraService,
    args.dataIndexService,
    dataInputSchemaService,
  );
  setupExternalRoutes(router, discovery, scaffolderService);

  await eventBroker.publish({
    topic: ORCHESTRATOR_SERVICE_READY_TOPIC,
    eventPayload: {},
  });

  router.use((req, res, next) => {
    if (!next) {
      throw new Error('next is undefined');
    }

    // const validation = api.validateRequest(req as Request);
    // if (!validation.valid) {
    //   console.log('errors: ', validation.errors);
    //   throw validation.errors;
    // }

    api.handleRequest(req as Request, req, res, next);
  });

  router.use(errorHandler());
  return router;
}

// ======================================================
// Internal Backstage API calls to delegate to SonataFlow
// ======================================================
function setupInternalRoutes(
  router: express.Router,
  api: OpenAPIBackend,
  sonataFlowService: SonataFlowService,
  workflowService: WorkflowService,
  openApiService: OpenApiService,
  jiraService: JiraService,
  dataIndexService: DataIndexService,
  dataInputSchemaService: DataInputSchemaService,
) {
  router.get('/workflows/definitions', async (_, response) => {
    const swfs = await dataIndexService.getWorkflowDefinitions();
    response.json(ApiResponseBuilder.SUCCESS_RESPONSE(swfs));
  });

  router.get('/workflows/overview', async (_, res, next) => {
    await getWorkflowOverviewV1(sonataFlowService)
      .then(result => res.status(200).json(result))
      .catch(error => {
        res.status(500).send(error.message || 'Internal Server Error');
        next();
      });
  });

  // v2
  api.register(
    'getWorkflowsOverview',
    async (c, _, res: express.Response, next) => {
      await getWorkflowOverviewV2(sonataFlowService)
        .then(result => res.json(result))
        .catch(error => {
          res.status(500).send(error.message || 'Internal Server Error');
          next();
        });
    },
  );

  router.get('/workflows', async (_, res, next) => {
    await getWorkflowsV1(sonataFlowService, dataIndexService)
      .then(result => res.status(200).json(result))
      .catch(error => {
        res.status(500).send(error.message || 'Internal Server Error');
        next();
      });
  });

  // v2
  api.register('getWorkflows', async (c, req, res, next) => {
    await getWorkflowsV2(sonataFlowService, dataIndexService)
      .then(result => res.json(result))
      .catch(error => {
        res.status(500).send(error.message || 'Internal Server Error');
        next();
      });
  });

  router.get('/workflows/:workflowId', async (req, res) => {
    const {
      params: { workflowId },
    } = req;
    await getWorkflowByIdV1(sonataFlowService, workflowId)
      .then(result => res.status(200).json(result))
      .catch(error => {
        res.status(500).send(error.message || 'Internal Server Error');
      });
  });
  // v2
  api.register('getWorkflowById', async (c, req, res, next) => {
    const workflowId = c.request.params.workflowId as string;

    await getWorkflowByIdV2(sonataFlowService, workflowId)
      .then(result => res.status(200).json(result))
      .catch(error => {
        res.status(500).send(error.message || 'Internal Server Error');
        next();
      });
  });

  router.delete('/workflows/:workflowId/abort', async (req, res) => {
    const {
      params: { workflowId },
    } = req;

    const result = await dataIndexService.abortWorkflowInstance(workflowId);

    if (result.error) {
      res.status(500).json(result.error);
      return;
    }

    res.status(200).json(result.data);
  });

  router.post('/workflows/:workflowId/execute', async (req, res) => {
    const {
      params: { workflowId },
    } = req;

    await executeWorkflowByIdV1(
      dataIndexService,
      sonataFlowService,
      req.body,
      workflowId,
    )
      .then((result: any) => res.status(200).json(result))
      .catch((error: { message: any }) => {
        res.status(500).send(error.message || 'Internal Server Error');
      });
  });

  // v2
  api.register(
    'executeWorkflow',
    async (c, req: express.Request, res: express.Response, next) => {
      const workflowId = c.request.params.workflowId as string;
      const executeWorkflowRequestDTO = req.body;
      await executeWorkflowByIdV2(
        dataIndexService,
        sonataFlowService,
        executeWorkflowRequestDTO,
        workflowId,
      )
        .then(result => res.status(200).json(result))
        .catch((error: { message }) => {
          res.status(500).send(error.message || 'Internal Server Error');
        });
    },
  );

  router.get('/workflows/:workflowId/overview', async (req, res) => {
    const {
      params: { workflowId },
    } = req;

    await getWorkflowOverviewByIdV1(sonataFlowService, workflowId)
      .then(result => res.status(200).json(result))
      .catch(error => {
        res.status(500).send(error.message || 'Internal Server Error');
      });
  });

  // v2
  api.register(
    'getWorkflowOverviewById',
    async (c, req: express.Request, res: express.Response, next) => {
      const workflowId = c.request.params.workflowId as string;

      await getWorkflowOverviewById(sonataFlowService, workflowId)
        .then(result => res.json(result))
        .catch(next);
    },
  );

  router.get('/instances', async (_, res, next) => {
    await getInstancesV1(dataIndexService)
      .then(result => res.status(200).json(result))
      .catch(error => {
        res.status(500).send(error.message || 'Internal Server Error');
        next();
      });
  });

  // v2
  api.register(
    'getInstances',
    async (c, req: express.Request, res: express.Response, next) => {
      await getInstancesV2(dataIndexService)
        .then(result => res.json(result))
        .catch(next);
    },
  );

  api.register(
    'getWorkflowStatuses',
    async (c, req: express.Request, res: express.Response, next) => {
      await getWorkflowStatuses()
        .then(result => res.json(result))
        .catch(next);
    },
  );

  router.get('/instances/:instanceId', async (req, res) => {
    const {
      params: { instanceId },
    } = req;

    const instance = await getInstancesByIdV1(dataIndexService, instanceId);
    res.status(200).json(instance);
  });

  // v2
  api.register(
    'getInstanceById',
    async (c, req: express.Request, res: express.Response, next) => {
      const instanceId = c.request.params.instanceId as string;
      await getInstancesByIdV2(dataIndexService, instanceId)
        .then(result => res.status(200).json(result))
        .catch(error => {
          res.status(500).send(error.message || 'Internal Server Error');
          next();
        });
    },
  );

  router.get('/instances/:instanceId/jobs', async (req, res) => {
    const {
      params: { instanceId },
    } = req;

    const jobs = await dataIndexService.fetchProcessInstanceJobs(instanceId);

    if (!jobs) {
      res.status(500).send(`Couldn't fetch jobs for instance ${instanceId}`);
      return;
    }

    res.status(200).json(jobs);
  });

  router.get('/workflows/:workflowId/inputSchema', async (req, res) => {
    const {
      params: { workflowId },
    } = req;

    const workflowDefinition =
      await dataIndexService.getWorkflowDefinition(workflowId);
    const serviceUrl = workflowDefinition.serviceUrl;
    if (!serviceUrl) {
      throw new Error(`ServiceUrl is not defined for workflow ${workflowId}`);
    }

    // workflow source
    const definition =
      await sonataFlowService.fetchWorkflowDefinition(workflowId);

    if (!definition) {
      res.status(500).send(`Couldn't fetch workflow definition ${workflowId}`);
      return;
    }

    const uri = await sonataFlowService.fetchWorkflowUri(workflowId);

    if (!uri) {
      res.status(500).send(`Couldn't fetch workflow uri ${workflowId}`);
      return;
    }

    const workflowItem: WorkflowItem = { uri, definition };

    let schemas: JSONSchema7[] = [];

    if (definition.dataInputSchema) {
      const workflowInfo = await sonataFlowService.fetchWorkflowInfo(
        workflowId,
        serviceUrl,
      );

      if (!workflowInfo) {
        res.status(500).send(`Couldn't fetch workflow info ${workflowId}`);
        return;
      }

      if (!workflowInfo.inputSchema) {
        res
          .status(500)
          .send(`Couldn't fetch workflow input schema ${workflowId}`);
        return;
      }

      schemas = dataInputSchemaService.parseComposition(
        workflowInfo.inputSchema,
      );
    }

    const response: WorkflowDataInputSchemaResponse = {
      workflowItem,
      schemas,
    };

    res.status(200).json(response);
  });

  router.delete('/workflows/:workflowId', async (req, res) => {
    const workflowId = req.params.workflowId;
    const uri = await sonataFlowService.fetchWorkflowUri(workflowId);

    if (!uri) {
      res.status(500).send(`Couldn't fetch workflow uri ${workflowId}`);
      return;
    }

    await workflowService.deleteWorkflowDefinitionById(uri);
    res.status(200).send();
  });

  router.post('/workflows', async (req, res) => {
    const uri = req.query.uri as string;
    const workflowItem = uri?.startsWith('http')
      ? await workflowService.saveWorkflowDefinitionFromUrl(uri)
      : await workflowService.saveWorkflowDefinition({
          uri,
          definition: fromWorkflowSource(req.body),
        });
    res.status(201).json(workflowItem).send();
  });

  router.get('/actions/schema', async (_, res) => {
    const openApi = await openApiService.generateOpenApi();
    res.json(openApi).status(200).send();
  });

  router.put('/actions/schema', async (_, res) => {
    const openApi = await workflowService.saveOpenApi();
    res.json(openApi).status(200).send();
  });

  router.post('/webhook/jira', async (req, res) => {
    const event = req.body as JiraEvent;
    await jiraService.handleEvent(event);
    res.status(200).send();
  });

  router.get('/specs', async (_, res) => {
    const specs = await workflowService.listStoredSpecs();
    res.status(200).json(specs);
  });
}

// ======================================================
// External SonataFlow API calls to delegate to Backstage
// ======================================================
function setupExternalRoutes(
  router: express.Router,
  discovery: DiscoveryApi,
  scaffolderService: ScaffolderService,
) {
  router.get('/actions', async (_, res) => {
    const scaffolderUrl = await discovery.getBaseUrl('scaffolder');
    const response = await fetch(`${scaffolderUrl}/v2/actions`);
    const json = await response.json();
    res.status(response.status).json(json);
  });

  router.post('/actions/:actionId', async (req, res) => {
    const { actionId } = req.params;
    const instanceId: string | undefined = req.header('kogitoprocinstanceid');
    const body: JsonObject = (await req.body) as JsonObject;
    const result: JsonValue = await scaffolderService.executeAction({
      actionId,
      instanceId,
      input: body,
    });
    res.status(200).json(result);
  });
}
