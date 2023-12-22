import { PluginTaskScheduler } from '@backstage/backend-tasks';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  ANNOTATION_SOURCE_LOCATION,
  ANNOTATION_VIEW_URL,
  Entity,
} from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { DiscoveryApi } from '@backstage/core-plugin-api';
import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { EventParams, EventSubscriber } from '@backstage/plugin-events-node';
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';

import { Logger } from 'winston';

import {
  default_catalog_environment,
  default_catalog_owner,
  getWorkflowCategory,
  orchestrator_service_ready_topic,
  Workflow,
  workflow_type,
  WorkflowCategory,
  WorkflowItem,
} from '@janus-idp/backstage-plugin-orchestrator-common';

export class OrchestratorEntityProvider
  implements EntityProvider, EventSubscriber
{
  private connection: EntityProviderConnection | undefined;

  private readonly scheduler: PluginTaskScheduler;
  private readonly logger: Logger;

  private readonly owner: string;
  private readonly environment: string;

  private readonly sonataFlowServiceUrl: string;
  private readonly orchestratorPluginUrl: string;

  static async fromConfig(args: {
    config: Config;
    logger: Logger;
    scheduler: PluginTaskScheduler;
    discovery: DiscoveryApi;
  }): Promise<OrchestratorEntityProvider> {
    const sonataFlowBaseUrl = args.config.getString(
      'orchestrator.sonataFlowService.baseUrl',
    );
    const sonataFlowPort = args.config.getOptionalNumber(
      'orchestrator.sonataFlowService.port',
    );
    const owner =
      args.config.getOptionalString('orchestrator.catalog.owner') ??
      default_catalog_owner;
    const environment =
      args.config.getOptionalString('orchestrator.catalog.environment') ??
      default_catalog_environment;

    const orchestratorPluginUrl =
      await args.discovery.getBaseUrl('orchestrator');

    const sonataFlowServiceUrl = sonataFlowPort
      ? `${sonataFlowBaseUrl}:${sonataFlowPort}`
      : sonataFlowBaseUrl;

    return new OrchestratorEntityProvider({
      sonataFlowServiceUrl,
      orchestratorPluginUrl,
      scheduler: args.scheduler,
      logger: args.logger,
      owner,
      environment,
    });
  }

  constructor(args: {
    sonataFlowServiceUrl: string;
    orchestratorPluginUrl: string;
    scheduler: PluginTaskScheduler;
    logger: Logger;
    owner: string;
    environment: string;
  }) {
    this.sonataFlowServiceUrl = args.sonataFlowServiceUrl;
    this.orchestratorPluginUrl = args.orchestratorPluginUrl;
    this.scheduler = args.scheduler;
    this.owner = args.owner;
    this.logger = args.logger;
    this.environment = args.environment;
  }

  getProviderName(): string {
    return OrchestratorEntityProvider.name;
  }

  supportsEventTopics(): string[] {
    return [orchestrator_service_ready_topic];
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;

    this.scheduler.scheduleTask({
      id: `${this.getProviderName()}__task`,
      fn: async () => {
        await this.run();
      },
      frequency: { seconds: 5 },
      timeout: { minutes: 10 },
    });
  }

  async onEvent(params: EventParams): Promise<void> {
    if (params.topic !== orchestrator_service_ready_topic) {
      return;
    }
    await this.run();
  }

  async run() {
    if (!this.connection) {
      return;
    }

    this.logger.info('Retrieving workflow definitions');

    try {
      const svcResponse = await fetch(
        `${this.orchestratorPluginUrl}/workflows`,
      );
      const json = await svcResponse.json();
      const items = json.items as Workflow[];

      const entities: Entity[] = items?.length
        ? this.workflowToTemplateEntities(items)
        : [];

      await this.connection.applyMutation({
        type: 'full',
        entities: entities.map(entity => ({
          entity,
          locationKey: `${this.getProviderName()}:${this.environment}`,
        })),
      });
    } catch (e) {
      this.logger.error('Error retrieving workflow definitions', e);
    }
  }

  private workflowToTemplateEntities(
    items: Workflow[],
  ): TemplateEntityV1beta3[] {
    return items.map(i => {
      const sanitizedId = i.id?.replace(/ /g, '_');

      return {
        apiVersion: 'scaffolder.backstage.io/v1beta3',
        kind: 'Template',
        metadata: {
          name: sanitizedId,
          title: i.name,
          description: i.description,
          tags: [i.category],
          annotations: {
            [ANNOTATION_LOCATION]: `url:${this.sonataFlowServiceUrl}`,
            [ANNOTATION_ORIGIN_LOCATION]: `url:${this.sonataFlowServiceUrl}`,
            [ANNOTATION_SOURCE_LOCATION]: `url:${this.sonataFlowServiceUrl}/management/processes/${sanitizedId}/source`,
            [ANNOTATION_VIEW_URL]: `${this.sonataFlowServiceUrl}/management/processes/${sanitizedId}/source`,
          },
        },
        spec: {
          owner: this.owner,
          type: workflow_type,
          steps: [],
        },
      };
    });
  }
}
