import { relations } from 'drizzle-orm';
import {
  profiles, customers, factories, productTypes, productStyles,
  userFactoryPermissions,
} from './schema';

export const profilesRelations = relations(profiles, ({ many }) => ({
  factoryPermissions: many(userFactoryPermissions),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  productStyles: many(productStyles),
}));

export const factoriesRelations = relations(factories, ({ many }) => ({
  productStyles: many(productStyles),
  factoryPermissions: many(userFactoryPermissions),
}));

export const productTypesRelations = relations(productTypes, ({ many }) => ({
  productStyles: many(productStyles),
}));

export const productStylesRelations = relations(productStyles, ({ one }) => ({
  customer: one(customers, { fields: [productStyles.customerId], references: [customers.id] }),
  factory: one(factories, { fields: [productStyles.factoryId], references: [factories.id] }),
  productType: one(productTypes, { fields: [productStyles.productTypeId], references: [productTypes.id] }),
}));

export const userFactoryPermissionsRelations = relations(userFactoryPermissions, ({ one }) => ({
  user: one(profiles, { fields: [userFactoryPermissions.userId], references: [profiles.id] }),
  factory: one(factories, { fields: [userFactoryPermissions.factoryId], references: [factories.id] }),
}));
