ALTER TABLE "parents" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "parents" ALTER COLUMN "pin_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "google_sub" text;--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_google_sub_unique" UNIQUE("google_sub");