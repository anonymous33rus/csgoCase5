import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TradeService } from 'trade/trade.service';
import { Repository } from 'typeorm';
import { FindOrCreateUserDto } from './dto/findOrCreateUser.dto';
import { User } from './entity/user.entity';
import axios from 'axios';
import { RedisCacheService } from 'redisCache/redisCache.service';
import { ReferallService } from 'user/referall/referall.service';
import { ReferallCode } from 'user/referall/entity/referallCode.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisCacheService: RedisCacheService,
    private readonly tradeService: TradeService,
    private readonly referallService: ReferallService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  findOne(id: number): Promise<User> {
    return this.userRepository.findOneOrFail(id);
  }

  async findOrCreate(profile: FindOrCreateUserDto): Promise<User> {
    let user = await this.findBySteamId(profile.steamid);

    if (!user) {
      user = await this.userRepository.save(
        this.userRepository.create({
          username: profile.personaname,
          steamId: profile.steamid,
          avatar: profile.avatarfull,
        }),
      );
      await this.referallService.createReferallCode(user);
    } else {
      user.username = profile.personaname;
      user.steamId = profile.steamid;
      user.avatar = profile.avatarfull;
    }

    return await this.update(user);
  }

  async findBySteamId(steamId: string): Promise<User> {
    let user = await this.redisCacheService.get(`user_${steamId}`);

    if (user) {
      return user;
    }

    user = await this.userRepository.findOne({
      where: {
        steamId,
      },
    });

    if (user) {
      return await this.update(user);
    } else {
      return user;
    }
  }

  async update(user: User): Promise<User> {
    user = await this.userRepository.save(user);
    await this.redisCacheService.set(`user_${user.steamId}`, user);
    return user;
  }

  async setTradeUrl(user: User, tradeUrl: string): Promise<boolean> {
    try {
      const data = tradeUrl.split('?')[1];

      if (data) {
        if (data.indexOf('partner') > -1 && data.indexOf('token') > -1) {
          const offer =
            this.tradeService.tradeOfferManager.createOffer(tradeUrl);

          if (offer.partner.getSteamID64() !== user.steamId) {
            throw new Error('This is not your trade link');
          }

          user.trade_url = tradeUrl;
          await this.update(user);

          return true;
        }

        throw new Error('Invalid trade link');
      }

      return false;
    } catch (e) {
      throw new Error(`Error setTradeUrl ==> ${e}`);
    }
  }

  async getPlayTimeCSGO(steamId: string): Promise<number> {
    try {
      const response = await axios.get(
        `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_APIKEY}&steamid=${steamId}&format=json`,
      );
      const games = response.data['response']['games'];

      let playedTime = 0;

      games.map((game: any) => {
        if (game.appid === 730) {
          playedTime = game.playtime_forever / 60;
        }
      });

      return playedTime;
    } catch (e) {
      return 0;
    }
  }

  async getProfileVisibleSteam(steamId: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_APIKEY}&steamids=${steamId}`,
      );
      const data = response.data['response']['players'][0];

      let visible = false;

      if (data['communityvisibilitystate'] === 3) {
        visible = true;
      }

      return visible;
    } catch (e) {
      return false;
    }
  }

  async getSteamLevel(steamId: string): Promise<number> {
    try {
      const response = await axios.get(
        `http://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${process.env.STEAM_APIKEY}&steamid=${steamId}`,
      );
      const data = response.data['response'];

      return data.player_level;
    } catch (e) {
      return 0;
    }
  }

  async getUserReferallCode(user: User): Promise<ReferallCode> {
    return await this.referallService.findByUser(user.id);
  }
}