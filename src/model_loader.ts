import * as Sequelize from 'sequelize';

import {
  defineCorrelation,
  ICorrelationAttributes,
  Correlation,
} from './schemas/index';

export async function loadModels(sequelizeInstance: Sequelize.Sequelize): Promise<Sequelize.Model<Correlation, ICorrelationAttributes>> {

  const correlation: Sequelize.Model<Correlation, ICorrelationAttributes> = defineCorrelation(sequelizeInstance);

  await sequelizeInstance.sync();

  return correlation;
}
