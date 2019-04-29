import {AllowNull, Column, CreatedAt, DataType, Model, Table, UpdatedAt} from 'sequelize-typescript';

import {CorrelationState} from '@process-engine/correlation.contracts';

@Table({modelName: 'Correlation', tableName: 'Correlation', version: true})
export class CorrelationModel extends Model<CorrelationModel> {

  @Column
  @AllowNull(false)
  public correlationId: string;

  @Column
  @AllowNull(true)
  public processInstanceId: string;

  @Column
  @AllowNull(true)
  public processModelId: string;

  @Column({type: DataType.TEXT})
  @AllowNull(false)
  public processModelHash: string;

  @Column(DataType.TEXT)
  @AllowNull(true)
  public identity: string;

  @Column(DataType.STRING)
  @AllowNull(false)
  public state: CorrelationState;

  @Column(DataType.TEXT)
  @AllowNull(false)
  public error?: string;

  @Column
  public parentProcessInstanceId: string;

  @CreatedAt
  public createdAt?: Date;

  @UpdatedAt
  public updatedAt?: Date;
}
