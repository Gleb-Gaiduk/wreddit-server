import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import { Post } from '../entities/Posts';

@Resolver()
export class PostResolver {
  // GET
  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return Post.find();
  }

  // GET BY ID
  @Query(() => Post, { nullable: true })
  post(@Arg('id') id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  // POST
  @Mutation(() => Post)
  async createPost(@Arg('title') title: string): Promise<Post> {
    return Post.create({ title }).save();
  }

  // PUT
  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg('id') id: number,
    @Arg('title', () => String, { nullable: true }) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne({ where: { id } });
    if (!post) return null;

    if (typeof title !== 'undefined') {
      post.title = title;
      await Post.update({ id }, { title });
    }

    return post;
  }

  // DELETE
  @Mutation(() => Boolean)
  async deletePost(@Arg('id') id: number): Promise<boolean> {
    try {
      await Post.delete(id);
      return true;
    } catch (error) {
      return false;
    }
  }
}
