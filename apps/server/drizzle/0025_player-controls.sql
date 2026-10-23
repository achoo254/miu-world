ALTER TABLE "child_profiles" ADD COLUMN "voice_chat_allowed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "child_profiles" ADD COLUMN "online_allowed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "child_profiles" ADD COLUMN "voice_safety_seen_at" timestamp with time zone;