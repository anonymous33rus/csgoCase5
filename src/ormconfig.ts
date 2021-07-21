import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Case } from 'game/case/entity/case.entity';
import { CaseItems } from 'game/case/entity/caseItems.entity';
import { Config } from 'config/entity/config.entity';
import { GameCase } from 'game/game/entity/game-case.entity';
import { Inventory } from 'inventory/entity/inventory.entity';
import { Item } from 'item/entity/item.entity';
import { PromocodeUse } from 'promocode/entity/promocode-use.entity';
import { Promocode } from 'promocode/entity/promocode.entity';
import { User } from 'user/entity/user.entity';

const config: TypeOrmModuleOptions = {
  type: 'mysql',
  host: 'db',
  port: 3306,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  acquireTimeout: 60000,
  connectTimeout: 60000,
  entities: [
    User,
    Promocode,
    PromocodeUse,
    Config,
    Item,
    Inventory,
    Case,
    CaseItems,
    GameCase,
  ],
  synchronize: true,

  // migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  // migrationsRun: true,
  cli: {
    migrationsDir: 'src/migrations',
  },
};

export default config;
