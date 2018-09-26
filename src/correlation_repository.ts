import * as Sequelize from 'sequelize';

import {NotFoundError} from '@essential-projects/errors_ts';
import {getConnection} from '@essential-projects/sequelize_connection_manager';

import {ICorrelationRepository, Runtime} from '@process-engine/process_engine_contracts';

import {loadModels} from './model_loader';

import {Correlation, ICorrelationAttributes} from './schemas';

export class CorrelationRepository implements ICorrelationRepository {

  public config: Sequelize.Options;

  private _correlation: Sequelize.Model<Correlation, ICorrelationAttributes>;

  private sequelize: Sequelize.Sequelize;

  private get correlation(): Sequelize.Model<Correlation, ICorrelationAttributes> {
    return this._correlation;
  }

  public async initialize(): Promise<void> {
    this.sequelize = await getConnection(this.config);
    await loadModels(this.sequelize);

    this._correlation = this.sequelize.models.Correlation;
  }

  public async createEntry(correlationId: string, processModelHash: string): Promise<void> {

    const createParams: any = {
      correlationId: correlationId,
      processModelHash: processModelHash,
    };

    await this.correlation.create(createParams);
  }

  public async getByCorrelationId(correlationId: string): Promise<Array<Runtime.Types.CorrelationFromRepository>> {

    const queryParams: Sequelize.FindOptions<ICorrelationAttributes> = {
      where: {
        correlationId: correlationId,
      },
      order: [ [ 'createdAt', 'ASC' ]],
    };

    const correlations: Array<Correlation> = await this.correlation.findAll(queryParams);

    if (!correlations || correlations.length === 0) {
      throw new NotFoundError(`Correlation with id "${correlationId}" not found.`);
    }

    const correlationsRuntime: Array<Runtime.Types.CorrelationFromRepository> = correlations.map(this._convertTocorrelationRuntimeObject.bind(this));

    return correlationsRuntime;
  }

  public async getByProcessModelHash(processModelHash: string): Promise<Array<Runtime.Types.CorrelationFromRepository>> {

    const queryParams: Sequelize.FindOptions<ICorrelationAttributes> = {
      where: {
        processModelHash: processModelHash,
      },
      order: [ [ 'createdAt', 'ASC' ]],
    };

    const correlations: Array<Correlation> = await this.correlation.findAll(queryParams);

    const correlationsRuntime: Array<Runtime.Types.CorrelationFromRepository> = correlations.map(this._convertTocorrelationRuntimeObject.bind(this));

    return correlationsRuntime;
  }

  public async getByProcessModelHashes(processModelHashes: Array<string>): Promise<Array<Runtime.Types.CorrelationFromRepository>> {

    const queryParams: Sequelize.FindOptions<ICorrelationAttributes> = {
      where: {
        processModelHash: {
          $in: processModelHashes,
        },
      },
      order: [ [ 'createdAt', 'ASC' ]],
    };

    const correlations: Array<Correlation> = await this.correlation.findAll(queryParams);

    const correlationsRuntime: Array<Runtime.Types.CorrelationFromRepository> = correlations.map(this._convertTocorrelationRuntimeObject.bind(this));

    return correlationsRuntime;
  }

  /**
   * Takes a Correlation object as it was retrieved from the database
   * and convertes it into a Runtime object usable by the ProcessEngine.
   *
   * @param   dataModel The correlation data retrieved from the database.
   * @returns           The ProcessEngine runtime object describing a
   *                    correlation.
   */
  private _convertTocorrelationRuntimeObject(dataModel: Correlation): Runtime.Types.CorrelationFromRepository {

    const correlation: Runtime.Types.CorrelationFromRepository = new Runtime.Types.CorrelationFromRepository();
    correlation.id = dataModel.correlationId;
    correlation.processModelHash = dataModel.processModelHash;
    correlation.createdAt = dataModel.createdAt;
    correlation.updatedAt = dataModel.updatedAt;

    return correlation;
  }
}
