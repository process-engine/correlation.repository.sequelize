import {getConnection} from '@essential-projects/sequelize_connection_manager';

import * as Sequelize from 'sequelize';

import {loadModels} from './model_loader';

export class CorrelationRepository {

  public config: Sequelize.Options;

  private sequelize: Sequelize.Sequelize;

  public async initialize(): Promise<void> {
    this.sequelize = await getConnection(this.config);
    await loadModels(this.sequelize);
  }

}
