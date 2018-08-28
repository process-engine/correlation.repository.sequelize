import * as Sequelize from 'sequelize';

import {Runtime} from '@process-engine/process_engine_contracts';

export interface ICorrelationAttributes {}

export type Correlation = Sequelize.Instance<ICorrelationAttributes> & ICorrelationAttributes;

export function defineCorrelation(sequelize: Sequelize.Sequelize): Sequelize.Model<Correlation, ICorrelationAttributes> {

  const attributes: SequelizeAttributes<ICorrelationAttributes> = {};

  return sequelize.define<Correlation, ICorrelationAttributes>('Correlation', attributes);
}
