import {AllowNull, Column, CreatedAt, DataType, Model, Table, UpdatedAt} from 'sequelize-typescript';

import {CorrelationState} from '@process-engine/correlation.contracts';

@Table({modelName: 'Correlation', tableName: 'Correlations', version: true})
export class CorrelationModel extends Model<CorrelationModel> {

  @AllowNull(false)
  @Column
  public correlationId: string;

  @AllowNull(false)
  @Column
  public processInstanceId: string;

  @AllowNull(false)
  @Column
  public processModelId: string;

  @AllowNull(false)
  @Column({type: DataType.TEXT})
  public processModelHash: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  public identity: string;

  @AllowNull(false)
  @Column({type: DataType.TEXT, defaultValue: 'running'})
  public state: CorrelationState;

  @AllowNull(true)
  @Column(DataType.TEXT)
  public error?: string;

  @Column
  public parentProcessInstanceId: string;

  @CreatedAt
  public createdAt?: Date;

  @UpdatedAt
  public updatedAt?: Date;
}
