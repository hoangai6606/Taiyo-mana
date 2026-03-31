import { relations } from "drizzle-orm/relations";
import { inspectionRecords, dailyReports, inspectionItems, productivityTracking, debitNotes, debitNoteItems, factories, factoryPrices } from "./schema";

export const dailyReportsRelations = relations(dailyReports, ({one}) => ({
	inspectionRecord: one(inspectionRecords, {
		fields: [dailyReports.recordId],
		references: [inspectionRecords.id]
	}),
}));

export const inspectionRecordsRelations = relations(inspectionRecords, ({many}) => ({
	dailyReports: many(dailyReports),
	inspectionItems: many(inspectionItems),
	productivityTrackings: many(productivityTracking),
}));

export const inspectionItemsRelations = relations(inspectionItems, ({one}) => ({
	inspectionRecord: one(inspectionRecords, {
		fields: [inspectionItems.recordId],
		references: [inspectionRecords.id]
	}),
}));

export const productivityTrackingRelations = relations(productivityTracking, ({one}) => ({
	inspectionRecord: one(inspectionRecords, {
		fields: [productivityTracking.recordId],
		references: [inspectionRecords.id]
	}),
}));

export const debitNoteItemsRelations = relations(debitNoteItems, ({one}) => ({
	debitNote: one(debitNotes, {
		fields: [debitNoteItems.debitNoteId],
		references: [debitNotes.id]
	}),
}));

export const debitNotesRelations = relations(debitNotes, ({many}) => ({
	debitNoteItems: many(debitNoteItems),
}));

export const factoryPricesRelations = relations(factoryPrices, ({one}) => ({
	factory: one(factories, {
		fields: [factoryPrices.factoryId],
		references: [factories.id]
	}),
}));

export const factoriesRelations = relations(factories, ({many}) => ({
	factoryPrices: many(factoryPrices),
}));