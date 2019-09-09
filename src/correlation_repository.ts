import {Logger} from 'loggerhythm';

import {DestroyOptions, FindOptions} from 'sequelize';
import {Sequelize, SequelizeOptions} from 'sequelize-typescript';

import {IDisposable} from '@essential-projects/bootstrapper_contracts';
import {BaseError, NotFoundError, isEssentialProjectsError} from '@essential-projects/errors_ts';
import {IIdentity} from '@essential-projects/iam_contracts';
import {SequelizeConnectionManager} from '@essential-projects/sequelize_connection_manager';

import {CorrelationFromRepository, CorrelationState, ICorrelationRepository} from '@process-engine/correlation.contracts';

import {CorrelationModel} from './schemas';

const logger = new Logger('processengine:persistence:correlation_repository');

type Pagination = {
  limit?: number;
  offset?: number;
};

export class CorrelationRepository implements ICorrelationRepository, IDisposable {

  public config: SequelizeOptions;

  private sequelizeInstance: Sequelize;
  private connectionManager: SequelizeConnectionManager;

  constructor(connectionManager: SequelizeConnectionManager) {
    this.connectionManager = connectionManager;
  }

  public async initialize(): Promise<void> {
    logger.verbose('Initializing Sequelize connection and loading models...');
    const connectionAlreadyEstablished = this.sequelizeInstance !== undefined;
    if (connectionAlreadyEstablished) {
      logger.verbose('Repository already initialized. Done.');

      return;
    }
    this.sequelizeInstance = await this.connectionManager.getConnection(this.config);

    this.sequelizeInstance.addModels([CorrelationModel]);
    await this.sequelizeInstance.sync();

    logger.verbose('Done.');
  }

  public async dispose(): Promise<void> {
    logger.verbose('Disposing connection');
    await this.connectionManager.destroyConnection(this.config);
    this.sequelizeInstance = undefined;
    logger.verbose('Done.');
  }

  public async createEntry(
    identity: IIdentity,
    correlationId: string,
    processInstanceId: string,
    processModelId: string,
    processModelHash: string,
    parentProcessInstanceId?: string,
  ): Promise<void> {

    const createParams = {
      correlationId: correlationId,
      processInstanceId: processInstanceId,
      processModelId: processModelId,
      parentProcessInstanceId: parentProcessInstanceId,
      processModelHash: processModelHash,
      identity: JSON.stringify(identity),
      state: CorrelationState.running,
    };

    await CorrelationModel.create(createParams);
  }

  public async getAll(offset: number = 0, limit: number = 0): Promise<Array<CorrelationFromRepository>> {

    const correlations = await CorrelationModel.findAll({
      ...this.createPagination(offset, limit),
    });

    const correlationsRuntime = correlations.map<CorrelationFromRepository>(this.convertTocorrelationRuntimeObject.bind(this));

    return correlationsRuntime;
  }

  public async getByCorrelationId(correlationId: string, offset: number = 0, limit: number = 0): Promise<Array<CorrelationFromRepository>> {

    const queryParams: FindOptions = {
      where: {
        correlationId: correlationId,
      },
      order: [['createdAt', 'ASC']],
      ...this.createPagination(offset, limit),
    };

    const correlations = await CorrelationModel.findAll(queryParams);

    const noCorrelationsFound = !correlations || correlations.length === 0;
    if (noCorrelationsFound) {
      throw new NotFoundError(`Correlation with id "${correlationId}" not found.`);
    }

    const correlationsRuntime = correlations.map<CorrelationFromRepository>(this.convertTocorrelationRuntimeObject.bind(this));

    return correlationsRuntime;
  }

  public async getByProcessModelId(processModelId: string, offset: number = 0, limit: number = 0): Promise<Array<CorrelationFromRepository>> {

    const queryParams: FindOptions = {
      where: {
        processModelId: processModelId,
      },
      order: [['createdAt', 'ASC']],
      ...this.createPagination(offset, limit),
    };

    const correlations = await CorrelationModel.findAll(queryParams);

    const noCorrelationsFound = !correlations || correlations.length === 0;
    if (noCorrelationsFound) {
      throw new NotFoundError(`No correlations for ProcessModel with ID "${processModelId}" found.`);
    }

    const correlationsRuntime = correlations.map<CorrelationFromRepository>(this.convertTocorrelationRuntimeObject.bind(this));

    return correlationsRuntime;
  }

  public async getByProcessInstanceId(processInstanceId: string): Promise<CorrelationFromRepository> {

    const queryParams: FindOptions = {
      where: {
        processInstanceId: processInstanceId,
      },
    };

    const correlation = await CorrelationModel.findOne(queryParams);

    if (!correlation) {
      throw new NotFoundError(`No correlations for ProcessInstance with ID "${processInstanceId}" found.`);
    }

    const correlationRuntime = this.convertTocorrelationRuntimeObject(correlation);

    return correlationRuntime;
  }

  public async getSubprocessesForProcessInstance(
    processInstanceId: string,
    offset: number = 0,
    limit: number = 0,
  ): Promise<Array<CorrelationFromRepository>> {

    const queryParams: FindOptions = {
      where: {
        parentProcessInstanceId: processInstanceId,
      },
      order: [['createdAt', 'ASC']],
      ...this.createPagination(offset, limit),
    };

    const correlations = await CorrelationModel.findAll(queryParams);

    const correlationsRuntime = correlations.map<CorrelationFromRepository>(this.convertTocorrelationRuntimeObject.bind(this));

    return correlationsRuntime;
  }

  public async getCorrelationsByState(state: CorrelationState, offset: number = 0, limit: number = 0): Promise<Array<CorrelationFromRepository>> {
    const queryParams: FindOptions = {
      where: {
        state: state,
      },
      ...this.createPagination(offset, limit),
    };

    const matchingCorrelations = await CorrelationModel.findAll(queryParams);
    const correlationsWithState = matchingCorrelations.map<CorrelationFromRepository>(this.convertTocorrelationRuntimeObject.bind(this));

    return correlationsWithState;
  }

  public async deleteCorrelationByProcessModelId(processModelId: string): Promise<void> {

    const queryParams: DestroyOptions = {
      where: {
        processModelId: processModelId,
      },
    };

    await CorrelationModel.destroy(queryParams);
  }

  public async finishProcessInstanceInCorrelation(correlationId: string, processInstanceId: string): Promise<void> {
    const queryParams: FindOptions = {
      where: {
        correlationId: correlationId,
        processInstanceId: processInstanceId,
      },
    };

    const matchingCorrelation = await CorrelationModel.findOne(queryParams);

    const noMatchingCorrelationFound = matchingCorrelation === undefined;
    if (noMatchingCorrelationFound) {
      throw new NotFoundError(`No ProcessInstance '${processInstanceId}' in Correlation ${correlationId} found!`);
    }

    matchingCorrelation.state = CorrelationState.finished;

    await matchingCorrelation.save();
  }

  public async finishProcessInstanceInCorrelationWithError(correlationId: string, processInstanceId: string, error: Error): Promise<void> {
    const queryParams: FindOptions = {
      where: {
        correlationId: correlationId,
        processInstanceId: processInstanceId,
      },
    };

    const matchingCorrelation = await CorrelationModel.findOne(queryParams);

    const noMatchingCorrelationFound = matchingCorrelation === undefined;
    if (noMatchingCorrelationFound) {
      throw new NotFoundError(`No ProcessInstance '${processInstanceId}' in Correlation ${correlationId} found!`);
    }

    matchingCorrelation.state = CorrelationState.error;
    matchingCorrelation.error = this.serializeError(error);

    await matchingCorrelation.save();
  }

  private serializeError(error: Error | string): string {

    const errorIsFromEssentialProjects = isEssentialProjectsError(error);
    if (errorIsFromEssentialProjects) {
      return (error as BaseError).serialize();
    }

    const errorIsString = typeof error === 'string';
    if (errorIsString) {
      // For backwards compatibility.
      return error as string;
    }

    return JSON.stringify(error);
  }

  /**
   * Takes a Correlation object as it was retrieved from the database
   * and convertes it into a Runtime object usable by the ProcessEngine.
   *
   * @param   dataModel The correlation data retrieved from the database.
   * @returns           The ProcessEngine runtime object describing a
   *                    correlation.
   */
  private convertTocorrelationRuntimeObject(dataModel: CorrelationModel): CorrelationFromRepository {

    const correlation = new CorrelationFromRepository();
    correlation.id = dataModel.correlationId;
    correlation.processInstanceId = dataModel.processInstanceId;
    correlation.processModelId = dataModel.processModelId;
    correlation.processModelHash = dataModel.processModelHash;
    correlation.parentProcessInstanceId = dataModel.parentProcessInstanceId || undefined;
    correlation.identity = dataModel.identity ? this.tryParse(dataModel.identity) : undefined;
    correlation.createdAt = dataModel.createdAt;
    correlation.updatedAt = dataModel.updatedAt;
    correlation.state = dataModel.state;

    const dataModelHasError = dataModel.error !== undefined;
    if (dataModelHasError) {

      const essentialProjectsError = this.tryDeserializeEssentialProjectsError(dataModel.error);

      const errorIsFromEssentialProjects = essentialProjectsError !== undefined;

      correlation.error = errorIsFromEssentialProjects
        ? essentialProjectsError
        : this.tryParse(dataModel.error);
    }

    return correlation;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tryParse(value: string): any {
    try {
      return JSON.parse(value);
    } catch (error) {
      // Value is not a JSON - return it as it is.
      return value;
    }
  }

  private tryDeserializeEssentialProjectsError(value: string): Error {
    try {
      return BaseError.deserialize(value);
    } catch (error) {
      return undefined;
    }
  }

  private createPagination(offset: number, limit: number): Pagination {
    const pagination: Pagination = {};

    if (offset > 0) {
      pagination.offset = offset;
    }

    if (limit > 0) {
      pagination.limit = limit;
    }

    return pagination;
  }

}
