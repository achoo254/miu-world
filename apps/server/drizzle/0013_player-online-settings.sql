ALTER TABLE "child_profiles" ADD COLUMN "online_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "child_profiles" ADD COLUMN "bots_enabled" boolean DEFAULT true NOT NULL;