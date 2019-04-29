import {Logger} from 'loggerhythm';

import {DestroyOptions, FindOptions} from 'sequelize';
import {Sequelize, SequelizeOptions} from 'sequelize-typescript';

import {IDisposable} from '@essential-projects/bootstrapper_contracts';
import {BaseError, isEssentialProjectsError, NotFoundError} from '@essential-projects/errors_ts';
import {IIdentity} from '@essential-projects/iam_contracts';
import {SequelizeConnectionManager} from '@essential-projects/sequelize_connection_manager';

import {CorrelationFromRepository, CorrelationState, ICorrelationRepository} from '@process-engine/correlation.contracts';

import {CorrelationModel} from './schemas';

const logger: Logger = new Logger('processengine:persistence:correlation_repository');

export class CorrelationRepository implements ICorrelationRepository, IDisposable {
  public config: SequelizeOptions;

  private _sequelize: Sequelize;
  private _connectionManager: SequelizeConnectionManager;

  constructor(connectionManager: SequelizeConnectionManager) {
    this._connectionManager = connectionManager;
  }

  public async initialize(): Promise<void> {
    logger.verbose('Initializing Sequelize connection and loading models...');
    const connectionAlreadyEstablished: boolean = this._sequelize !== undefined;
    if (connectionAlreadyEstablished) {
      logger.verbose('Repository already initialized. Done.');

      return;
    }
    this._sequelize = await this._connectionManager.getConnection(this.config);

    this._sequelize.addModels([CorrelationModel]);
    await this._sequelize.sync();

    logger.verbose('Done.');
  }

  public async dispose(): Promise<void> {
    logger.verbose('Disposing connection');
    await this._connectionManager.destroyConnection(this.config);
    this._sequelize = undefined;
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

    const createParams: any = {
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

  public async getAll(): Promise<Array<CorrelationFromRepository>> {

    const correlations: Array<CorrelationModel> = await CorrelationModel.findAll();

    const correlationsRuntime: Array<CorrelationFromRepository> = correlations.map(this._convertTocorrelationRuntimeObject.bind(this));

    return correlationsRuntime;
  }

  public async getByCorrelationId(correlationId: string): Promise<Array<CorrelationFromRepository>> {

    const queryParams: FindOptions = {
      where: {
        correlationId: correlationId,
      },
      order: [ [ 'createdAt', 'ASC' ]],
    };

    const correlations: Array<CorrelationModel> = await CorrelationModel.findAll(queryParams);

    const noCorrelationsFound: boolean = !correlations || correlations.length === 0;
    if (noCorrelationsFound) {
      throw new NotFoundError(`Correlation with id "${correlationId}" not found.`);
    }

    const correlationsRuntime: Array<CorrelationFromRepository> = correlations.map(this._convertTocorrelationRuntimeObject.bind(this));

    return correlationsRuntime;
  }

  public async getByProcessModelId(processModelId: string): Promise<Array<CorrelationFromRepository>> {

    const queryParams: FindOptions = {
      where: {
        processModelId: processModelId,
      },
      order: [ [ 'createdAt', 'ASC' ]],
    };

    const correlations: Array<CorrelationModel> = await CorrelationModel.findAll(queryParams);

    const noCorrelationsFound: boolean = !correlations || correlations.length === 0;
    if (noCorrelationsFound) {
      throw new NotFoundError(`No correlations for ProcessModel with ID "${processModelId}" found.`);
    }

    const correlationsRuntime: Array<CorrelationFromRepository> = correlations.map(this._convertTocorrelationRuntimeObject.bind(this));

    return correlationsRuntime;
  }

  public async getByProcessInstanceId(processInstanceId: string): Promise<CorrelationFromRepository> {

    const queryParams: FindOptions = {
      where: {
        processInstanceId: processInstanceId,
      },
    };

    const correlation: CorrelationModel = await CorrelationModel.findOne(queryParams);

    if (!correlation) {
      throw new NotFoundError(`No correlations for ProcessInstance with ID "${processInstanceId}" found.`);
    }

    const correlationRuntime: CorrelationFromRepository = this._convertTocorrelationRuntimeObject(correlation);

    return correlationRuntime;
  }

  public async getSubprocessesForProcessInstance(processInstanceId: string): Promise<Array<CorrelationFromRepository>> {

    const queryParams: FindOptions = {
      where: {
        parentProcessInstanceId: processInstanceId,
      },
      order: [ [ 'createdAt', 'ASC' ]],
    };

    const correlations: Array<CorrelationModel> = await CorrelationModel.findAll(queryParams);

    const correlationsRuntime: Array<CorrelationFromRepository> = correlations.map(this._convertTocorrelationRuntimeObject.bind(this));

    return correlationsRuntime;
  }

  public async deleteCorrelationByProcessModelId(processModelId: string): Promise<void> {

    const queryParams: DestroyOptions = {
      where: {
        processModelId: processModelId,
      },
    };

    await CorrelationModel.destroy(queryParams);
  }

  public async getCorrelationsByState(state: CorrelationState): Promise<Array<CorrelationFromRepository>> {
    const queryParams: FindOptions = {
      where: {
        state: state,
      },
    };

    const matchingCorrelations: Array<CorrelationModel> = await CorrelationModel.findAll(queryParams);
    const correlationsWithState: Array<CorrelationFromRepository> =
      matchingCorrelations.map(this._convertTocorrelationRuntimeObject.bind(this));

    return correlationsWithState;
  }

  public async finishProcessInstanceInCorrelation(correlationId: string, processInstanceId: string): Promise<void> {
    const queryParams: FindOptions = {
      where: {
        correlationId: correlationId,
        processInstanceId: processInstanceId,
      },
    };

    const matchingCorrelation: CorrelationModel = await CorrelationModel.findOne(queryParams);

    const noMatchingCorrelationFound: boolean = matchingCorrelation === undefined;
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

    const matchingCorrelation: CorrelationModel = await CorrelationModel.findOne(queryParams);

    const noMatchingCorrelationFound: boolean = matchingCorrelation === undefined;
    if (noMatchingCorrelationFound) {
      throw new NotFoundError(`No ProcessInstance '${processInstanceId}' in Correlation ${correlationId} found!`);
    }

    matchingCorrelation.state = CorrelationState.error;
    matchingCorrelation.error = this._serializeError(error);

    await matchingCorrelation.save();
  }

  private _serializeError(error: any): string {

    const errorIsFromEssentialProjects: boolean = isEssentialProjectsError(error);
    if (errorIsFromEssentialProjects) {
      return (error as BaseError).serialize();
    }

    const errorIsString: boolean = typeof error === 'string';
    if (errorIsString) {
      return error;
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
  private _convertTocorrelationRuntimeObject(dataModel: CorrelationModel): CorrelationFromRepository {

    const correlation: CorrelationFromRepository = new CorrelationFromRepository();
    correlation.id = dataModel.correlationId;
    correlation.processInstanceId = dataModel.processInstanceId;
    correlation.processModelId = dataModel.processModelId;
    correlation.processModelHash = dataModel.processModelHash;
    correlation.parentProcessInstanceId = dataModel.parentProcessInstanceId || undefined;
    correlation.identity = dataModel.identity ? this._tryParse(dataModel.identity) : undefined;
    correlation.createdAt = dataModel.createdAt;
    correlation.updatedAt = dataModel.updatedAt;
    correlation.state = dataModel.state;

    const dataModelHasError: boolean = dataModel.error !== undefined;
    if (dataModelHasError) {

      const essentialProjectsError: Error = this._tryDeserializeEssentialProjectsError(dataModel.error);

      const errorIsFromEssentialProjects: boolean = essentialProjectsError !== undefined;

      correlation.error = errorIsFromEssentialProjects
        ? essentialProjectsError
        : this._tryParse(dataModel.error);
    }

    return correlation;
  }

  private _tryParse(value: string): any {
    try {
      return JSON.parse(value);
    } catch (error) {
      // Value is not a JSON - return it as it is.
      return value;
    }
  }

  private _tryDeserializeEssentialProjectsError(value: string): Error {
    try {
      return BaseError.deserialize(value);
    } catch (error) {
      return undefined;
    }
  }
}
