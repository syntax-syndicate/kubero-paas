import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DatabaseService {

  private logger = new Logger(DatabaseService.name);
  private readonly prisma = new PrismaClient();

  constructor() {
    // Initialize the Prisma client
    this.prisma.$connect()
      .then(() => {
        this.logger.log('Connected to the database successfully.');
      })
      .catch((error) => {
        this.logger.error('Failed to connect to the database.', error);
      });
    this.runMigrations()
      .then(() => {
        // create user after migrations
        this.createAdminUser()
        this.migrateLegeacyUsers()
      })
      .catch((error) => {
        this.logger.error('Error during database migrations.', error);
      });
  }

  private async init() {
    if (process.env.DATABASE_URL === '' || process.env.DATABASE_URL === undefined) {
      process.env.DATABASE_URL = 'file:../db/kubero.sqlite';
      process.env.DATABASE_TYPE = 'sqlite';
      Logger.debug(
        'DATABASE_URL is not set. Using SQLite database: ' + process.env.DATABASE_URL,
        'DatabaseService',
      );
    }
  }
  
  private async runMigrations() {
    const { execSync } = await import('child_process');

    await this.init();
    
    const prisma = new PrismaClient();
    
    try {
      this.logger.log('Running Prisma migrations...');
      // @ts-ignore
      await prisma.$executeRawUnsafe?.('PRAGMA foreign_keys=OFF;'); // For SQLite, optional
      // Use CLI for migrations
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      //execSync('npx prisma migrate deploy', {});
      this.logger.log('Prisma migrations completed.');
      await prisma.$executeRaw`
        INSERT INTO "User" (
          "id", 
          "email", 
          "username", 
          "password", 
          "isActive",
          createdAt,
          updatedAt
        ) VALUES (
          "1", 
          'system@kubero.dev', 
          'system', 
          '', 
          false,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        ) ON CONFLICT DO NOTHING;`
      await prisma.$disconnect();
    } catch (err) {
      this.logger.error('Prisma migration failed', err);
      process.exit(1);
    }
  }

  private async createAdminUser() {
    const prisma = new PrismaClient();
    
    // Check if the admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: '2' },
    });
    if (existingUser) {
      this.logger.log('Admin user already exists. Skipping creation.');
      return;
    }

    const adminUser = process.env.KUBERO_ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.KUBERO_ADMIN_EMAIL || 'admin@kubero.dev';

    try {

      // Generiere ein zufälliges Passwort
      const plainPassword = crypto.randomBytes(25).toString('base64').slice(0, 19);
      // Erstelle einen bcrypt-Hash
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      console.log('\n\n\n', 'Admin account created since no user exists yet');
      console.log('  username: ', adminUser);
      console.log('  password: ', plainPassword);
      console.log('  email:    ', adminEmail, '\n\n\n');

      await prisma.user.create({
        data: {
          id: '2',
          username: adminUser,
          email: adminEmail,
          password: passwordHash,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      this.logger.log('Admin user created successfully.');
    } catch (error) {
      Logger.error('Failed to create admin user.', error);
    }
    //await prisma.$disconnect();
  }

  private async migrateLegeacyUsers() {
    const prisma = new PrismaClient();

    const existingUsers = await prisma.user.count()
    if (existingUsers > 2) {
      this.logger.log('Legacy users already migrated. Skipping migration.');
      return;
    }

    if (!process.env.KUBERO_USERS || process.env.KUBERO_USERS === '') {
      this.logger.log('No legacy users to migrate. KUBERO_USERS is not set.');
      return;
    }

    const u = Buffer.from(process.env.KUBERO_USERS, 'base64').toString(
      'utf-8',
    );
    const users = JSON.parse(u);
    
    for (const user of users) {
      let password = user.password;
      if (
        user.insecure &&
        user.insecure === true &&
        process.env.KUBERO_SESSION_KEY
      ) {
        this.logger.warn(
          'User with unencrypted Password detected: "' +
            user.username +
            '" - This feature is deprecated and will be removed in the future',
        );
        password = crypto
          .createHmac('sha256', process.env.KUBERO_SESSION_KEY)
          .update(password)
          .digest('hex');
      }

      const userID = crypto.randomUUID();

      try {
        await prisma.user.create({
          data: {
            id: userID,
            username: user.username,
            email: user.username + '@kubero.dev',
            password: password,
            isActive: true,
          },
        });
        this.logger.log(`Migrated user ${user.username} successfully.`);

      } catch (error) {
        this.logger.error(`Failed to migrate user ${user.username}.`, error);
      }
    };
    
    this.logger.log('Legacy users migrated successfully.');
    //await prisma.$disconnect();
  }
}
