import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { Field, ObjectType } from 'type-graphql';

@ObjectType() // To convert class to type accepted by graphql
@Entity()
export class User {
  @Field()
  @PrimaryKey()
  id!: number;

  @Field()
  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Field()
  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Field()
  @Property({ type: 'text', unique: true })
  email!: string;

  @Field()
  @Property({ type: 'text', unique: true })
  username!: string;

  // No @Field - not allowed to request from graphql
  @Property({ type: 'text' })
  password!: string;
}
