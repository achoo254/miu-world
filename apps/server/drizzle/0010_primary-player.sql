ALTER TABLE "child_profiles" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "child_profiles_one_primary" ON "child_profiles" USING btree ("parent_id") WHERE "child_profiles"."is_primary";--> statement-breakpoint
UPDATE "child_profiles" SET "is_primary" = true WHERE "id" IN (SELECT DISTINCT ON ("parent_id") "id" FROM "child_profiles" ORDER BY "parent_id", "created_at", "id");
