import { mockServices } from '@backstage/backend-test-utils';

import {
  AssessedProcessInstanceDTO,
  ExecuteWorkflowResponseDTO,
  ProcessInstancesDTO,
  WorkflowDataDTO,
  WorkflowOverviewDTO,
  WorkflowOverviewListResultDTO,
  WorkflowSpecFile,
} from '@janus-idp/backstage-plugin-orchestrator-common';

import { DataIndexService } from '../DataIndexService';
import { SonataFlowService } from '../SonataFlowService';
import { WorkflowService } from '../WorkflowService';
import abortWorkflowResult from './mapping/__fixtures__/abortWorkFlowResponseV1.json';
import assessedProcessInstanceData from './mapping/__fixtures__/assessedProcessInstance.json';
import {
  mapToGetWorkflowInstanceResults,
  mapToWorkflowOverviewDTO,
  mapToWorkflowSpecFileDTO,
} from './mapping/V2Mappings';
import {
  generateProcessInstance,
  generateProcessInstances,
  generateTestExecuteWorkflowResponse,
  generateTestWorkflowInfo,
  generateTestWorkflowOverview,
  generateTestWorkflowOverviewList,
  generateTestWorkflowSpecs,
  generateWorkflowDefinition,
} from './test-utils';
import { V2 } from './v2';

jest.mock('../SonataFlowService', () => ({
  SonataFlowService: jest.fn(),
  fetchWorkflowOverviews: jest.fn(),
  fetchWorkflowOverview: jest.fn(),
  fetchWorkflowDefinition: jest.fn(),
  fetchWorkflowUri: jest.fn(),
}));

jest.mock('../DataIndexService', () => ({
  DataIndexService: jest.fn(),
  getWorkflowDefinitions: jest.fn(),
  getWorkflowDefinition: jest.fn(),
  fetchProcessInstance: jest.fn(),
  fetchProcessInstances: jest.fn(),
  abortWorkflowInstance: jest.fn(),
}));

jest.mock('../Helper.ts', () => ({
  retryAsyncFunction: jest.fn(),
}));

// Helper function to create a mock SonataFlowService instance
const createMockSonataFlowService = (): SonataFlowService => {
  const mockSonataFlowService = new SonataFlowService(
    {} as any, // Mock config
    {} as any, // Mock dataIndexService
    {} as any, // Mock logger
  );

  // Mock fetchWorkflowDefinition method
  mockSonataFlowService.fetchWorkflowOverviews = jest.fn();
  mockSonataFlowService.fetchWorkflowOverview = jest.fn();
  mockSonataFlowService.fetchWorkflowDefinition = jest.fn();
  mockSonataFlowService.fetchWorkflowUri = jest.fn();
  mockSonataFlowService.executeWorkflow = jest.fn();

  return mockSonataFlowService;
};

// Helper function to create a mock WorkflowService instance
const createMockWorkflowService = (): WorkflowService => {
  const mockWorkflowService = new WorkflowService(
    {} as any, // Mock openApiService
    {} as any, // Mock dataInputSchemaService
    {} as any, // Mock sonataFlowService
    mockServices.rootConfig(), // Mock config
    {} as any, // Mock logger
  );
  mockWorkflowService.listStoredSpecs = jest.fn();

  return mockWorkflowService;
};

const createMockDataIndexService = (): DataIndexService => {
  const mockDataIndexService = new DataIndexService({} as any, {} as any);

  mockDataIndexService.getWorkflowDefinitions = jest.fn();
  mockDataIndexService.getWorkflowDefinition = jest.fn();
  mockDataIndexService.fetchProcessInstances = jest.fn();
  mockDataIndexService.fetchProcessInstance = jest.fn();
  mockDataIndexService.abortWorkflowInstance = jest.fn();

  return mockDataIndexService;
};

describe('getWorkflowOverview', () => {
  let mockSonataFlowService: SonataFlowService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSonataFlowService = createMockSonataFlowService();
  });

  it('0 items in workflow overview list', async () => {
    // Arrange
    const mockOverviewsV1 = {
      items: [],
    };

    (
      mockSonataFlowService.fetchWorkflowOverviews as jest.Mock
    ).mockResolvedValue(mockOverviewsV1.items);

    // Act
    const result: WorkflowOverviewListResultDTO = await V2.getWorkflowsOverview(
      mockSonataFlowService,
    );

    // Assert
    expect(result).toEqual({
      overviews: mockOverviewsV1.items.map(item =>
        mapToWorkflowOverviewDTO(item),
      ),
      paginationInfo: {
        limit: 0,
        offset: 0,
        totalCount: mockOverviewsV1.items.length,
      },
    });
  });

  it('1 item in workflow overview list', async () => {
    // Arrange
    const mockOverviewsV1 = generateTestWorkflowOverviewList(1, {});

    (
      mockSonataFlowService.fetchWorkflowOverviews as jest.Mock
    ).mockResolvedValue(mockOverviewsV1.items);

    // Act
    const result: WorkflowOverviewListResultDTO = await V2.getWorkflowsOverview(
      mockSonataFlowService,
    );

    // Assert
    expect(result).toEqual({
      overviews: mockOverviewsV1.items.map(item =>
        mapToWorkflowOverviewDTO(item),
      ),
      paginationInfo: {
        limit: 0,
        offset: 0,
        totalCount: mockOverviewsV1.items.length,
      },
    });
  });

  it('many items in workflow overview list', async () => {
    // Arrange
    const mockOverviewsV1 = generateTestWorkflowOverviewList(100, {});

    (
      mockSonataFlowService.fetchWorkflowOverviews as jest.Mock
    ).mockResolvedValue(mockOverviewsV1.items);

    // Act
    const result: WorkflowOverviewListResultDTO = await V2.getWorkflowsOverview(
      mockSonataFlowService,
    );

    // Assert
    expect(result).toEqual({
      overviews: mockOverviewsV1.items.map(item =>
        mapToWorkflowOverviewDTO(item),
      ),
      paginationInfo: {
        limit: 0,
        offset: 0,
        totalCount: mockOverviewsV1.items.length,
      },
    });
  });

  it('undefined workflow overview list', async () => {
    // Arrange
    (
      mockSonataFlowService.fetchWorkflowOverviews as jest.Mock
    ).mockRejectedValue(new Error('no workflow overview'));

    // Act
    const promise = V2.getWorkflowsOverview(mockSonataFlowService);

    // Assert
    await expect(promise).rejects.toThrow('no workflow overview');
    (
      mockSonataFlowService.fetchWorkflowOverviews as jest.Mock
    ).mockRejectedValue(new Error('no workflow overview'));
  });
});
describe('getWorkflowOverviewById', () => {
  let mockSonataFlowService: SonataFlowService;
  beforeEach(() => {
    jest.clearAllMocks();
    mockSonataFlowService = createMockSonataFlowService();
  });

  it('0 items in workflow overview list', async () => {
    // Arrange
    const mockOverviewsV1 = {
      items: [],
    };
    (
      mockSonataFlowService.fetchWorkflowOverview as jest.Mock
    ).mockResolvedValue(mockOverviewsV1.items);
    // Act
    const overviewV2 = await V2.getWorkflowOverviewById(
      mockSonataFlowService,
      'test_workflowId',
    );

    // Assert
    expect(overviewV2).toBeDefined();
    expect(overviewV2.workflowId).toBeUndefined();
    expect(overviewV2.name).toBeUndefined();
    expect(overviewV2.uri).toBeUndefined();
    expect(overviewV2.lastTriggeredMs).toBeUndefined();
    expect(overviewV2.lastRunStatus).toBeUndefined();
    expect(overviewV2.category).toEqual('infrastructure');
    expect(overviewV2.avgDurationMs).toBeUndefined();
    expect(overviewV2.description).toBeUndefined();
  });

  it('1 item in workflow overview list', async () => {
    // Arrange
    const mockOverviewsV1 = generateTestWorkflowOverview({
      name: 'test_workflowId',
    });

    (
      mockSonataFlowService.fetchWorkflowOverview as jest.Mock
    ).mockResolvedValue(mockOverviewsV1);

    // Act
    const result: WorkflowOverviewDTO = await V2.getWorkflowOverviewById(
      mockSonataFlowService,
      'test_workflowId',
    );

    // Assert
    expect(result).toEqual(mapToWorkflowOverviewDTO(mockOverviewsV1));
  });
});

describe('getWorkflowSpecs', () => {
  let mockWorkflowService: WorkflowService;
  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkflowService = createMockWorkflowService();
  });

  it('0 items in workflow spec list', async () => {
    // Arrange
    const mockSpecsV1: WorkflowSpecFile[] = [];
    (mockWorkflowService.listStoredSpecs as jest.Mock).mockResolvedValue(
      mockSpecsV1,
    );

    // Act
    const result = await V2.getWorkflowSpecs(mockWorkflowService);

    // Assert
    expect(result).toBeDefined();
    expect(result).toHaveLength(0);
  });

  it('1 item in workflow spec list', async () => {
    // Arrange
    const mockSpecsV1 = generateTestWorkflowSpecs(1);
    (mockWorkflowService.listStoredSpecs as jest.Mock).mockResolvedValue(
      mockSpecsV1,
    );

    // Act
    const result = await V2.getWorkflowSpecs(mockWorkflowService);

    // Assert
    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expect(result).toEqual(
      mockSpecsV1.map(itemV1 => mapToWorkflowSpecFileDTO(itemV1)),
    );
  });

  it('many item in workflow spec list', async () => {
    // Arrange
    const mockSpecsV1 = generateTestWorkflowSpecs(10);
    (mockWorkflowService.listStoredSpecs as jest.Mock).mockResolvedValue(
      mockSpecsV1,
    );

    // Act
    const result = await V2.getWorkflowSpecs(mockWorkflowService);

    // Assert
    expect(result).toBeDefined();
    expect(result).toHaveLength(10);
    expect(result).toEqual(
      mockSpecsV1.map(itemV1 => mapToWorkflowSpecFileDTO(itemV1)),
    );
  });
});

describe('getWorkflowById', () => {
  let mockSonataFlowService: SonataFlowService;
  beforeEach(() => {
    jest.clearAllMocks();
    mockSonataFlowService = createMockSonataFlowService();
  });

  it("Workflow doesn't exists", async () => {
    (
      mockSonataFlowService.fetchWorkflowDefinition as jest.Mock
    ).mockRejectedValue(new Error('No definition'));
    // Act
    const promise = V2.getWorkflowById(
      mockSonataFlowService,
      'test_workflowId',
    );

    // Assert
    await expect(promise).rejects.toThrow('No definition');
  });

  it('1 items in workflow list', async () => {
    const testUri = 'test-uri.sw.yaml';
    const wfDefinition = generateWorkflowDefinition;

    (
      mockSonataFlowService.fetchWorkflowDefinition as jest.Mock
    ).mockResolvedValue(wfDefinition);
    (mockSonataFlowService.fetchWorkflowUri as jest.Mock).mockResolvedValue(
      testUri,
    );
    // Act
    const workflowV2 = await V2.getWorkflowById(
      mockSonataFlowService,
      'test_workflowId',
    );

    // Assert
    expect(workflowV2).toBeDefined();
    expect(workflowV2.id).toBeDefined();
    expect(workflowV2.id).toEqual(wfDefinition.id);
    expect(workflowV2.name).toEqual(wfDefinition.name);
    expect(workflowV2.uri).toEqual(testUri);
    expect(workflowV2.description).toEqual(wfDefinition.description);
    expect(workflowV2.category).toEqual('infrastructure');
    expect(workflowV2.annotations).toBeUndefined();
  });
});

describe('executeWorkflow', () => {
  let mockSonataFlowService: SonataFlowService;
  let mockDataIndexService: DataIndexService;
  beforeEach(async () => {
    jest.clearAllMocks();
    // Mock SonataFlowService instance
    mockSonataFlowService = createMockSonataFlowService();
    mockDataIndexService = createMockDataIndexService();
  });
  it('executes a given workflow', async () => {
    // Arrange
    const workflowInfo = generateTestWorkflowInfo();
    const execResponse = generateTestExecuteWorkflowResponse();
    (mockDataIndexService.getWorkflowDefinition as jest.Mock).mockResolvedValue(
      workflowInfo,
    );

    (mockSonataFlowService.executeWorkflow as jest.Mock).mockResolvedValue(
      execResponse,
    );
    const workflowData = {
      inputData: {
        customAttrib: 'My customAttrib',
      },
    };
    // Act
    const actualResultV2: ExecuteWorkflowResponseDTO = await V2.executeWorkflow(
      mockDataIndexService,
      mockSonataFlowService,
      workflowData,
      workflowInfo.id,
      'businessKey',
    );

    // Assert
    expect(actualResultV2).toBeDefined();
    expect(actualResultV2.id).toBeDefined();
    expect(actualResultV2.id).toEqual(execResponse.id);
    expect(actualResultV2).toEqual(execResponse);
  });
});

describe('getInstances', () => {
  let mockDataIndexService: DataIndexService;
  beforeEach(() => {
    jest.clearAllMocks();
    mockDataIndexService = createMockDataIndexService();
  });

  it("Instance doesn't exists", async () => {
    (mockDataIndexService.fetchProcessInstances as jest.Mock).mockRejectedValue(
      new Error('No definition'),
    );
    // Act
    const promise = V2.getInstances(mockDataIndexService);

    // Assert
    await expect(promise).rejects.toThrow('No definition');
  });

  it('1 items in process instance list', async () => {
    const processInstance = generateProcessInstance(1);

    (mockDataIndexService.fetchProcessInstances as jest.Mock).mockResolvedValue(
      [processInstance],
    );

    // Act
    const processInstanceV2: ProcessInstancesDTO =
      await V2.getInstances(mockDataIndexService);

    // Assert
    expect(processInstanceV2).toBeDefined();
    expect(processInstanceV2).toHaveLength(1);
    expect(processInstanceV2[0].id).toEqual(processInstance.id);
  });
  it('10 items in process instance list', async () => {
    const howmany = 10;
    const processInstance = generateProcessInstances(howmany);

    (mockDataIndexService.fetchProcessInstances as jest.Mock).mockResolvedValue(
      processInstance,
    );

    // Act
    const processInstanceV2: ProcessInstancesDTO =
      await V2.getInstances(mockDataIndexService);

    // Assert
    expect(processInstanceV2).toBeDefined();
    expect(processInstanceV2).toHaveLength(howmany);
    for (let i = 0; i < howmany; i++) {
      expect(processInstanceV2[i].id).toEqual(processInstance[i].id);
    }
  });
});

describe('getInstancesById', () => {
  let mockDataIndexService: DataIndexService;
  beforeEach(() => {
    jest.clearAllMocks();
    mockDataIndexService = createMockDataIndexService();
  });

  it("Instance doesn't exists", async () => {
    (mockDataIndexService.fetchProcessInstance as jest.Mock).mockRejectedValue(
      new Error('No definition'),
    );
    // Act
    const promise = V2.getInstanceById(mockDataIndexService, 'testInstanceId');

    // Assert
    await expect(promise).rejects.toThrow('No definition');
  });

  it('Instance exists, assessment undefined string', async () => {
    const processInstance = generateProcessInstance(1);

    (mockDataIndexService.fetchProcessInstance as jest.Mock).mockResolvedValue(
      processInstance,
    );

    // Act
    const processInstanceV2: AssessedProcessInstanceDTO =
      await V2.getInstanceById(mockDataIndexService, processInstance.id);

    // Assert
    expect(mockDataIndexService.fetchProcessInstance).toHaveBeenCalledTimes(1);
    expect(processInstanceV2).toBeDefined();
    expect(processInstanceV2.instance).toBeDefined();
    expect(processInstanceV2.assessedBy).toBeUndefined();
    expect(processInstanceV2.instance.id).toEqual(processInstance.id);
  });

  it('Instance exists, assessment empty string', async () => {
    const processInstance = generateProcessInstance(1);

    (mockDataIndexService.fetchProcessInstance as jest.Mock).mockResolvedValue(
      processInstance,
    );

    // Act
    const processInstanceV2: AssessedProcessInstanceDTO =
      await V2.getInstanceById(mockDataIndexService, processInstance.id, '');

    // Assert
    expect(mockDataIndexService.fetchProcessInstance).toHaveBeenCalledTimes(1);
    expect(processInstanceV2).toBeDefined();
    expect(processInstanceV2.instance).toBeDefined();
    expect(processInstanceV2.assessedBy).toBeUndefined();
    expect(processInstanceV2.instance.id).toEqual(processInstance.id);
  });

  it('Instance exists, assessment non empty string', async () => {
    const processInstance = generateProcessInstance(1);
    processInstance.businessKey = 'testBusinessKey';
    const assessedBy = generateProcessInstance(1);
    assessedBy.id = processInstance.businessKey;

    (mockDataIndexService.fetchProcessInstance as jest.Mock)
      .mockResolvedValueOnce(processInstance)
      .mockResolvedValueOnce(assessedBy);

    // Act
    const processInstanceV2: AssessedProcessInstanceDTO =
      await V2.getInstanceById(
        mockDataIndexService,
        processInstance.id,
        'foobar',
      );

    // Assert
    expect(mockDataIndexService.fetchProcessInstance).toHaveBeenCalledTimes(2);
    expect(processInstanceV2).toBeDefined();
    expect(processInstanceV2.instance).toBeDefined();
    expect(processInstanceV2.assessedBy).toBeDefined();
    expect(processInstanceV2.assessedBy?.id).toEqual(
      processInstance.businessKey,
    );
    expect(processInstanceV2.instance.id).toEqual(processInstance.id);
  });
});

describe('getWorkflowResults', () => {
  let mockDataIndexService: DataIndexService;
  beforeEach(async () => {
    jest.clearAllMocks();
    mockDataIndexService = createMockDataIndexService();
  });

  it('returns process instance', async () => {
    // Arrange
    const mockGetWorkflowResultsV1 = { ...assessedProcessInstanceData };

    (mockDataIndexService.fetchProcessInstance as jest.Mock).mockResolvedValue(
      mockGetWorkflowResultsV1.instance,
    );

    const expectedResultV2 = mapToGetWorkflowInstanceResults(
      // @ts-ignore
      mockGetWorkflowResultsV1.instance.variables,
    );

    // Act
    const actualResultV2: WorkflowDataDTO = await V2.getWorkflowResults(
      mockDataIndexService,
      'testInstanceId',
    );

    // Assert
    expect(actualResultV2).toBeDefined();
    expect(actualResultV2).toEqual(expectedResultV2);
  });

  it('throws error when no variables attribute is present in the instance object', async () => {
    // Arrange
    const mockGetWorkflowResultsV1 = { ...assessedProcessInstanceData };

    // @ts-ignore
    delete mockGetWorkflowResultsV1.instance.variables;

    (mockDataIndexService.fetchProcessInstance as jest.Mock).mockResolvedValue(
      mockGetWorkflowResultsV1,
    );

    // Act
    const promise = V2.getWorkflowResults(mockDataIndexService, 'instanceId');

    // Assert
    await expect(promise).rejects.toThrow(
      'Error getting workflow instance results with id instanceId',
    );
  });

  it('throws error when no instanceId is provided', async () => {
    const promise = V2.getWorkflowResults(mockDataIndexService, '');

    // Assert
    await expect(promise).rejects.toThrow(
      'No instance id was provided to get workflow results',
    );
  });

  it('throws error when no dataIndexService is provided', async () => {
    const promise = V2.getWorkflowResults(
      // @ts-ignore
      null,
      'testInstanceId',
    );

    // Assert
    await expect(promise).rejects.toThrow(
      'No data index service provided for executing workflow with id',
    );
  });
});

describe('abortWorkflow', () => {
  let mockDataIndexService: DataIndexService;
  beforeEach(async () => {
    jest.clearAllMocks();
    mockDataIndexService = createMockDataIndexService();
  });

  it('aborts workflows', async () => {
    // Arrange
    const mockAbortWorkflowResultV1 = { ...abortWorkflowResult };

    (mockDataIndexService.abortWorkflowInstance as jest.Mock).mockResolvedValue(
      mockAbortWorkflowResultV1,
    );

    const expectedResultV2 = 'Workflow ${workflowId} successfully aborted';

    // Act
    const actualResultV2: string = await V2.abortWorkflow(
      mockDataIndexService,
      'testInstanceId',
    );

    // Assert
    expect(actualResultV2).toBeDefined();
    expect(actualResultV2).toEqual(expectedResultV2);
  });

  it('throws error when abort workflows response has error attribute', async () => {
    // Arrange
    const mockAbortWorkflowResultV1 = { ...abortWorkflowResult };
    mockAbortWorkflowResultV1.error = 'Simulated abort workflow error';
    (mockDataIndexService.abortWorkflowInstance as jest.Mock).mockResolvedValue(
      mockAbortWorkflowResultV1,
    );

    // Act
    const promise = V2.abortWorkflow(mockDataIndexService, 'instanceId');

    // Assert
    await expect(promise).rejects.toThrow(
      "Can't abort workflow instanceId. The error was: Simulated abort workflow error",
    );
  });
});
