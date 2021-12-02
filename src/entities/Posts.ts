import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { Field, ObjectType } from 'type-graphql';

@ObjectType() // To convert class to type accepted by graphql
@Entity()
export class Post {
  // Adding @Fields decorators to set up schema for graphql types
  // Removing @Field you won't have access to a property after graphql query
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
  @Property({ type: 'text' })
  title!: string;
}
