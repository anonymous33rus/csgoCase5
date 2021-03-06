import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizedModel } from 'auth/model/authorized.model';
import { findOrCreate } from 'base/repository';
import { GiveawayService } from 'giveaway/giveaway.service';
import { ItemService } from 'item/item.service';
import { RedisCacheService } from 'redisCache/redisCache.service';
import { Repository } from 'typeorm';
import { UpdateConfigInput } from './dto/update-config.input';
import { Config } from './entity/config.entity';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(Config)
    private readonly configRepository: Repository<Config>,
    private readonly redisCacheService: RedisCacheService,
    private readonly itemService: ItemService,
    private readonly giveawayService: GiveawayService,
  ) {}
  async updateConfig(
    input: UpdateConfigInput,
    author: AuthorizedModel,
  ): Promise<Config> {
    const id = parseInt(input.id, 10);
    const config = await this.configRepository.findOneOrFail(id);
    await this.redisCacheService.set('config', config);
    return await this.configRepository.save(
      this.configRepository.merge(config, {
        ...input,
        id,
      }),
    );
  }

  async onApplicationBootstrap(): Promise<Config> {
    const config = await findOrCreate(this.configRepository, {
      id: 1,
      siteName: process.env.APP_URL,
    });
    await this.redisCacheService.set('config', config);
    await this.itemService.checkItems();
    await this.giveawayService.bootstrap();
    return config;

    // await this.configRepository.save(
    //   this.configRepository.create({
    //     siteName: process.env.APP_URL
    //   })
    // )
  }
}
