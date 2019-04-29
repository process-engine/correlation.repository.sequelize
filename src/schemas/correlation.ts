import {AllowNull, Column, CreatedAt, DataType, Model, Table, UpdatedAt} from 'sequelize-typescript';

import {CorrelationState} from '@process-engine/correlation.contracts';

@Table
export class Correlation extends Model<Correlation> {

  @Column
  @AllowNull(false)
  public correlationId: string;

  @Column
  public processInstanceId: string;

  @Column
  public processModelId: string;

  @Column({type: DataType.TEXT})
  @AllowNull(false)
  public processModelHash: string;

  @Column(DataType.TEXT)
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
