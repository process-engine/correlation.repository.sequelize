import * as Sequelize from 'sequelize';

import {
  Correlation,
  defineCorrelation,
  ICorrelationAttributes,
} from './schemas/index';

export async function loadModels(sequelizeInstance: Sequelize.Sequelize): Promise<Sequelize.Model<Correlation, ICorrelationAttributes>> {

  const correlation: Sequelize.Model<Correlation, ICorrelationAttributes> = defineCorrelation(sequelizeInstance);

  await sequelizeInstance.sync();

  return correlation;
}
