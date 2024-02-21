import { v4 as uuidv4 } from 'uuid';

import {
  WorkflowOverview,
  WorkflowSpecFile,
} from '@janus-idp/backstage-plugin-orchestrator-common';

import {
  fakeOpenAPIV3Document,
  generateTestExecuteWorkflowResponse,
  generateTestWorkflowOverview,
  generateTestWorkflowSpecs,
} from '../test-utils';
import {
  mapToExecuteWorkflowResponseDTO,
  mapToWorkflowOverviewDTO,
  mapToWorkflowSpecFileDTO,
  mapWorkflowCategoryDTOFromString,
} from './V2Mappings';

describe('scenarios to verify executeWorkflowResponseDTO', () => {
  it('correctly maps positive scenario response', async () => {
    const execWorkflowResp = generateTestExecuteWorkflowResponse();
    const mappedValue = mapToExecuteWorkflowResponseDTO(
      'test_workflowId',
      execWorkflowResp,
    );
    expect(mappedValue).toBeDefined();
    expect(mappedValue.id).toBeDefined();
    expect(Object.keys(mappedValue).length).toBe(1);
  });

  it('throws error when no id attribute present in response', async () => {
    expect(() => {
      mapToExecuteWorkflowResponseDTO('workflowId', { id: '' });
    }).toThrow(
      `Error while mapping ExecuteWorkflowResponse to ExecuteWorkflowResponseDTO for workflow with id`,
    );
  });
});

describe('scenarios to verify mapToWorkflowOverviewDTO', () => {
  it('correctly maps WorkflowOverview', () => {
    // Arrange
    const overview: WorkflowOverview = generateTestWorkflowOverview({
      category: 'assessment',
    });

    // Act
    const result = mapToWorkflowOverviewDTO(overview);

    // Assert
    expect(result.workflowId).toBe(overview.workflowId);
    expect(result.name).toBe(overview.name);
    expect(result.uri).toBe(overview.uri);
    expect(result.lastTriggeredMs).toBe(overview.lastTriggeredMs);
    expect(result.lastRunStatus).toBe(overview.lastRunStatus);
    expect(result.category).toBe('assessment');
    expect(result.avgDurationMs).toBe(overview.avgDurationMs);
    expect(result.description).toBe(overview.description);
    expect(Object.keys(result).length).toBe(8);
  });
});
describe('scenarios to verify mapWorkflowCategoryDTOFromString', () => {
  test.each([
    { input: 'assessment', expected: 'assessment' },
    { input: 'infrastructure', expected: 'infrastructure' },
    { input: 'random category', expected: 'infrastructure' },
  ])('mapWorkflowCategoryDTOFromString($input)', ({ input, expected }) => {
    // Arrange
    const overview: WorkflowOverview = generateTestWorkflowOverview({
      category: input,
    });

    // Act
    const resultCategory = mapWorkflowCategoryDTOFromString(overview.category);

    // Assert
    expect(resultCategory).toBeDefined();
    expect(resultCategory).toBe(expected);
  });
});

describe('scenarios to verify mapToWorkflowSpecFileDTO', () => {
  it('correctly maps WorkflowSpecFile', () => {
    // Arrange
    const specV1: WorkflowSpecFile[] = generateTestWorkflowSpecs(1);

    // Act
    const result = mapToWorkflowSpecFileDTO(specV1[0]);

    // Assert
    expect(result.path).toBeDefined();
    expect(result.path).toEqual('/test/path/openapi_0.json');
    expect(result.content).toBeDefined();
    expect(JSON.parse(result.content)).toEqual(fakeOpenAPIV3Document());
    expect(Object.keys(result).length).toBe(2);
  });
});
